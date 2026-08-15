package com.slopssaloon.omen.app.feature.help

import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.core.designsystem.component.OmenContextualHelpButton
import com.slopssaloon.omen.core.designsystem.component.OmenHelpTip
import com.slopssaloon.omen.core.designsystem.component.OmenHelpTopic
import com.slopssaloon.omen.core.designsystem.component.OmenIconButtonSize

/**
 * M6-ContextualHelp — the per-destination help copy for native Android.
 *
 * **Source and its limits.** The web `frontend/src/components/help/HelpButton.jsx` `PAGE_HELP`
 * map is the content inventory this was mined from. `m4-help-support-v1.md` §1 is explicit that
 * it is "content inventory only and is not a mobile layout source", and two of its entries are
 * actively wrong for native. Both corrections are asserted in `ContextualHelpContentTest` so a
 * future copy edit cannot silently reintroduce them:
 *
 * 1. **No Draft Assistant.** `PAGE_HELP` still advertises it on `/football` and the default
 *    topic. It is cut from 1.0 (facts-of-record #9, `P1-DraftAssistantSideline`).
 * 2. **ESPN connects on the web, not in the app — but it *does* connect, and we want it to.**
 *    `PAGE_HELP` `/account/connect` describes pasting ESPN cookies, which a store build must never
 *    ask for. What is wrong is the *mechanism*, not the encouragement: ESPN is `.useWeb`, so the
 *    person connects once on the Omen website and the league then shows up here. The copy below
 *    says exactly that. **Do not "correct" this by dropping ESPN** — sending someone to the path
 *    that works is the point. (Yahoo is `.onHold` and genuinely cannot be connected anywhere right
 *    now, which is a different case and is worded differently.)
 *
 * This table is kept identical in wording to the iOS
 * `App/Help/OmenContextualHelpContent.swift`. Parity is at the contract level per the delivery
 * workflow, but help copy is one of the places where a platform split would be a defect, not a
 * platform difference.
 *
 * Trade and League are absent on purpose: both still render "landing next" placeholders.
 */
enum class OmenHelpDestination { CommandCenter, Omen, Connect, Account }

object ContextualHelpContent {

    fun topic(destination: OmenHelpDestination): OmenHelpTopic = when (destination) {
        OmenHelpDestination.CommandCenter -> OmenHelpTopic(
            title = "Command Center",
            summary = "Your week in one place — the matchup that matters, the moves worth making, and the record of what you've done.",
            tips = listOf(
                OmenHelpTip(
                    label = "League context",
                    body = "The strip at the top shows which league and team Omen is reading right now. Use Switch to change it.",
                ),
                OmenHelpTip(
                    label = "Matchup",
                    body = "Your head-to-head for the current week, with one thing worth watching.",
                ),
                OmenHelpTip(
                    label = "Waiver Watch",
                    body = "Opportunities Omen sees on the waiver wire, and how much time is left to act on them.",
                ),
                OmenHelpTip(
                    label = "Ledger",
                    body = "Your season record — every Omen you followed or skipped.",
                ),
            ),
        )

        OmenHelpDestination.Omen -> OmenHelpTopic(
            title = "Omen of the Week",
            summary = "Your highest-confidence move for the week — one call, in plain English, no noise.",
            tips = listOf(
                OmenHelpTip(
                    label = "Needs a connected league",
                    // Native provider truth, not the web's. See ConnectProvider availability.
                    body = "Omen reads your roster from a connected league. Sleeper connects in the app; ESPN connects on the Omen website.",
                ),
                OmenHelpTip(
                    label = "Confidence",
                    body = "How strongly the signals agree. High confidence is not a guarantee — it means the read is consistent.",
                ),
                OmenHelpTip(
                    label = "Risk",
                    body = "What could still go wrong if you make the move, and why.",
                ),
                OmenHelpTip(
                    label = "Where it comes from",
                    body = "Every brief lists its sources and marks anything that isn't live league data.",
                ),
            ),
        )

        OmenHelpDestination.Connect -> OmenHelpTopic(
            title = "Connect a league",
            summary = "Link your fantasy league so Omen can use your roster, scoring, and matchup.",
            tips = listOf(
                OmenHelpTip(
                    label = "Sleeper",
                    body = "Enter your Sleeper username and pick a league. Omen never asks for your Sleeper password.",
                ),
                OmenHelpTip(
                    label = "Yahoo",
                    body = "Yahoo connections are paused while we wait on Yahoo to restore our data access.",
                ),
                OmenHelpTip(
                    label = "ESPN",
                    body = "ESPN needs your browser to connect securely. Connect it once on the Omen website and it'll show up here.",
                ),
                OmenHelpTip(
                    label = "Changing later",
                    body = "You can reconnect or switch leagues at any time from Account.",
                ),
            ),
        )

        OmenHelpDestination.Account -> OmenHelpTopic(
            title = "Account",
            summary = "Manage how you sign in, which leagues Omen reads, and how to reach support.",
            tips = listOf(
                OmenHelpTip(
                    label = "Support",
                    body = "Help Center, feedback, and reporting a problem live under Support & Help Improve Omen.",
                ),
                OmenHelpTip(
                    label = "Passkeys",
                    body = "Save a passkey to sign in without waiting on an email code.",
                ),
                OmenHelpTip(
                    label = "Signing out",
                    body = "Signing out leaves your league connections in place for next time.",
                ),
            ),
        )
    }

    /** Every shipped topic, for enumeration in tests. */
    fun all(): List<OmenHelpTopic> = OmenHelpDestination.entries.map(::topic)
}

/**
 * The app-layer help affordance: binds a destination's copy to the shared help glyph so no
 * screen wires either by hand.
 */
@Composable
fun OmenHelpButton(
    destination: OmenHelpDestination,
    modifier: Modifier = Modifier,
    size: OmenIconButtonSize = OmenIconButtonSize.Md,
) {
    OmenContextualHelpButton(
        topic = ContextualHelpContent.topic(destination),
        modifier = modifier,
        size = size,
    ) {
        Icon(painter = painterResource(id = R.drawable.ic_help), contentDescription = null)
    }
}
