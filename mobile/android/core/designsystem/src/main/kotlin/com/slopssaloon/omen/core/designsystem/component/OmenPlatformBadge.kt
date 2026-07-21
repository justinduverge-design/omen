package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.1 PlatformBadge: provider identity label using the invariant `platform-*-chip`
 * fill + `on-platform-*` foreground tokens from registry §2.3. The literal provider name
 * always renders — color is a redundant signal, never the only signal (registry §4
 * accessibility contract; facts-of-record #7).
 *
 * Fill-on-platform treatment: `-chip` overrides tune the base brand color so that the
 * `on-platform-*` white text meets WCAG AA at chip typography (Sleeper is darkened; Yahoo
 * and ESPN are near or at base).
 */
enum class OmenPlatform { Sleeper, Yahoo, Espn }

@Composable
fun OmenPlatformBadge(
    platform: OmenPlatform,
    modifier: Modifier = Modifier,
) {
    val data = OmenTheme.color.data
    val fill: Color = when (platform) {
        OmenPlatform.Sleeper -> data.platformSleeperChip
        OmenPlatform.Yahoo -> data.platformYahooChip
        OmenPlatform.Espn -> data.platformEspnChip
    }
    val onFill: Color = when (platform) {
        OmenPlatform.Sleeper -> data.onPlatformSleeper
        OmenPlatform.Yahoo -> data.onPlatformYahoo
        OmenPlatform.Espn -> data.onPlatformEspn
    }
    val label = when (platform) {
        OmenPlatform.Sleeper -> "Sleeper"
        OmenPlatform.Yahoo -> "Yahoo"
        OmenPlatform.Espn -> "ESPN"
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = fill,
        contentColor = onFill,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step8, vertical = OmenTheme.spacing.step4),
            style = OmenTheme.typography.chip.toTextStyle(),
        )
    }
}
