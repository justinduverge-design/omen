package com.slopssaloon.omen.core.session

/**
 * Abstraction over secure, at-rest session storage (M0c §2.2: "iOS Keychain / Android
 * Keystore-backed storage — never plain files, logs, or unencrypted preferences").
 *
 * The interface is pure Kotlin so the session/auth logic is JVM-unit-testable with an
 * in-memory fake. The production Android implementation ([AndroidKeystoreSessionStore])
 * encrypts the payload with an AES/GCM key held in the AndroidKeyStore.
 */
interface SecureSessionStore {
    /** Persist the session, encrypted at rest. Overwrites any existing session. */
    fun save(session: Session)

    /** Return the stored session, or null if none is present or it could not be decrypted. */
    fun load(): Session?

    /** Remove any stored session (sign-out / account deletion). */
    fun clear()
}

/**
 * Deterministic in-memory store for unit tests. NOT for production — provides no at-rest
 * encryption and is intentionally not Android-dependent.
 */
class InMemorySecureSessionStore(private var current: Session? = null) : SecureSessionStore {
    override fun save(session: Session) { current = session }
    override fun load(): Session? = current
    override fun clear() { current = null }
}
