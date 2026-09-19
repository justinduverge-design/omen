package com.slopssaloon.omen.app.feature.shell

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.feature.help.OmenHelpButton
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenLeagueSwitcherBar
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * The chrome every destination shares: the E017 header slot and the E005–E012 switcher bar's
 * binding. The Compose half of `DesignSystem/OmenScreenShell.swift`.
 *
 * ## Why this is in the app module and not `core:designsystem`
 *
 * [OmenLeagueSwitcherBar] is a pure token-driven primitive and lives in the design system, as it
 * does on iOS. [OmenScreenHeaderControls] cannot: it composes `OmenHelpButton`, whose topic
 * content lives in `app/feature/help`. Pulling that down into the design system would invert the
 * dependency to save a file. The bar is where iOS puts it; the header slot is where Android's
 * help button already lives.
 */

/**
 * E017's slot, resolved by the founder on 2026-09-18 as **both** controls rather than one.
 *
 * The artboards draw a single 30dp account avatar in this slot on 25 of the 30 screens, and
 * `M6-ContextualHelp` shipped a help button into the same place. Rather than delete a shipped
 * affordance to match a picture, or leave Account unreachable to keep it, both sit here in
 * Command Center's order — **help, then account**.
 *
 * The order is not cosmetic. Account is the destructive one: it holds export, disconnect and
 * delete. The harmless control gets the thumb's first stop.
 *
 * This is lifted verbatim from `OmenCommandCenterScreen`'s private `HeaderBlock`, which had the
 * pattern right and kept it to itself. J2's five screens and J4/J5/J6's eleven all need it.
 */
@Composable
fun OmenScreenHeaderControls(
    destination: OmenHelpDestination,
    modifier: Modifier = Modifier,
    /**
     * Null when the caller has nowhere to send the user. An avatar that opens nothing is a lie
     * about what the header can do — the same rule [OmenLeagueSwitcherBar] applies to its chevron.
     */
    onOpenAccount: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        OmenHelpButton(destination)
        if (onOpenAccount != null) {
            OmenIconButton(
                contentDescription = "Account and profile",
                onClick = onOpenAccount,
            ) {
                Icon(painter = painterResource(id = R.drawable.ic_nav_account), contentDescription = null)
            }
        }
    }
}

/**
 * The league context a screen renders in its switcher bar (E005–E012).
 *
 * Passed in rather than read on-screen: these screens are handed a decision or a week, and the
 * context it was made in belongs to the caller that fetched it. A screen that resolved its own
 * league could disagree with the call it is displaying.
 */
data class OmenScreenContext(
    val crest: String,
    val teamName: String,
    val platform: OmenPlatform,
    val leagueName: String? = null,
    val onSwitch: (() -> Unit)? = null,
    val onAddLeague: (() -> Unit)? = null,
)

/** Renders [context] as the bar. Absent context draws nothing — an unlabelled bar is worse. */
@Composable
fun OmenScreenSwitcherBar(context: OmenScreenContext?, modifier: Modifier = Modifier) {
    if (context == null) return
    OmenLeagueSwitcherBar(
        crest = context.crest,
        teamName = context.teamName,
        platform = context.platform,
        modifier = modifier,
        leagueName = context.leagueName,
        onSwitch = context.onSwitch,
        onAddLeague = context.onAddLeague,
    )
}

/**
 * A crest is a claim about identity, so it is derived from the name the provider gave and never
 * invented — the same rule the bar states for its own.
 */
fun omenCrest(from: String): String {
    val initials = from
        .split(' ', '\'', '’')
        .filter { it.isNotBlank() }
        .take(3)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
    return initials.ifEmpty { "—" }
}
