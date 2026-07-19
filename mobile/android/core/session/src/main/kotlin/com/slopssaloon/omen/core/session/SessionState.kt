package com.slopssaloon.omen.core.session

sealed interface SessionState {
    data object Loading : SessionState
    data object SignedOut : SessionState
    data class SignedIn(val userId: String) : SessionState
}
