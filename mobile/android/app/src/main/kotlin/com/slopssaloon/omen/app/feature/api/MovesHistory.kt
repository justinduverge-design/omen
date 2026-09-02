package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerEntry
import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerPreviewState
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * M5-Native-API-Client slice E — `GET /api/moves` → `moves-history.v1`.
 * iOS mirror: `App/Api/MovesHistory.swift`.
 *
 * Replaces the Ledger preview fixture. The approved composition (Figma node `72:2`) is
 * unchanged: this is wiring only.
 *
 * Every row field except `id` is nullable because `normalizeMove()` in `src/routes/moves.js`
 * emits `null` for each of them individually — `recommendation` is `headline || reasoning ||
 * null`, and `followed` / `stars` / `effectiveness_pct` / `created_at` stay null until the user
 * or the scorer fills them. Treating those as required would turn an ordinary half-filled row
 * into a decode failure, telling the user their Ledger is unreadable when the truth is that the
 * move has not been graded yet.
 */
data class MovesHistory(
    val contractVersion: String?,
    val season: Int?,
    val summary: Summary?,
    val moves: List<Move>,
) {
    data class Summary(
        val wins: Int?,
        val losses: Int?,
        val pending: Int?,
        val avgEffectivenessPct: Int?,
        val followedCount: Int?,
        val totalCount: Int?,
    )

    data class Move(
        /**
         * `moves.id` is a Supabase primary key — `bigint` today. Held as the string it will be
         * rendered with, parsed from either a JSON number or a JSON string so a future column
         * type change cannot silently blank a user's Ledger. This is the one field with no
         * honest fallback: a row with no stable identity is dropped rather than given an
         * invented id that would change on every refresh.
         */
        val id: String,
        val season: Int?,
        val week: Int?,
        val moveType: String?,
        val recommendation: String?,
        val followed: Boolean?,
        val stars: Int?,
        val outcome: String?,
        val effectivenessPct: Double?,
        val createdAt: String?,
    )

    /**
     * Maps `moves-history.v1` onto the shipped [OmenLedgerPreviewState].
     *
     * An empty list is a real answer, not a failure: a signed-in user with a connected league
     * and no recorded moves genuinely has an empty Ledger. Rows that cannot be rendered
     * honestly are dropped individually, so one malformed row never blanks the section.
     */
    val ledgerState: OmenLedgerPreviewState
        get() = moves.mapNotNull(::entryFrom).let { entries ->
            if (entries.isEmpty()) OmenLedgerPreviewState.Empty else OmenLedgerPreviewState.Entries(entries)
        }

    companion object {
        fun parse(json: String): MovesHistory? = runCatching {
            val root = JSONObject(json)
            val rows = root.optJSONArray("moves")
            val moves = buildList {
                for (i in 0 until (rows?.length() ?: 0)) {
                    val row = rows?.optJSONObject(i) ?: continue
                    val id = row.opt("id")?.takeIf { it != JSONObject.NULL }?.toString()?.takeIf { it.isNotEmpty() }
                        ?: continue
                    add(
                        Move(
                            id = id,
                            season = row.optIntOrNull("season"),
                            week = row.optIntOrNull("week"),
                            moveType = row.optStringOrNull("move_type"),
                            recommendation = row.optStringOrNull("recommendation"),
                            followed = row.optBooleanOrNull("followed"),
                            stars = row.optIntOrNull("stars"),
                            outcome = row.optStringOrNull("outcome"),
                            effectivenessPct = row.optDoubleOrNull("effectiveness_pct"),
                            createdAt = row.optStringOrNull("created_at"),
                        ),
                    )
                }
            }

            MovesHistory(
                contractVersion = root.optStringOrNull("contract_version"),
                season = root.optIntOrNull("season"),
                summary = root.optJSONObject("summary")?.let { block ->
                    Summary(
                        wins = block.optIntOrNull("wins"),
                        losses = block.optIntOrNull("losses"),
                        pending = block.optIntOrNull("pending"),
                        avgEffectivenessPct = block.optIntOrNull("avg_effectiveness_pct"),
                        followedCount = block.optIntOrNull("followed_count"),
                        totalCount = block.optIntOrNull("total_count"),
                    )
                },
                moves = moves,
            )
        }.getOrNull()

        fun entryFrom(move: Move): OmenLedgerEntry? {
            // The recommendation IS the row. `recommendationFrom()` already falls back from
            // `headline` to `reasoning`, so null means the row has no sentence at all — and a
            // Ledger line reading only "WEEK 6 · WAIVER" looks like a rendering bug.
            val recommendation = move.recommendation?.trim()?.takeIf { it.isNotEmpty() } ?: return null

            return OmenLedgerEntry(
                id = move.id,
                period = periodFor(move),
                callType = callTypeFor(move),
                summary = recommendation,
                outcome = outcomeTextFor(move),
            )
        }

        private fun periodFor(move: Move): String = when {
            move.week != null -> "WEEK ${move.week}"
            // Week is not nullable in the table, but the contract types it as optional and a
            // season alone is still a true, useful period label.
            move.season != null -> "${move.season} SEASON"
            else -> "RECORDED"
        }

        private fun callTypeFor(move: Move): String =
            move.moveType?.trim()?.takeIf { it.isNotEmpty() }?.uppercase()
                // Deliberately generic. Naming an unlabelled row "START/SIT" or "WAIVER" would
                // assert a kind of advice Omen never recorded.
                ?: "MOVE"

        /**
         * The outcome line. Built only from what the row carries, and never converting silence
         * into a claim. `buildSummary()` only counts effectiveness for followed, decided moves,
         * so this mirrors that rule rather than pairing a score with a move the user never made.
         */
        fun outcomeTextFor(move: Move): String {
            val outcome = move.outcome?.trim()?.lowercase()
            val parts = mutableListOf<String>()

            when (outcome) {
                "win" -> parts += "Outcome: win"
                "loss" -> parts += "Outcome: loss"
                "pending", null, "" -> parts += "Outcome pending"
                // An unrecognised outcome is shown verbatim rather than bucketed into
                // "pending", which would hide a real backend change.
                else -> parts += "Outcome: ${move.outcome}"
            }

            when (move.followed) {
                true -> parts += "followed"
                false -> parts += "not followed"
                null -> Unit // No feedback recorded. Silence is not "ignored".
            }

            if ((outcome == "win" || outcome == "loss") && move.followed == true && move.effectivenessPct != null) {
                parts += "${move.effectivenessPct.roundToInt()}% effective"
            }

            return parts.joinToString(" · ")
        }
    }
}

/**
 * `org.json` returns coerced defaults (`0`, `""`, `false`) for absent or null keys, which is
 * exactly how a missing grade becomes a fabricated one. These read null as null.
 */

private fun JSONObject.optIntOrNull(key: String): Int? = if (has(key) && !isNull(key)) optInt(key) else null

private fun JSONObject.optDoubleOrNull(key: String): Double? =
    if (has(key) && !isNull(key)) optDouble(key).takeIf { !it.isNaN() } else null

private fun JSONObject.optBooleanOrNull(key: String): Boolean? =
    if (has(key) && !isNull(key)) optBoolean(key) else null
