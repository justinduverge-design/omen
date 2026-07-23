package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Registry §2.3 position families. The uppercase abbreviation is what renders on both
 * PlayerRow and PlayerChip so meaning survives grayscale (color is never alone —
 * registry §1, §4). Colorblind-validated tokens live behind these cases.
 */
enum class OmenPosition { RB, WR, QB, TE, DEF, K }

private fun OmenPosition.chipTone(): OmenChipTone = when (this) {
    OmenPosition.RB -> OmenChipTone.Rb
    OmenPosition.WR -> OmenChipTone.Wr
    OmenPosition.QB -> OmenChipTone.Qb
    OmenPosition.TE -> OmenChipTone.Te
    OmenPosition.DEF -> OmenChipTone.Def
    OmenPosition.K -> OmenChipTone.K
}

private fun OmenPosition.label(): String = when (this) {
    OmenPosition.RB -> "RB"
    OmenPosition.WR -> "WR"
    OmenPosition.QB -> "QB"
    OmenPosition.TE -> "TE"
    OmenPosition.DEF -> "DEF"
    OmenPosition.K -> "K"
}

/**
 * Registry §3.2 PlayerRow. Player identity for lists — name + position chip + optional
 * team/meta subline. Composes the approved ListRow shell so tap targets, dividers, and
 * typography stay uniform. `onClick == null` renders display-only.
 *
 * The position chip is the primary redundant text carrier: even in grayscale the
 * uppercase RB/WR/QB/TE/DEF/K label reads clearly.
 */
@Composable
fun OmenPlayerRow(
    name: String,
    position: OmenPosition,
    modifier: Modifier = Modifier,
    team: String? = null,
    meta: String? = null,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
) {
    val subtitle = listOfNotNull(team, meta).takeIf { it.isNotEmpty() }?.joinToString(" · ")
    OmenListRow(
        title = name,
        subtitle = subtitle,
        modifier = modifier,
        enabled = enabled,
        onClick = onClick,
        leadingContent = { OmenChip(label = position.label(), tone = position.chipTone()) },
    )
}

/**
 * Registry §3.2 PlayerChip. Compact single-chip player identity for inline lists
 * (matchup slates, comparison rows). Position color is redundant with the visible name;
 * the position abbreviation is folded into the label so a grayscale reader still gets
 * position and name in one tap-target.
 */
@Composable
fun OmenPlayerChip(
    name: String,
    position: OmenPosition,
    modifier: Modifier = Modifier,
) {
    OmenChip(
        label = "${position.label()} · $name",
        tone = position.chipTone(),
        modifier = modifier,
    )
}
