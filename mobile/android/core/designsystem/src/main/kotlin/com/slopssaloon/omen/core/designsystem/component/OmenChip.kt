package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Registry §3.1 Chip tones: position, platform brand, and explicitly labeled demo mode. */
/**
 * [Omen] is the brand tone, added 2026-09-03 and corrected 2026-09-04.
 *
 * It exists for the chips that are Omen's own rather than a provider's or a position's:
 * **All**, **+ Add League**, and the **Waiver / Ledger / Pulse** tabs. Borrowing a platform tone
 * for those reads as a fourth provider — an "All" chip tinted Sleeper-blue is actively
 * misleading — so they needed a tone of their own.
 *
 * It shipped for one build as `Neutral`, drawn from `textSecondary`, and that was wrong: on a
 * device it rendered five grey chips beside a red ESPN and a blue Sleeper, so the controls that
 * belong to Omen looked like the disabled ones. Founder, seeing it: "you didn't put the buttons
 * into theme." Grey is not a neutral choice on this screen, it is an absent one. Drawing from
 * `accent` puts Omen's own brass on Omen's own controls.
 *
 * Provider chips keep their platform colours, deliberately — that is how a user finds their
 * ESPN team in a row of six. iOS mirror: `OmenChipTone.omen`.
 *
 * `Verdigris` was split out of `Omen` on 2026-09-06. Both are Omen's own tones, but they are not
 * one tone: `Omen` is brass and marks the controls that *filter* or *select* (All, the
 * Waiver / Ledger / Pulse tabs), and `Verdigris` is green and marks **+ Add League**, the one chip
 * in that row that changes what you have rather than what you are looking at.
 *
 * That distinction was already written into `OmenLeagueCarousel` in prose — Add League was moved
 * out of the filter row precisely because the provider chips are a filter and this is an action —
 * but both still rendered brass, so the row said in colour what the layout had just stopped
 * saying. iOS mirror: `OmenChipTone.verdigris`.
 */
enum class OmenChipTone { Rb, Wr, Qb, Te, Def, K, Sleeper, Yahoo, Espn, Demo, Omen, Verdigris }

@Composable
fun OmenChip(
    label: String,
    tone: OmenChipTone,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
) {
    val colors = OmenTheme.color
    val foreground = when (tone) {
        OmenChipTone.Rb -> colors.data.posRb
        OmenChipTone.Wr -> colors.data.posWr
        OmenChipTone.Qb -> colors.data.posQb
        OmenChipTone.Te -> colors.data.posTe
        OmenChipTone.Def -> colors.data.posDef
        OmenChipTone.K -> colors.data.posK
        // The `-chip` family, not the raw brand hex. These tones draw their label in
        // `foreground`, and the raw brand values were never meant to be read as text on a dark
        // ground: Yahoo `#410093` measured **1.33:1** on `surface1` and ESPN `#C81E2C` 3.47:1.
        // Yahoo was, in practice, an invisible filter control that shipped.
        //
        // The brand hexes are unchanged and still exactly what `Blueprints/handoffs/
        // 2026-06-30-phase1-7-platform-brand-colors-handoff.md` sourced. They move to the chip
        // FILL below, where white text sits on them at 12.76:1 (Yahoo), 6.88:1 (ESPN) and
        // 5.30:1 (Sleeper) — the job the `-chip` overrides were tuned for in the first place.
        OmenChipTone.Sleeper -> colors.data.platformSleeperChip
        OmenChipTone.Yahoo -> colors.data.platformYahooChip
        OmenChipTone.Espn -> colors.data.platformEspnChip
        OmenChipTone.Demo -> colors.data.demoText
        OmenChipTone.Omen -> colors.accent
        // `omenChip`, not `omen`: the base verdigris is 3.96:1 on `bg` and chip type is 11sp.
        OmenChipTone.Verdigris -> colors.omenChip
    }
    /**
     * Platform tones render FILLED with a white label; every other tone keeps the tinted
     * outline it has always had.
     *
     * The tinted treatment works by drawing the tone colour as text over a 15% wash of
     * itself, which only reads when the tone is light enough to carry type on the app
     * background. Position chips, demo and verdigris all are. The three platform brands are
     * not — they are dark, saturated identity colours, and Yahoo in particular is a deep
     * purple that lands within 1.33:1 of `surface1`.
     *
     * A brand colour is also the one thing here that cannot be tuned for legibility: the
     * hexes are sourced brand values, so the fix has to be the treatment rather than the
     * colour. Filling with the brand and reversing the label to white keeps `#410093`
     * exactly as sourced and puts white on it at 12.76:1.
     */
    val isPlatform = tone == OmenChipTone.Sleeper ||
        tone == OmenChipTone.Yahoo ||
        tone == OmenChipTone.Espn
    val onPlatform = when (tone) {
        OmenChipTone.Sleeper -> colors.data.onPlatformSleeper
        OmenChipTone.Yahoo -> colors.data.onPlatformYahoo
        OmenChipTone.Espn -> colors.data.onPlatformEspn
        else -> foreground
    }
    val shape = RoundedCornerShape(999.dp)
    val chipLabel: @Composable () -> Unit = { Text(label, style = OmenTheme.typography.chip.toTextStyle()) }

    if (onClick == null) {
        Surface(
            modifier = modifier,
            shape = shape,
            color = if (isPlatform) foreground else foreground.copy(alpha = 0.15f),
            contentColor = onPlatform,
        ) { androidx.compose.foundation.layout.Box(Modifier.padding(horizontal = OmenTheme.spacing.step8, vertical = OmenTheme.spacing.step4)) { chipLabel() } }
    } else if (isPlatform) {
        // Selection still has a non-colour carrier: the ✓ glyph, plus a brass ring that the
        // unselected state does not draw. A filled chip cannot lean on fill alpha the way the
        // tinted ones do, so the ring is what changes.
        FilterChip(
            selected = selected,
            onClick = onClick,
            modifier = modifier.semantics { contentDescription = label },
            enabled = enabled,
            label = chipLabel,
            leadingIcon = if (selected) { { Text("✓", style = OmenTheme.typography.chip.toTextStyle()) } } else null,
            shape = shape,
            border = FilterChipDefaults.filterChipBorder(
                enabled = enabled,
                selected = selected,
                borderColor = Color.Transparent,
                selectedBorderColor = colors.accent,
                selectedBorderWidth = 2.dp,
            ),
            colors = FilterChipDefaults.filterChipColors(
                containerColor = foreground,
                labelColor = onPlatform,
                selectedContainerColor = foreground,
                selectedLabelColor = onPlatform,
                disabledContainerColor = colors.surface3,
                disabledLabelColor = colors.textTertiary,
            ),
        )
    } else {
        FilterChip(
            selected = selected,
            onClick = onClick,
            modifier = modifier.semantics { contentDescription = label },
            enabled = enabled,
            label = chipLabel,
            leadingIcon = if (selected) { { Text("✓", style = OmenTheme.typography.chip.toTextStyle()) } } else null,
            shape = shape,
            border = FilterChipDefaults.filterChipBorder(
                enabled = enabled,
                selected = selected,
                borderColor = foreground.copy(alpha = 0.5f),
                selectedBorderColor = foreground,
            ),
            colors = FilterChipDefaults.filterChipColors(
                containerColor = foreground.copy(alpha = 0.15f),
                labelColor = foreground,
                selectedContainerColor = foreground.copy(alpha = 0.28f),
                selectedLabelColor = foreground,
                disabledContainerColor = colors.surface3,
                disabledLabelColor = colors.textTertiary,
            ),
        )
    }
}
