package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * O7 — forced-update gate state. iOS mirror: `App/UpdateGateViewModel.swift`.
 */
sealed interface UpdateGateState {
    /**
     * Covers "not yet checked", "check succeeded and we're supported", and "check failed".
     * A failed check must never block, so it collapses into the same pass-through state.
     */
    data object Passed : UpdateGateState
    data class Blocked(val minimumVersion: String) : UpdateGateState
}

class UpdateGateViewModel(
    private val client: MinVersionGateChecking,
    private val currentVersion: String,
) {
    var state: UpdateGateState by mutableStateOf(UpdateGateState.Passed)
        private set

    suspend fun check() {
        state = when (val result = client.check(platform = "android", currentVersion = currentVersion)) {
            is MinVersionGateResult.UpdateRequired -> UpdateGateState.Blocked(result.minimumVersion)
            MinVersionGateResult.Ok, MinVersionGateResult.Unavailable -> UpdateGateState.Passed
        }
    }
}
