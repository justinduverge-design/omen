package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefAlternative
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenMetricDelta
import com.slopssaloon.omen.core.designsystem.component.OmenMetricItem
import com.slopssaloon.omen.core.designsystem.component.OmenPosition
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalItem
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import org.json.JSONObject

/**
 * M5-Native-API-Client slice D — `POST /api/omen/mvp-move` → `2026-05-18.omen-live.v1`.
 *
 * The Swift twin is `OmenDecision.swift`; the two must map the same states the same way.
 * Uses `org.json`, matching slices A–C — no new dependency and no build-config change.
 *
 * Everything below the state is nullable because the envelope genuinely varies by state: a
 * `platform_disconnected` body carries `recovery` and no `recommendation`, `empty` carries
 * `explanation` but no `recommendation`, and only `success` carries all of it. Treating any
 * of them as required would turn an honest backend answer into a decode failure and tell
 * the user the app is broken when the truth is "connect a league".
 */
data class OmenDecisionEnvelope(
    val state: String,
    val mode: String? = null,
    val recommendation: Recommendation? = null,
    val recoveryMessage: String? = null,
    val explanationSummary: String? = null,
    val signals: List<Signal> = emptyList(),
) {
    data class Signal(
        val key: String,
        val status: String?,
        val source: String?,
        val message: String?,
    )

    data class Recommendation(
        val title: String?,
        val move: String?,
        val confidenceScore: Int?,
        val riskLevel: String?,
        val riskReasons: List<String>,
        val explanationLines: List<String>,
        val deltaPoints: Double?,
        val deltaLabel: String?,
        val comparisonName: String?,
        val comparisonPosition: String?,
        val comparisonTeam: String?,
    )

    companion object {
        fun parse(body: String): OmenDecisionEnvelope? {
            val root = runCatching { JSONObject(body) }.getOrNull() ?: return null
            val state = root.optString("state").takeIf { it.isNotBlank() } ?: return null

            return OmenDecisionEnvelope(
                state = state,
                mode = root.optStringOrNull("mode"),
                recommendation = root.optJSONObject("recommendation")?.let(::parseRecommendation),
                recoveryMessage = root.optJSONObject("recovery")?.optStringOrNull("message"),
                explanationSummary = root.optJSONObject("explanation")?.optStringOrNull("summary"),
                signals = parseSignals(root.optJSONObject("signals")),
            )
        }

        private fun parseSignals(json: JSONObject?): List<Signal> {
            if (json == null) return emptyList()
            return json.keys().asSequence().toList().sorted().mapNotNull { key ->
                val signal = json.optJSONObject(key) ?: return@mapNotNull null
                Signal(
                    key = key,
                    status = signal.optStringOrNull("status"),
                    source = signal.optStringOrNull("source"),
                    message = signal.optStringOrNull("message"),
                )
            }
        }

        private fun parseRecommendation(json: JSONObject): Recommendation {
            // The recommendation carries its own explanation and confidence in the live
            // envelope; the top-level copies are the `empty`-state fallbacks.
            val explanation = json.optJSONObject("explanation")
            val delta = json.optJSONObject("expected_value_delta")
            val comparison = json.optJSONObject("comparison_player")
            val risk = json.optJSONObject("risk")

            return Recommendation(
                title = json.optStringOrNull("title"),
                move = json.optStringOrNull("move"),
                confidenceScore = json.optJSONObject("confidence")?.optIntOrNull("score"),
                riskLevel = risk?.optStringOrNull("level"),
                riskReasons = risk?.optJSONArray("reasons").toStringList(),
                explanationLines = listOfNotNull(
                    explanation?.optStringOrNull("summary"),
                    explanation?.optStringOrNull("why_it_matters"),
                    explanation?.optStringOrNull("risk"),
                ),
                deltaPoints = delta?.optDoubleOrNull("points"),
                deltaLabel = delta?.optStringOrNull("label"),
                comparisonName = comparison?.optStringOrNull("name"),
                comparisonPosition = comparison?.optStringOrNull("position"),
                comparisonTeam = comparison?.optStringOrNull("team"),
            )
        }

        private const val UNREADABLE =
            "Omen sent something this version of the app couldn't read. Updating the app may fix it."
        private const val UNVERIFIED_MODE =
            "Omen could not verify whether this recommendation is live. Refresh or update before acting."

        private fun JSONObject.optStringOrNull(key: String): String? =
            if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }

        private fun JSONObject.optIntOrNull(key: String): Int? = if (isNull(key)) null else optInt(key)

        private fun JSONObject.optDoubleOrNull(key: String): Double? =
            if (isNull(key)) null else optDouble(key).takeIf { !it.isNaN() }

        private fun org.json.JSONArray?.toStringList(): List<String> {
            if (this == null) return emptyList()
            return (0 until length()).mapNotNull { optString(it).takeIf { s -> s.isNotBlank() } }
        }
    }

    /**
     * Maps the live envelope onto the shipped [OmenDecisionBriefState].
     *
     * State names come from `omen-native-backend-state-contract-v1.md` §F2 and
     * `src/services/omen.js`. Anything unrecognised is treated as a recoverable error rather
     * than force-fitted into success — a state this build has never heard of is precisely
     * where guessing would put invented confidence in front of a real user.
     */
    fun briefState(
        onRetry: (() -> Unit)? = null,
        onConnect: (() -> Unit)? = null,
    ): OmenDecisionBriefState = when (state) {
        "success" ->
            // A success that carries nothing renderable is a contract violation. An empty
            // card would look like a broken layout, so surface an honest error instead.
            successPayload()?.let { payload ->
                when (mode) {
                    "live" -> OmenDecisionBriefState.Success(payload)
                    "mock" -> OmenDecisionBriefState.Mock(payload)
                    "demo" -> OmenDecisionBriefState.Demo(payload)
                    else -> OmenDecisionBriefState.Error(UNVERIFIED_MODE, onRetry)
                }
            } ?: OmenDecisionBriefState.Error(UNREADABLE, onRetry)

        "empty" -> OmenDecisionBriefState.Empty(
            explanationSummary ?: "No move clears the recommendation threshold this week.",
        )

        "off_season" -> OmenDecisionBriefState.OffSeason

        "platform_disconnected" -> OmenDecisionBriefState.Disconnected(onConnect)

        // `pending_live_engine`, `context_unavailable`, `yahoo_reauth_required`,
        // `sleeper_league_context_missing`, `espn_reauth_required`,
        // `espn_league_context_missing`, `espn_import_blocked`, `error`, and anything added
        // later. The server already writes a user-safe sentence for these; rewriting it
        // here would be a second, drifting copy of the same truth.
        else -> OmenDecisionBriefState.Error(recoveryMessage ?: UNREADABLE, onRetry)
    }

    private fun successPayload(): OmenDecisionBriefPayload? {
        val rec = recommendation ?: return null
        val verdict = rec.title ?: return null
        val move = rec.move ?: return null

        return OmenDecisionBriefPayload(
            verdict = verdict,
            move = move,
            impact = impactText(rec),
            confidence = rec.confidenceScore ?: 0,
            risk = riskLevel(rec.riskLevel),
            riskReasons = rec.riskReasons,
            explanation = rec.explanationLines,
            metrics = metrics(rec),
            signals = signals.map { signal ->
                OmenSignalItem(
                    label = signalLabel(signal.key),
                    source = signalSource(signal.status),
                    detail = signal.message ?: signal.source,
                )
            },
            alternatives = alternatives(rec),
        )
    }

    private fun signalSource(status: String?): OmenSignalSource = when (status) {
        "live" -> OmenSignalSource.Live
        "stub" -> OmenSignalSource.Stub
        "mock", "demo" -> OmenSignalSource.Mock
        else -> OmenSignalSource.Unavailable
    }

    private fun signalLabel(key: String): String = key.split('_').joinToString(" ") { word ->
        word.replaceFirstChar { it.uppercase() }
    }

    private fun impactText(rec: Recommendation): String? {
        val points = rec.deltaPoints ?: return null
        val formatted = String.format("%+.1f projected", points)
        return rec.deltaLabel?.let { "$formatted ($it)" } ?: formatted
    }

    private fun riskLevel(raw: String?): OmenRiskLevel = when (raw) {
        "low" -> OmenRiskLevel.Low
        "high" -> OmenRiskLevel.High
        // `medium` and anything unrecognised. Defaulting an unknown risk to medium rather
        // than low keeps an unfamiliar value from reading as safer than it is.
        else -> OmenRiskLevel.Medium
    }

    private fun metrics(rec: Recommendation): List<OmenMetricItem> {
        val points = rec.deltaPoints ?: return emptyList()
        return listOf(
            OmenMetricItem(
                label = "Expected value",
                value = String.format("%.1f", points),
                delta = String.format("%+.1f", points),
                deltaDirection = if (points >= 0) OmenMetricDelta.Positive else OmenMetricDelta.Negative,
            ),
        )
    }

    private fun alternatives(rec: Recommendation): List<OmenDecisionBriefAlternative> {
        // The comparison player is the person being moved off — the only alternative the
        // live envelope actually names. Inventing more would be fabrication.
        val name = rec.comparisonName ?: return emptyList()
        // `OmenPosition` has no "unknown" case, and choosing one to satisfy the type would
        // put a fabricated position chip beside a real player's name. Dropping the row is
        // the honest failure; the verdict and move still render.
        val position = position(rec.comparisonPosition) ?: return emptyList()
        return listOf(OmenDecisionBriefAlternative(name, position, rec.comparisonTeam, null))
    }

    private fun position(code: String?): OmenPosition? = when (code?.uppercase()) {
        "RB" -> OmenPosition.RB
        "WR" -> OmenPosition.WR
        "QB" -> OmenPosition.QB
        "TE" -> OmenPosition.TE
        "DEF", "DST", "D/ST" -> OmenPosition.DEF
        "K" -> OmenPosition.K
        else -> null
    }
}
