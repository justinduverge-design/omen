package com.slopssaloon.omen.core.session

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Production [SecureSessionStore]. Session tokens are encrypted with an AES-256/GCM key that
 * lives in the AndroidKeyStore (hardware-backed where available) and never leaves it. Only
 * the resulting ciphertext + IV are written to app-private [android.content.SharedPreferences];
 * the plaintext token material is never persisted in the clear (M0c §2.2, §8).
 *
 * No external dependency is used — this relies on the platform KeyStore directly so the
 * scaffolding adds no new supply-chain surface.
 */
class AndroidKeystoreSessionStore(
    context: Context,
    private val prefsName: String = "omen_session",
) : SecureSessionStore {

    private val prefs = context.applicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

    override fun save(session: Session) {
        val plaintext = encode(session).toByteArray(Charsets.UTF_8)
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, secretKey()) }
        val ciphertext = cipher.doFinal(plaintext)
        prefs.edit()
            .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(KEY_PAYLOAD, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .apply()
    }

    override fun load(): Session? {
        val ivB64 = prefs.getString(KEY_IV, null) ?: return null
        val payloadB64 = prefs.getString(KEY_PAYLOAD, null) ?: return null
        return try {
            val iv = Base64.decode(ivB64, Base64.NO_WRAP)
            val ciphertext = Base64.decode(payloadB64, Base64.NO_WRAP)
            val cipher = Cipher.getInstance(TRANSFORMATION).apply {
                init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(GCM_TAG_BITS, iv))
            }
            decode(String(cipher.doFinal(ciphertext), Charsets.UTF_8))
        } catch (_: Exception) {
            // Key rotated, tampering, or corrupt payload — treat as no session rather than crash.
            clear()
            null
        }
    }

    override fun clear() {
        prefs.edit().remove(KEY_IV).remove(KEY_PAYLOAD).apply()
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    // Simple length-prefixed encoding avoids a JSON dependency and never logs token material.
    private fun encode(s: Session): String = buildString {
        append(field(s.userId))
        append(field(s.accessToken))
        append(field(s.refreshToken))
        append(field(s.expiresAtEpochSeconds.toString()))
    }

    private fun decode(raw: String): Session? {
        val parts = mutableListOf<String>()
        var rest = raw
        while (rest.isNotEmpty()) {
            val sep = rest.indexOf(':')
            if (sep <= 0) return null
            val len = rest.substring(0, sep).toIntOrNull() ?: return null
            val start = sep + 1
            if (start + len > rest.length) return null
            parts.add(rest.substring(start, start + len))
            rest = rest.substring(start + len)
        }
        if (parts.size != 4) return null
        val expires = parts[3].toLongOrNull() ?: return null
        return Session(parts[0], parts[1], parts[2], expires)
    }

    private fun field(value: String): String = "${value.length}:$value"

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "omen_session_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val GCM_TAG_BITS = 128
        const val KEY_IV = "iv"
        const val KEY_PAYLOAD = "payload"
    }
}
