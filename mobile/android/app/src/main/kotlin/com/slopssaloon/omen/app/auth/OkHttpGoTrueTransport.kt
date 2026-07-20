package com.slopssaloon.omen.app.auth

import com.slopssaloon.omen.core.auth.GoTrueTransport
import com.slopssaloon.omen.core.auth.TransportResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Live Supabase GoTrue transport over HTTPS (M0c §2, §7). Uses OkHttp + org.json directly —
 * no Supabase SDK — keeping the dependency surface small and the request shape auditable.
 *
 * Only the numeric HTTP status and the session fields ever leave this class; raw error bodies,
 * identifiers, and provider text stay here (M0c §8). Every call has a bounded timeout so a stuck
 * request becomes a retryable state, never a permanent spinner (M0a §7).
 */
class OkHttpGoTrueTransport(
    private val supabaseUrl: String,
    private val anonKey: String,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build(),
) : GoTrueTransport {

    private val jsonMedia = "application/json".toMediaType()
    private val base = supabaseUrl.trimEnd('/')

    override suspend fun requestEmailOtp(email: String): TransportResult =
        post("$base/auth/v1/otp", JSONObject().put("email", email).put("create_user", true), expectSession = false)

    override suspend fun verifyEmailOtp(email: String, code: String): TransportResult =
        post(
            "$base/auth/v1/verify",
            JSONObject().put("type", "email").put("email", email).put("token", code),
            expectSession = true,
        )

    override suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String): TransportResult =
        post(
            "$base/auth/v1/token?grant_type=id_token",
            JSONObject().put("provider", "google").put("id_token", idToken).put("nonce", rawNonce),
            expectSession = true,
        )

    override suspend fun refresh(refreshToken: String): TransportResult =
        post(
            "$base/auth/v1/token?grant_type=refresh_token",
            JSONObject().put("refresh_token", refreshToken),
            expectSession = true,
        )

    private suspend fun post(url: String, body: JSONObject, expectSession: Boolean): TransportResult =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .post(body.toString().toRequestBody(jsonMedia))
                .build()
            try {
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@withContext TransportResult.HttpError(response.code)
                    if (!expectSession) return@withContext TransportResult.Ok
                    parseSession(response.body?.string())
                }
            } catch (_: IOException) {
                TransportResult.NetworkError
            }
        }

    private fun parseSession(raw: String?): TransportResult {
        if (raw.isNullOrBlank()) return TransportResult.Malformed
        return try {
            val json = JSONObject(raw)
            val access = json.optString("access_token").takeIf { it.isNotBlank() }
                ?: return TransportResult.Malformed
            val refresh = json.optString("refresh_token").takeIf { it.isNotBlank() }
                ?: return TransportResult.Malformed
            val expiresIn = json.optLong("expires_in", 3600L)
            val userId = json.optJSONObject("user")?.optString("id")?.takeIf { it.isNotBlank() }
                ?: return TransportResult.Malformed
            TransportResult.SessionTokens(userId, access, refresh, expiresIn)
        } catch (_: Exception) {
            TransportResult.Malformed
        }
    }
}
