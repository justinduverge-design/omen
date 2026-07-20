package com.slopssaloon.omen.app.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.slopssaloon.omen.core.auth.GoogleIdTokenProvider
import com.slopssaloon.omen.core.auth.GoogleIdTokenResult
import java.security.MessageDigest

/**
 * Real Google ID-token provider via Android Credential Manager (M0c §2.1) — no browser, no
 * legacy Google Sign-In SDK, no WebView. [webClientId] is the Supabase-registered Web client ID
 * (server client ID); the raw nonce is SHA-256 hashed for Google and returned unhashed so the
 * caller can pass it to Supabase for verification.
 */
class CredentialManagerGoogleIdTokenProvider(
    private val activityContext: Context,
    private val webClientId: String,
) : GoogleIdTokenProvider {

    override val isConfigured: Boolean = webClientId.isNotBlank()

    override suspend fun getIdToken(rawNonce: String): GoogleIdTokenResult {
        if (!isConfigured) return GoogleIdTokenResult.Unavailable

        val option = GetGoogleIdOption.Builder()
            .setServerClientId(webClientId)
            .setFilterByAuthorizedAccounts(false)
            .setNonce(sha256(rawNonce))
            .build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

        return try {
            val result = CredentialManager.create(activityContext).getCredential(activityContext, request)
            val credential = result.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val google = GoogleIdTokenCredential.createFrom(credential.data)
                GoogleIdTokenResult.Token(idToken = google.idToken, rawNonce = rawNonce)
            } else {
                GoogleIdTokenResult.Failed
            }
        } catch (_: GetCredentialCancellationException) {
            GoogleIdTokenResult.Canceled
        } catch (_: NoCredentialException) {
            GoogleIdTokenResult.Unavailable
        } catch (_: GetCredentialException) {
            GoogleIdTokenResult.Failed
        }
    }

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }
}
