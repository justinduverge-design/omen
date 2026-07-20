package com.slopssaloon.omen.core.session

/**
 * Persistent Omen account session state (M0c §2.2).
 *
 * This models only the *session*, not the transient sign-in flow — per M0c the app
 * "renders locally and restores the Omen session before any league work begins," and a
 * provider-sync failure must never change this state. Transient sign-in UI lives in
 * `com.slopssaloon.omen.core.auth.AuthFlowState`.
 */
sealed interface SessionState {
    /** Initial state while secure storage is being read on launch. */
    data object Loading : SessionState

    /** No restorable session. The Welcome / auth surface is shown. */
    data object SignedOut : SessionState

    /** A valid Omen session is present. */
    data class SignedIn(val userId: String) : SessionState

    /**
     * A session existed but its refresh failed (M0c §2.2). Surfaced as a re-auth prompt,
     * never a crash or an infinite spinner. Distinct from [SignedOut] so the UI can explain
     * "you were signed in; please sign in again" rather than treating it as a first run.
     */
    data object NeedsReauth : SessionState
}
