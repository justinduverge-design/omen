package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * E005–E012 of the native visual lock: the league/team switcher **bar**.
 *
 * Mirrors `DesignSystem/OmenLeagueSwitcherBar.swift` element for element, so a journey contact
 * sheet does not compare the canvas against two different products.
 *
 * ## Why this is not `OmenContextStrip`
 *
 * `OmenContextStrip` (registry §3.2) is the approved *card* — a rounded `surface-1` panel sized
 * to sit above the Command Center matchup. The artboards draw something structurally different:
 * a **49dp bar** flush to the screen edges, closed by a hairline, carrying a 28dp crest, a 13sp
 * name, a 10sp uppercase provider line with a 7dp provider-hex square, a chevron and a `+`.
 *
 * Under the 2026-09-18 precedence decision the artboard owns composition, so this is a new
 * component rather than a re-skin of the card. Both exist on purpose.
 *
 * ## Why Android did not have one
 *
 * iOS built this bar for J3 and Android did not, which is the whole of the recorded drift
 * "Android's OmenCall card trails its artboard: no switcher bar, no account control". It appears
 * on 25 of the 30 artboards, so it is built once here and inherited by every journey after J2.
 */
@Composable
fun OmenLeagueSwitcherBar(
    /**
     * The crest monogram (E006). Derived by the caller from the team name — never invented here,
     * because a crest is a claim about identity and a wrong one is worse than none.
     */
    crest: String,
    /** E008. The team as the provider names it. */
    teamName: String,
    platform: OmenPlatform,
    modifier: Modifier = Modifier,
    /**
     * E009's second half. Optional for the same reason `OmenContextStrip`'s is: ESPN genuinely
     * failed to return a league name for every user until the adapter learned to read it.
     * Omitting the clause is honest; inventing one is not.
     */
    leagueName: String? = null,
    /**
     * E011. Null when there is nowhere to switch to — a chevron that opens nothing is a lie about
     * what the bar can do.
     */
    onSwitch: (() -> Unit)? = null,
    /** E012. Null when the product cannot currently add a league. */
    onAddLeague: (() -> Unit)? = null,
) {
    val colors = OmenTheme.color
    val providerName = when (platform) {
        OmenPlatform.Espn -> "ESPN"
        OmenPlatform.Yahoo -> "Yahoo"
        OmenPlatform.Sleeper -> "Sleeper"
    }
    val providerLine = if (leagueName.isNullOrEmpty()) providerName else "$providerName · $leagueName"
    val providerChip = when (platform) {
        OmenPlatform.Espn -> colors.data.platformEspnChip
        OmenPlatform.Yahoo -> colors.data.platformYahooChip
        OmenPlatform.Sleeper -> colors.data.platformSleeperChip
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = OmenTheme.spacing.step16,
                    end = if (onAddLeague == null) OmenTheme.spacing.step16 else OmenTheme.spacing.step2,
                    top = OmenTheme.spacing.step8,
                    bottom = OmenTheme.spacing.step10,
                ),
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // E006. A brass-lipped gradient tile, per the artboard's
            // `canvas-gradient(surface-2 -> surface-1)` with an accent-hover monogram.
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Brush.verticalGradient(listOf(colors.surface2, colors.surface1)))
                    .clearAndSetSemantics { },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = crest,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = colors.accentHover,
                    maxLines = 1,
                )
            }

            // E007–E010.
            Column(
                modifier = Modifier
                    .weight(1f)
                    .let { base -> if (onSwitch == null) base else base.clickable(onClick = onSwitch) },
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2),
            ) {
                Text(
                    text = teamName,
                    style = OmenTheme.typography.name.toTextStyle(),
                    color = colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // E010. The provider hex is the sole colour exception in this chrome, and it
                    // is never the only carrier — the provider is named in the text beside it (D7).
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(providerChip),
                    )
                    Text(
                        text = providerLine,
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = colors.textTertiary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            if (onSwitch != null) {
                Text(
                    text = "▾",
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = colors.textTertiary,
                    modifier = Modifier.clearAndSetSemantics { },
                )
            }
            if (onAddLeague != null) {
                // E012 draws a 13x18 glyph. The touch target reaches 44dp without the glyph
                // growing — `OmenIconButton` already enforces that floor.
                OmenIconButton(
                    contentDescription = "Add a league",
                    onClick = onAddLeague,
                    tone = OmenIconButtonTone.Accent,
                ) {
                    Text(
                        text = "+",
                        style = OmenTheme.typography.h3.toTextStyle(),
                        color = Color.Unspecified,
                    )
                }
            }
        }
        // E005 closes with a hairline, not a card edge.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(colors.borderSubtle),
        )
    }
}
