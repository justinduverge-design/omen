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
 * Registry §3.1 PlatformBadge: provider identity label using the invariant `platform-*` tokens
 * from registry §2.3. The literal provider name always renders — color is a redundant signal,
 * never the only signal (registry §4 accessibility contract; facts-of-record #7 rule that
 * data source must be labeled, not implied).
 *
 * Scope note (2026-07-21): registry §2.3 also names `-chip` legibility overrides and
 * `on-platform-*` foreground tokens, but those are not yet defined in [OmenColor.kt]. This
 * primitive uses the same tinted-surface recipe as [OmenBadge] (platform color at 15% alpha
 * fill, platform color as text) so it passes AA on both surface1 and bg without depending on
 * tokens that don't exist yet. Swap to fill-on-platform once the registry token expansion
 * lands.
 */
enum class OmenPlatform { Sleeper, Yahoo, Espn }

@Composable
fun OmenPlatformBadge(
    platform: OmenPlatform,
    modifier: Modifier = Modifier,
) {
    val platformColor: Color = when (platform) {
        OmenPlatform.Sleeper -> OmenTheme.color.data.platformSleeper
        OmenPlatform.Yahoo -> OmenTheme.color.data.platformYahoo
        OmenPlatform.Espn -> OmenTheme.color.data.platformEspn
    }
    val label = when (platform) {
        OmenPlatform.Sleeper -> "Sleeper"
        OmenPlatform.Yahoo -> "Yahoo"
        OmenPlatform.Espn -> "ESPN"
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = platformColor.copy(alpha = 0.15f),
        contentColor = platformColor,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step8, vertical = OmenTheme.spacing.step4),
            style = OmenTheme.typography.chip.toTextStyle(),
        )
    }
}
