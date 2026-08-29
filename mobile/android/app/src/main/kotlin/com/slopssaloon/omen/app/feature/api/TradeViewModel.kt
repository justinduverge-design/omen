package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.session.SessionManager

/**
 * M5 slice G — drives the Trade destination from `trade-compare.v2`.
 * iOS mirror: `App/Api/TradeViewModel.swift`.
 */
class TradeViewModel(
    private val repository: TradeRepository,
    private val sessionManager: SessionManager,
    private val accessTokenProvider: () -> String?,
) {
    sealed interface ViewState {
        /**
         * Nothing asked yet. Distinct from [Loading] and from an empty result: the screen must
         * not show a verdict surface before the user has offered anything.
         */
        data object Idle : ViewState
        data object Loading : ViewState
        data class Loaded(val result: TradeCompare) : ViewState
        data class Failed(val error: OmenApiError) : ViewState
        data object Demo : ViewState
    }

    enum class Side { Send, Receive }

    var viewState: ViewState by mutableStateOf(ViewState.Idle)
        private set

    var offer: TradeOffer by mutableStateOf(TradeOffer())
        private set

    fun add(name: String, side: Side) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        offer = when (side) {
            Side.Send -> offer.copy(send = offer.send + trimmed)
            Side.Receive -> offer.copy(receive = offer.receive + trimmed)
        }
        // Any edit invalidates the standing verdict. Leaving it on screen beside a changed
        // offer would show an answer to a question the user is no longer asking.
        viewState = ViewState.Idle
    }

    fun remove(index: Int, side: Side) {
        offer = when (side) {
            Side.Send -> if (index in offer.send.indices) {
                offer.copy(send = offer.send.filterIndexed { i, _ -> i != index })
            } else {
                return
            }
            Side.Receive -> if (index in offer.receive.indices) {
                offer.copy(receive = offer.receive.filterIndexed { i, _ -> i != index })
            } else {
                return
            }
        }
        viewState = ViewState.Idle
    }

    /**
     * The league to personalize against, when the caller has one. Set by the shell from the
     * same `league-overview.v1` read the League destination uses — never guessed here.
     */
    fun useLeague(platform: String?, leagueId: String?) {
        offer = if (platform.isNullOrEmpty() || leagueId.isNullOrEmpty()) {
            offer.copy(leagueContext = null)
        } else {
            offer.copy(leagueContext = TradeOffer.LeagueContext(platform, leagueId))
        }
    }

    suspend fun compare(userId: String) {
        if (userId == SessionManager.DEMO_USER_ID) {
            viewState = ViewState.Demo
            return
        }
        if (!offer.isComparable) {
            viewState = ViewState.Idle
            return
        }

        // `/compare` degrades an unauthenticated caller to a 200 neutral answer rather than a
        // 401, so a missing token is not a failure here — it just means no personalization.
        val accessToken = accessTokenProvider()

        viewState = ViewState.Loading
        viewState = when (val result = repository.compare(offer, accessToken)) {
            is OmenApiResult.Success -> ViewState.Loaded(result.value)
            is OmenApiResult.Failure -> {
                if (result.error is OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                ViewState.Failed(result.error)
            }
        }
    }

    companion object {
        fun messageFor(error: OmenApiError): String = when (error) {
            is OmenApiError.Network ->
                "Omen couldn't reach the server. Check your connection and try again."
            is OmenApiError.Unauthorized ->
                "Your session expired. Sign in again to compare with your league's settings."
            is OmenApiError.Server -> "Omen is having trouble on our side. Try again in a moment."
            is OmenApiError.Decode -> "Omen sent something this version of the app couldn't read."
        }
    }
}
