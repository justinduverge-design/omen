package com.slopssaloon.omen.core.session

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Exercises the real Keystore-backed [AndroidKeystoreSessionStore] on-device (S5 — mobile token
 * storage review). [SessionManagerTest] already covers [SessionManager] against the
 * [InMemorySecureSessionStore] fake; this is the missing piece — proof the *production* store
 * actually round-trips through AndroidKeyStore-backed AES/GCM, and that no token ever lands in
 * plaintext in the underlying [android.content.SharedPreferences] file.
 *
 * Lives in `androidTest`, not `core/session`'s existing JVM `src/test`, because `AndroidKeyStore`
 * has no plain-JVM provider — it requires a real Android runtime.
 */
@RunWith(AndroidJUnit4::class)
class AndroidKeystoreSessionStoreTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val prefsName = "omen_session_test_${System.nanoTime()}"

    private fun store() = AndroidKeystoreSessionStore(context, prefsName = prefsName)

    @After
    fun tearDown() {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE).edit().clear().apply()
    }

    @Test
    fun loadReturnsNullWhenNothingSaved() {
        assertNull(store().load())
    }

    @Test
    fun saveAndLoadRoundTrips() {
        val session = Session("u1", "access-token-abc", "refresh-token-xyz", 2_000L)

        store().save(session)

        assertEquals(session, store().load())
    }

    @Test
    fun saveOverwritesPreviousSession() {
        store().save(Session("old", "a1", "r1", 1_000L))

        store().save(Session("new", "a2", "r2", 2_000L))

        assertEquals("new", store().load()?.userId)
    }

    @Test
    fun clearRemovesSession() {
        val s = store()
        s.save(Session("u1", "a", "r", 2_000L))

        s.clear()

        assertNull(s.load())
    }

    /**
     * The regression guard S5 exists to establish: the raw [android.content.SharedPreferences]
     * file backing this store must never contain a saved token in the clear — only opaque
     * AES/GCM ciphertext, which is the whole point of encrypting before the value ever reaches
     * `SharedPreferences`.
     */
    @Test
    fun savedTokensNeverAppearInPlaintextInSharedPreferences() {
        val accessToken = "access-token-${System.nanoTime()}"
        val refreshToken = "refresh-token-${System.nanoTime()}"
        store().save(Session("u1", accessToken, refreshToken, 2_000L))

        val rawDump = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE).all.toString()

        assertFalse(rawDump.contains(accessToken))
        assertFalse(rawDump.contains(refreshToken))
    }
}
