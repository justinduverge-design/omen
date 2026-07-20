package com.slopssaloon.omen.app.auth

import com.slopssaloon.omen.core.auth.AccountDeletion
import com.slopssaloon.omen.core.auth.AccountDeletionOutcome
import com.slopssaloon.omen.core.auth.AccountRepository
import com.slopssaloon.omen.core.auth.RetryableCode
import com.slopssaloon.omen.core.auth.mapDeleteStatus
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
 * Live in-app account deletion against the Omen API `DELETE /api/user/delete` (M0c §2.3).
 * Authenticated with the Omen session access token; sends the confirmation phrase the backend
 * strictly checks. Only the numeric status shapes the outcome — no server body is surfaced.
 */
class OkHttpAccountRepository(
    apiBaseUrl: String,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build(),
) : AccountRepository {

    private val jsonMedia = "application/json".toMediaType()
    private val base = apiBaseUrl.trimEnd('/')

    override suspend fun deleteAccount(accessToken: String, confirmation: String): AccountDeletionOutcome {
        // Client-side guard first so an unconfirmed request never leaves the device.
        if (!AccountDeletion.isConfirmed(confirmation)) return AccountDeletionOutcome.InvalidConfirmation

        return withContext(Dispatchers.IO) {
            val body = JSONObject().put("confirmation", confirmation).toString().toRequestBody(jsonMedia)
            val request = Request.Builder()
                .url("$base/api/user/delete")
                .addHeader("Authorization", "Bearer $accessToken")
                .delete(body)
                .build()
            try {
                client.newCall(request).execute().use { response -> mapDeleteStatus(response.code) }
            } catch (_: IOException) {
                AccountDeletionOutcome.RetryableError(RetryableCode.NETWORK)
            }
        }
    }
}
