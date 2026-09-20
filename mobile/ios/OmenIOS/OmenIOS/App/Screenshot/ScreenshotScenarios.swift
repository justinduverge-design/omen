import Foundation
import SwiftUI

/// Reusable screenshot-mode registry for the native-visual-evidence CI workflow. The app
/// reads the launch argument `OMEN_SCREENSHOT_SCENARIO` on startup — if the value matches
/// an entry here, the app mounts *only* that scenario against fully deterministic in-app
/// fixtures (no session/auth, no network, no fabricated provider state) and the workflow
/// captures a screenshot.
///
/// Adding a scenario for a future M4 screen means adding one entry to `entries` and one
/// matrix row to `.github/workflows/native-visual-evidence.yml`. Naming rule mirrors
/// Android: `<screen-slug>.<state-slug>`, kebab-case, dot-separated, lowercase.
enum ScreenshotScenarios {
    static let launchArgumentKey = "OMEN_SCREENSHOT_SCENARIO"

    /// Every declared scenario. Add rows here to extend the workflow matrix.
    static let entries: [String: ScreenshotScenario] = [
        "onboarding.sign-in": ScreenshotScenario(
            label: "Onboarding — sign in first",
            content: { AnyView(OnboardingAuthScreenshotHost(kind: .signIn)) }
        ),
        "onboarding.email-code": ScreenshotScenario(
            label: "Onboarding — email code",
            content: { AnyView(OnboardingAuthScreenshotHost(kind: .emailCode)) }
        ),
        "onboarding.connect-league": ScreenshotScenario(
            label: "Onboarding — connect your league",
            content: { AnyView(OnboardingConnectScreenshotHost()) }
        ),
        "command-center.demo-connected": ScreenshotScenario(
            label: "Command Center — demo/mock connected",
            content: { AnyView(FauxShell(scenarioKey: "command-center.demo-connected")) }
        ),
        // The `carousel != nil` branch — a real multi-league account. Every other Command
        // Center scenario runs the stacked layout, which is why three clipping bugs reached
        // the founder's phone before anything here could catch them.
        "command-center.carousel": ScreenshotScenario(
            label: "Command Center — six leagues, live carousel",
            content: { AnyView(CarouselScenarioHost(scenarioKey: "command-center.carousel")) }
        ),
        "command-center.carousel-provider-down": ScreenshotScenario(
            label: "Command Center — carousel with one provider failing",
            content: { AnyView(CarouselScenarioHost(scenarioKey: "command-center.carousel-provider-down", failingPlatform: "espn")) }
        ),
        "command-center.long-matchup": ScreenshotScenario(
            label: "Command Center — long fantasy team names in matchup",
            content: { AnyView(FauxShell(commandStateOverride: OmenCommandCenterFixtures.longNameMatchup)) }
        ),
        "command-center.disconnected": ScreenshotScenario(
            label: "Command Center — real user, disconnected",
            content: { AnyView(FauxShell(scenarioKey: "command-center.disconnected")) }
        ),
        // `M5` slices F and G. Added 2026-08-30 with `F-VET-B03`: the two newest screens in
        // the product had no scenario at all, so nothing — not the harness, not an
        // accessibility audit, not any UI test — could reach them without a real account.
        "trade.verdict": ScreenshotScenario(
            label: "Trade — personalized verdict",
            content: { AnyView(FauxShell(scenarioKey: "trade.verdict", initialTab: .trade)) }
        ),
        "trade.empty": ScreenshotScenario(
            label: "Trade — no offer entered yet",
            content: { AnyView(FauxShell(scenarioKey: "trade.empty", initialTab: .trade)) }
        ),
        "league.loaded": ScreenshotScenario(
            label: "League — live matchup, standings, empty activity",
            content: { AnyView(FauxShell(scenarioKey: "league.loaded", initialTab: .league)) }
        ),
        "league.matchup-unavailable": ScreenshotScenario(
            label: "League — matchup unavailable beside live standings",
            content: { AnyView(FauxShell(scenarioKey: "league.matchup-unavailable", initialTab: .league)) }
        ),
        "omen.demo": ScreenshotScenario(
            label: "Omen — demo/mock decision",
            // `initialTab` was omitted here until 2026-09-17, so this scenario screenshotted the
            // COMMAND tab and certified the wrong screen. FauxShell's own comment predicted it:
            // "Without it a Trade or League scenario would screenshot the Command tab and
            // silently prove nothing." Omen was the case that slipped.
            content: { AnyView(FauxShell(scenarioKey: "omen.demo", initialTab: .omen)) }
        ),
        "omen.degraded": ScreenshotScenario(
            label: "Omen — a call with one source unread and one read-but-unused",
            content: { AnyView(FauxShell(scenarioKey: "omen.degraded", initialTab: .omen)) }
        ),
        "omen.disconnected": ScreenshotScenario(
            label: "Omen — real user, disconnected",
            content: { AnyView(FauxShell(scenarioKey: "omen.disconnected", initialTab: .omen)) }
        ),
        // J3 — The first call. The numbering is the storyboard order, not a screen id. Each
        // pass is intentionally complete: nominal proves the product can act; degraded proves
        // it names what it could not read and declines to invent advice.
        // The consent screen W1-GATE required when the ESPN terms answer came back No. It names
        // the two cookies by name — consent that omits the mechanism is not informed consent.
        "journey-j1.nominal.04-espn-consent": ScreenshotScenario(
            label: "J1 4/6 — ESPN consent, before the sheet opens",
            content: { AnyView(OnboardingConnectScreenshotHost(autoSelectProvider: .espn)) }
        ),
        "journey-j1.nominal.06-command-no-league": ScreenshotScenario(
            label: "J1 6/6 — signed in, no league connected",
            content: {
                AnyView(FauxShell(
                    initialTab: .command,
                    commandContentOverride: AnyView(OmenNoLeagueScreen(
                        onConnect: {},
                        onSeeHowOmenDecides: {}
                    ))
                ))
            }
        ),
        // J1 "Getting in" — the degraded pass. The journey has no capability profile, so per
        // `screen-journeys-v1.md` the provider failure path IS the degraded pass, and ESPN on
        // iPhone is the only confirmed beta failure on record.
        "journey-j1.degraded.05-connect-failed": ScreenshotScenario(
            label: "J1 degraded 5/6 — ESPN refused a stale session",
            content: {
                AnyView(OmenConnectFailedScreen(
                    diagnosis: .init(
                        provider: "ESPN",
                        statusCode: 401,
                        statusText: "Unauthorized",
                        // A fixture league id, not a real one. No cookie value appears anywhere
                        // in this fixture, and none may (fact-of-record #6).
                        leagueID: "884411",
                        observedAt: "3:48 PM",
                        unaffected: ["Sleeper", "Yahoo"]
                    ),
                    onReconnect: {},
                    onSendToSupport: {}
                ))
            }
        ),
        "journey-j3.nominal.01-omen-call": ScreenshotScenario(
            label: "J3 nominal 1/3 — Omen call",
            content: {
                AnyView(j3Shell(AnyView(OmenDecisionScreen(
                    state: OmenDecisionFixtures.journeyNominal,
                    weekLabel: "Week 7",
                    providerName: "ESPN",
                    onMakeMove: {},
                    onDecline: {},
                    onOpenAccount: {},
                    context: J3ScreenshotFixtures.context
                ))))
            }
        ),
        "journey-j3.nominal.02-omen-evidence": ScreenshotScenario(
            label: "J3 nominal 2/3 — full argument",
            content: {
                AnyView(j3Shell(AnyView(OmenEvidenceScreen(
                    payload: OmenDecisionFixtures.journeyNominalPayload,
                    weekLabel: "Week 7",
                    onOpenAccount: {},
                    context: J3ScreenshotFixtures.context
                ))))
            }
        ),
        "journey-j3.nominal.03-start-sit": ScreenshotScenario(
            label: "J3 nominal 3/3 — clear Start/Sit call",
            content: {
                AnyView(j3Shell(AnyView(OmenStartSitScreen(
                    detail: J3ScreenshotFixtures.nominalStartSit,
                    onOpenAccount: {},
                    context: J3ScreenshotFixtures.context
                ))))
            }
        ),
        "journey-j3.degraded.01-omen-call": ScreenshotScenario(
            label: "J3 degraded 1/3 — Omen call",
            content: {
                AnyView(j3Shell(AnyView(OmenDecisionScreen(
                    state: OmenDecisionFixtures.degraded,
                    weekLabel: "Week 7",
                    providerName: "ESPN",
                    onMakeMove: {},
                    onDecline: {},
                    onOpenAccount: {},
                    context: J3ScreenshotFixtures.context
                ))))
            }
        ),
        "journey-j3.degraded.02-omen-evidence": ScreenshotScenario(
            label: "J3 degraded 2/3 — unavailable and unused inputs",
            content: {
                AnyView(j3Shell(AnyView(OmenEvidenceScreen(
                    payload: OmenDecisionFixtures.journeyDegradedPayload,
                    weekLabel: "Week 7",
                    onOpenAccount: {},
                    context: J3ScreenshotFixtures.context
                ))))
            }
        ),
        "journey-j3.degraded.03-start-sit": ScreenshotScenario(
            label: "J3 degraded 3/3 — incomplete Start/Sit read",
            content: {
                AnyView(j3Shell(AnyView(OmenStartSitScreen(
                    detail: J3ScreenshotFixtures.degradedStartSit,
                    onRetry: {},
                    onOpenAccount: {},
                    context: J3ScreenshotFixtures.context
                ))))
            }
        ),
        // J2 — "the desk". The numbering is the storyboard order: arrive at Command, open the
        // switcher, watch the new team resolve, and see what the desk says on a quiet week.
        //
        // The degraded pass is NOT a fifth screen. `CONTRACTS.md` gives Command Center its own
        // rule — "Every section fails independently; a dead matchup read sits beside live
        // standings" — so the same four frames run with `league_matchup` unavailable and
        // `league_standings` read-but-unused, which is exactly the pair
        // `capability-expression-v1.md` requires of a degraded pass for a `consumes` profile.
        //
        // `CommandQuiet` appears only in the nominal pass and `CommandQuietStraight` only in the
        // degraded one, and that is the contract rather than a convenience: the neutral variant
        // requires *all* positive quiet evidence, so it cannot occur in a pass where a provider
        // failed. Straight fires on exactly that.
        "journey-j2.nominal.01-command-center": ScreenshotScenario(
            label: "J2 nominal 1/4 — the desk, everything read",
            content: { AnyView(j2Shell(AnyView(OmenCommandDeskScreen(
                state: J2ScreenshotFixtures.nominalDesk,
                context: J2ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onOpenLeague: {},
                onOpenLedger: {}
            )))) }
        ),
        "journey-j2.nominal.02-switch-sheet": ScreenshotScenario(
            label: "J2 nominal 2/4 — the switcher sheet over the desk",
            content: { AnyView(j2Shell(AnyView(OmenSwitchSheetOverlay(
                state: J2ScreenshotFixtures.nominalSwitchSheet,
                onSelectFilter: { _ in },
                onSelectRow: { _ in },
                onToggleFavorite: { _ in },
                onDismiss: {},
                backdrop: {
                    OmenCommandDeskScreen(
                        state: J2ScreenshotFixtures.nominalDesk,
                        context: J2ScreenshotFixtures.titansContext,
                        onOpenAccount: {}
                    )
                }
            )))) }
        ),
        "journey-j2.nominal.03-switch-loading": ScreenshotScenario(
            label: "J2 nominal 3/4 — mid-switch, nothing reused",
            content: { AnyView(j2Shell(AnyView(OmenSwitchLoadingScreen(
                context: J2ScreenshotFixtures.davantesContext,
                weekLabel: "Week 7 · Sunday",
                footnote: J2ScreenshotFixtures.switchingFootnote,
                onOpenAccount: {}
            )))) }
        ),
        "journey-j2.nominal.04-command-quiet": ScreenshotScenario(
            label: "J2 nominal 4/4 — a quiet week, neutral variant",
            content: { AnyView(j2Shell(AnyView(OmenCommandQuietScreen(
                state: J2ScreenshotFixtures.quietNeutral,
                context: J2ScreenshotFixtures.titansContext,
                onOpenAccount: {}
            )))) }
        ),
        "journey-j2.degraded.01-command-center": ScreenshotScenario(
            label: "J2 degraded 1/4 — dead matchup read beside a live wire",
            content: { AnyView(j2Shell(AnyView(OmenCommandDeskScreen(
                state: J2ScreenshotFixtures.degradedDesk,
                context: J2ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onOpenLeague: {},
                onOpenLedger: {}
            )))) }
        ),
        "journey-j2.degraded.02-switch-sheet": ScreenshotScenario(
            label: "J2 degraded 2/4 — switcher naming the provider it could not list",
            content: { AnyView(j2Shell(AnyView(OmenSwitchSheetOverlay(
                state: J2ScreenshotFixtures.degradedSwitchSheet,
                onSelectFilter: { _ in },
                onSelectRow: { _ in },
                onToggleFavorite: { _ in },
                onDismiss: {},
                backdrop: {
                    OmenCommandDeskScreen(
                        state: J2ScreenshotFixtures.degradedDesk,
                        context: J2ScreenshotFixtures.titansContext,
                        onOpenAccount: {}
                    )
                }
            )))) }
        ),
        "journey-j2.degraded.03-switch-loading": ScreenshotScenario(
            label: "J2 degraded 3/4 — mid-switch after a partial read",
            content: { AnyView(j2Shell(AnyView(OmenSwitchLoadingScreen(
                context: J2ScreenshotFixtures.davantesContext,
                weekLabel: "Week 7 · Sunday",
                footnote: J2ScreenshotFixtures.switchingFootnote,
                onOpenAccount: {}
            )))) }
        ),
        "journey-j2.degraded.04-command-quiet-straight": ScreenshotScenario(
            label: "J2 degraded 4/4 — a quiet week after a loss, straight variant",
            content: { AnyView(j2Shell(AnyView(OmenCommandQuietScreen(
                state: J2ScreenshotFixtures.quietStraight,
                context: J2ScreenshotFixtures.titansContext,
                onOpenAccount: {}
            )))) }
        ),
        // J4, "settling an argument". Trade is the front door, so these open on the Trade tab.
        //
        // Numbered in the order a user meets them: build a deal, look at the other roster, get
        // the read, send it. `TradeVerdict` holds the third seat in the nominal pass and
        // `TradeNeedsContext` holds it in the degraded one — same seat, two states of the same
        // answer. See `J4ScreenshotFixtures` for why that split is a contract and not a choice.
        "journey-j4.nominal.01-trade-build": ScreenshotScenario(
            label: "J4 nominal 1/4 — build a deal, third team unavailable",
            content: { AnyView(j4Shell(AnyView(OmenTradeBuildScreen(
                state: J4ScreenshotFixtures.nominalBuild,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onSelectTab: { _ in },
                onSelectPartner: { _ in },
                onSelectFilter: { _ in },
                onPrimaryAction: {}
            )))) }
        ),
        "journey-j4.nominal.02-trade-roster": ScreenshotScenario(
            label: "J4 nominal 2/4 — picking from a roster Omen could read",
            content: { AnyView(j4Shell(AnyView(OmenTradeRosterScreen(
                state: J4ScreenshotFixtures.nominalRoster,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onSelectTab: { _ in },
                onSelectPartner: { _ in },
                onSelectFilter: { _ in },
                onAddPlayer: { _ in }
            )))) }
        ),
        "journey-j4.nominal.03-trade-verdict": ScreenshotScenario(
            label: "J4 nominal 3/4 — the read, both sides and the caveat",
            content: { AnyView(j4Shell(AnyView(OmenTradeVerdictScreen(
                state: J4ScreenshotFixtures.verdict,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onPrimaryAction: {},
                onCounter: {},
                onShare: {}
            )))) }
        ),
        "journey-j4.nominal.04-trade-share": ScreenshotScenario(
            label: "J4 nominal 4/4 — share the read, names off by default",
            content: { AnyView(j4Shell(AnyView(OmenTradeShareScreen(
                state: J4ScreenshotFixtures.nominalShare,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onToggleInclusion: { _ in },
                onShare: {},
                onCopyAsText: {}
            )))) }
        ),
        "journey-j4.degraded.01-trade-build": ScreenshotScenario(
            label: "J4 degraded 1/4 — a read built on inputs that did not all arrive",
            content: { AnyView(j4Shell(AnyView(OmenTradeBuildScreen(
                state: J4ScreenshotFixtures.degradedBuild,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onSelectTab: { _ in },
                onSelectPartner: { _ in },
                onSelectFilter: { _ in },
                onPrimaryAction: {}
            )))) }
        ),
        "journey-j4.degraded.02-trade-roster": ScreenshotScenario(
            label: "J4 degraded 2/4 — no opponent rosters, permanently",
            content: { AnyView(j4Shell(AnyView(OmenTradeRosterScreen(
                state: J4ScreenshotFixtures.degradedRoster,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onSelectTab: { _ in },
                onSelectPartner: { _ in },
                onSelectFilter: { _ in },
                onAddPlayer: { _ in }
            )))) }
        ),
        "journey-j4.degraded.03-trade-needs-context": ScreenshotScenario(
            label: "J4 degraded 3/4 — too close to call blind, and it says which input is missing",
            content: { AnyView(j4Shell(AnyView(OmenTradeNeedsContextScreen(
                state: J4ScreenshotFixtures.needsContext,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onConnect: {},
                onShowAnyway: {}
            )))) }
        ),
        "journey-j4.degraded.04-trade-share": ScreenshotScenario(
            label: "J4 degraded 4/4 — the share service failed, and the read did not",
            content: { AnyView(j4Shell(AnyView(OmenTradeShareScreen(
                state: J4ScreenshotFixtures.degradedShare,
                context: J4ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onToggleInclusion: { _ in },
                onShare: {},
                onCopyAsText: {}
            )))) }
        ),
        // MARK: - J5, "the scout's nest"
        //
        // Six artboards, six frames, two passes — and two compositions, because `LeagueTable`,
        // `LeagueDegraded` and `LeagueNoRosters` are one screen in three states and the wire's
        // three artboards are likewise one screen in three.
        //
        // The split between passes follows the capability contract rather than tone.
        // `WaiverNoMove` is in the NOMINAL pass: a wire that read perfectly and found nothing
        // worth claiming is a healthy read, not a degraded one, and filing it as a failure would
        // teach exactly the wrong lesson about what "no move" means.
        //
        // Each pass carries both required classes for its profile — at least one input
        // `unavailable` and at least one `live, used: false`:
        //
        //   league  degraded  `trade_rosters` and `league_activity` unavailable; `league_scoring`
        //                     read and unused, in the foot line.
        //   waiver  degraded  `waiver_system` unavailable, named three times over; `roster` read
        //                     and unused, in the foot line.
        "journey-j5.nominal.01-league-table": ScreenshotScenario(
            label: "J5 nominal 1/3 — the scout\u{2019}s nest, everything read",
            content: { AnyView(j5Shell(AnyView(OmenLeagueTableScreen(
                state: J5ScreenshotFixtures.nominalTable,
                context: J5ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onOpenWaiver: {},
                onBuildTrade: { _ in }
            )))) }
        ),
        "journey-j5.nominal.02-league-waiver": ScreenshotScenario(
            label: "J5 nominal 2/3 — the wire, one move and two alternatives",
            content: { AnyView(j5Shell(AnyView(OmenLeagueWireScreen(
                state: J5ScreenshotFixtures.nominalWire,
                context: J5ScreenshotFixtures.titansContext,
                onOpenAccount: {}
            )))) }
        ),
        "journey-j5.nominal.03-waiver-no-move": ScreenshotScenario(
            label: "J5 nominal 3/3 — nothing on the wire beats what you have",
            content: { AnyView(j5Shell(AnyView(OmenLeagueWireScreen(
                state: J5ScreenshotFixtures.noMoveWire,
                context: J5ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                screenIdentifier: "j5.league-wire.no-move",
                fitProbeIdentifier: "j5.fit.waiver-no-move"
            )))) }
        ),
        "journey-j5.degraded.01-league-degraded": ScreenshotScenario(
            label: "J5 degraded 1/3 — two sections live, two unread, each saying which",
            content: { AnyView(j5Shell(AnyView(OmenLeagueTableScreen(
                state: J5ScreenshotFixtures.degradedTable,
                context: J5ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onOpenWaiver: {},
                onRetry: {}
            )))) }
        ),
        "journey-j5.degraded.02-league-no-rosters": ScreenshotScenario(
            label: "J5 degraded 2/3 — no rosters, so no trade read, permanently",
            content: { AnyView(j5Shell(AnyView(OmenLeagueTableScreen(
                state: J5ScreenshotFixtures.noRostersTable,
                context: J5ScreenshotFixtures.pukContext,
                onOpenAccount: {},
                onOpenWaiver: {}
                // No `onRetry`, and the state carries no retry title. A permanent provider limit
                // with a Try Again button is a promise the product cannot keep.
            )))) }
        ),
        "journey-j5.degraded.03-waiver-not-determined": ScreenshotScenario(
            label: "J5 degraded 3/3 — the waiver system itself is unknown",
            content: { AnyView(j5Shell(AnyView(OmenLeagueWireScreen(
                state: J5ScreenshotFixtures.notDeterminedWire,
                context: J5ScreenshotFixtures.pukContext,
                onOpenAccount: {},
                screenIdentifier: "j5.league-wire.not-determined",
                fitProbeIdentifier: "j5.fit.waiver-not-determined"
            )))) }
        ),
        // MARK: J6 — "the receipts"
        //
        // `Ledger.dc.html` and `LedgerDetail.dc.html`, in the order a user meets them: the
        // record, then one call in full. Both open on the **Omen** tab, which is where
        // `CommandCenter`'s Ledger preview and its "See all" route live.
        //
        // Each pass carries both required classes:
        //
        //   ledger         degraded  `move_outcomes` unavailable, named with a sentence that
        //                            survives truncation; `league_scoring` read and unused, in
        //                            the foot line.
        //   ledger-detail  degraded  `game_script` unavailable; `schedule_strength` read and
        //                            explicitly not used — rendered with no evidence chip.
        "journey-j6.nominal.01-ledger": ScreenshotScenario(
            label: "J6 nominal 1/2 \u{2014} the record, verified and self-reported kept apart",
            content: { AnyView(j6Shell(AnyView(OmenLedgerScreen(
                state: J6ScreenshotFixtures.nominalLedger,
                context: J6ScreenshotFixtures.titansContext,
                onOpenAccount: {},
                onOpenCall: { _ in }
            )))) }
        ),
        "journey-j6.nominal.02-ledger-detail": ScreenshotScenario(
            label: "J6 nominal 2/2 \u{2014} one receipt in full, including the loss",
            content: { AnyView(j6Shell(AnyView(OmenLedgerDetailScreen(
                state: J6ScreenshotFixtures.nominalReceipt,
                context: J6ScreenshotFixtures.titansContext,
                onOpenAccount: {}
            )))) }
        ),
        "journey-j6.degraded.01-ledger": ScreenshotScenario(
            label: "J6 degraded 1/2 \u{2014} outcomes unread, follow-through unknown",
            content: { AnyView(j6Shell(AnyView(OmenLedgerScreen(
                state: J6ScreenshotFixtures.degradedLedger,
                context: J6ScreenshotFixtures.pukContext,
                onOpenAccount: {},
                onOpenCall: { _ in }
            )))) }
        ),
        "journey-j6.degraded.02-ledger-detail": ScreenshotScenario(
            label: "J6 degraded 2/2 \u{2014} a receipt whose zone and evidence are incomplete",
            content: { AnyView(j6Shell(AnyView(OmenLedgerDetailScreen(
                state: J6ScreenshotFixtures.degradedReceipt,
                context: J6ScreenshotFixtures.pukContext,
                onOpenAccount: {}
            )))) }
        ),
        "switcher.team-sheet": ScreenshotScenario(
            label: "Team switcher — pinned bar and the sheet, one favourite starred",
            content: { AnyView(TeamSwitcherScreenshotHost()) }
        ),
        // §10.2 switcher. Rendered against a deterministic in-app stub rather than a live
        // account, so the states are capturable without credentials — including the ones a
        // real account would rarely show on demand (an unreadable directory, an empty one).
        "league-switcher.loaded": ScreenshotScenario(
            label: "League switcher — leagues across platforms",
            content: { AnyView(LeagueSwitcherScreenshotHost(kind: .loaded)) }
        ),
        "league-switcher.empty": ScreenshotScenario(
            label: "League switcher — nothing connected",
            content: { AnyView(LeagueSwitcherScreenshotHost(kind: .empty)) }
        ),
        "league-switcher.failed": ScreenshotScenario(
            label: "League switcher — directory unreadable",
            content: { AnyView(LeagueSwitcherScreenshotHost(kind: .failed)) }
        ),
        "help-support.available": ScreenshotScenario(
            label: "Help + Support — available",
            content: { AnyView(OmenHelpSupportView(contextDescription: "Need help with your current Omen flow? Start with a topic below.")) }
        ),
        "help-support.no-account": ScreenshotScenario(
            label: "Help + Support — no account",
            content: { AnyView(OmenHelpSupportView(state: .noAccount)) }
        ),
        "help-support.offline": ScreenshotScenario(
            label: "Help + Support — offline",
            content: { AnyView(OmenHelpSupportView(state: .offline)) }
        ),
        "help-support.submission-unavailable": ScreenshotScenario(
            label: "Help + Support — feedback unavailable",
            content: { AnyView(OmenHelpSupportView(state: .submissionUnavailable)) }
        ),
        "help-support.provider-recovery": ScreenshotScenario(
            label: "Help + Support — provider recovery",
            content: { AnyView(OmenHelpSupportView(state: .providerRecovery)) }
        ),
        // M4-CC-WaiverWatch. One scenario per registered honest state so each can be rendered
        // and reviewed on its own. The composition is NOT re-implemented here — every entry
        // mounts the real `OmenCommandCenterScreen` and varies only `waiverWatch`, mirroring
        // the Android connected test that asserts the same six states.
        //
        // Base fixture is chosen for coherence, not convenience: `not-connected` uses the
        // disconnected fixture because "your waiver moves need a league" beside a selected
        // demo league would be a state the product never produces. The other five imply a
        // usable league, so they sit on the demo-connected fixture.
        //
        // Waiver Watch renders below the fold on every current iPhone, so capturing these
        // requires scrolling the screen — see `scripts/capture-screenshot-scenario.sh`.
        "waiver-watch.pending": ScreenshotScenario(
            label: "Waiver Watch — claim pending",
            content: { AnyView(waiverWatch(.pending)) }
        ),
        "waiver-watch.processed": ScreenshotScenario(
            label: "Waiver Watch — waivers processed",
            content: { AnyView(waiverWatch(.processed)) }
        ),
        "waiver-watch.availability-unknown": ScreenshotScenario(
            label: "Waiver Watch — availability needs confirmation",
            content: { AnyView(waiverWatch(.availabilityUnknown)) }
        ),
        "waiver-watch.no-credible-move": ScreenshotScenario(
            label: "Waiver Watch — no credible move",
            content: { AnyView(waiverWatch(.noCredibleMove)) }
        ),
        "waiver-watch.not-connected": ScreenshotScenario(
            label: "Waiver Watch — no connected league",
            content: { AnyView(waiverWatch(.notConnected, base: OmenCommandCenterFixtures.realDisconnected)) }
        ),
        "waiver-watch.off-season": ScreenshotScenario(
            label: "Waiver Watch — off-season",
            content: { AnyView(waiverWatch(.offSeason)) }
        ),
        // M6-ContextualHelp. The sheet body is captured directly rather than through a tap:
        // screenshot mode has no interaction, and the content is what needs proving.
        "contextual-help.command-center": ScreenshotScenario(
            label: "Contextual help — Command Center",
            content: { AnyView(contextualHelp(.commandCenter)) }
        ),
        "contextual-help.omen": ScreenshotScenario(
            label: "Contextual help — Omen of the Week",
            content: { AnyView(contextualHelp(.omen)) }
        ),
        "contextual-help.connect": ScreenshotScenario(
            label: "Contextual help — Connect a league (native provider truth)",
            content: { AnyView(contextualHelp(.connect)) }
        ),
        "contextual-help.account": ScreenshotScenario(
            label: "Contextual help — Account",
            content: { AnyView(contextualHelp(.account)) }
        ),
        // O7 forced-update gate. Captured directly rather than through the real gate:
        // screenshot mode has no network, and the blocking composition is what needs
        // proving. The version is a fixture, not a real minimum.
        "forced-update.blocked": ScreenshotScenario(
            label: "Forced update — build below minimum",
            content: {
                AnyView(
                    ForcedUpdateView(
                        minimumVersion: "1.2.0",
                        // Fixture URL so the evidence and the accessibility audit cover the
                        // button state. The real build ships this nil until the listing exists.
                        storeURL: URL(string: "https://apps.apple.com/app/id0000000000"),
                        onUpdate: {}
                    )
                )
            }
        ),
        // The state that actually ships today: no App Store listing yet, so `storeURL` is nil
        // and no button is drawn. Captured because it is the live configuration, not an edge case.
        "forced-update.no-store-link": ScreenshotScenario(
            label: "Forced update — below minimum, no store listing yet",
            content: {
                AnyView(ForcedUpdateView(minimumVersion: "1.2.0", storeURL: nil, onUpdate: {}))
            }
        ),
    ]

    /// Rebuilds `base` with one field replaced. `OmenCommandCenterState` is a `let`-only
    /// struct with no `copy`, so the swap is spelled out rather than mutated in place.
    private static func waiverWatch(
        _ state: OmenWaiverWatchState,
        base: OmenCommandCenterState = OmenCommandCenterFixtures.demoConnected
    ) -> some View {
        ScreenshotScenarioHost.commandCenter(
            OmenCommandCenterState(
                greeting: base.greeting,
                context: base.context,
                platforms: base.platforms,
                matchup: base.matchup,
                waiverWatch: state,
                ledger: base.ledger,
                leaguePulse: base.leaguePulse
            )
        )
    }

    private static func contextualHelp(_ destination: OmenHelpDestination) -> some View {
        OmenContextualHelpSheet(
            topic: OmenContextualHelpContent.topic(for: destination),
            onDismiss: {}
        )
    }

    private static func j3Shell(_ content: AnyView) -> some View {
        FauxShell(initialTab: .omen, omenContentOverride: content)
    }

    /// J2 opens on the Command tab, which is the destination all five of its screens live in —
    /// including the switcher sheet, which the artboard happens to draw over Trade only because
    /// the switcher bar is on 25 of the 30 screens and can be opened from any of them.
    private static func j2Shell(_ content: AnyView) -> some View {
        FauxShell(initialTab: .command, commandContentOverride: content)
    }

    /// J4 opens on the Trade tab. Trade is the front door — `context.md` says so — and all five
    /// of its artboards are that destination, so a capture that opened anywhere else would be a
    /// picture of the wrong screen.
    private static func j4Shell(_ content: AnyView) -> some View {
        FauxShell(initialTab: .trade, tradeContentOverride: content)
    }

    /// J5 opens on the League tab. All six of its artboards live in that destination — the wire
    /// included, because `CONTRACTS.md` places Waiver as a section *inside* League rather than as
    /// a fifth tab. A J5 capture that opened on Command would photograph the wrong screen and
    /// prove nothing, which is the mistake the `initialTab` seam exists to prevent.
    private static func j5Shell(_ content: AnyView) -> some View {
        FauxShell(initialTab: .league, leagueContentOverride: content)
    }

    /// J6 opens on the Omen tab. Both artboards draw the Omen tab lit, and the only production
    /// route into either of them is the Command Center Ledger preview's "See all" and its rows —
    /// which live in the Omen destination. Opening on Command would photograph the preview
    /// rather than the Ledger.
    private static func j6Shell(_ content: AnyView) -> some View {
        FauxShell(initialTab: .omen, omenContentOverride: content)
    }

    /// Read the launch-argument value that names the current scenario, if any.
    static func active(from environment: [String: String], arguments: [String]) -> String? {
        if let fromEnv = environment[launchArgumentKey], !fromEnv.isEmpty { return fromEnv }
        // xcrun simctl launch --console -OMEN_SCREENSHOT_SCENARIO <value> puts it as
        // adjacent argv pairs (`-<key> <value>`).
        if let flagIndex = arguments.firstIndex(of: "-\(launchArgumentKey)"),
           arguments.indices.contains(flagIndex + 1) {
            return arguments[flagIndex + 1]
        }
        return nil
    }

    static func isKnown(_ key: String?) -> Bool {
        guard let key else { return false }
        return entries[key] != nil
    }
}

struct ScreenshotScenario {
    let label: String
    let content: () -> AnyView
}

/// Screenshot-mode host — deterministic shell mirroring the signed-in TabView so
/// screenshots include the permanent 4-tab bottom navigation. No session, no network.
struct ScreenshotScenarioHost: View {
    let scenarioKey: String

    var body: some View {
        ScreenshotScenarios.entries[scenarioKey]?.content()
    }

    /// Mounts the real Command Center in the deterministic tab shell against an explicit
    /// state. Used by scenarios that vary one section rather than selecting a whole fixture.
    static func commandCenter(_ state: OmenCommandCenterState) -> some View {
        FauxShell(commandStateOverride: state)
    }
}

private struct OnboardingAuthScreenshotHost: View {
    enum Kind { case signIn, emailCode }

    let kind: Kind
    @StateObject private var viewModel: AuthViewModel

    init(kind: Kind) {
        self.kind = kind
        _viewModel = StateObject(wrappedValue: Self.makeViewModel())
    }

    var body: some View {
        SignInView(
            viewModel: viewModel,
            demoModeEnabled: true,
            onTryDemo: {}
        )
        .task {
            guard kind == .emailCode, viewModel.emailField.isEmpty else { return }
            viewModel.emailField = "justin@slopssaloon.com"
            viewModel.submitEmail()
            for _ in 0..<20 {
                try? await Task.sleep(nanoseconds: 100_000_000)
                viewModel.clearOtpResendCooldownForTesting()
                if case .awaitingOtp = viewModel.flowState {
                    break
                }
            }
            viewModel.otpField = "417"
        }
    }

    private static func makeViewModel() -> AuthViewModel {
        AuthViewModel(
            repository: FakeAuthRepository(),
            appleProvider: ScreenshotAppleIDTokenProvider(),
            oauthProvider: ScreenshotOAuthProvider(),
            passkeyProvider: ScreenshotPasskeyProvider(),
            sessionManager: SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
        )
    }
}

private struct OnboardingConnectScreenshotHost: View {
    var autoSelectProvider: ConnectProvider? = nil

    var body: some View {
        ConnectView(
            repository: ScreenshotConnectRepository(),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(
                    initial: Session(
                        userID: "screenshot",
                        accessToken: "t",
                        refreshToken: "r",
                        expiresAtEpochSeconds: 9_999_999_999
                    )
                ),
                nowEpochSeconds: { 1_000 }
            ),
            authSession: StubProviderAuthSession(),
            autoSelectProvider: autoSelectProvider,
            onConnected: {},
            onDismiss: {}
        )
    }
}

private struct ScreenshotAppleIDTokenProvider: AppleIDTokenProviding {
    let isConfigured = true
    func getIDToken(rawNonce: String) async -> AppleIDTokenResult { .unavailable }
}

private final class ScreenshotOAuthProvider: SupabaseOAuthProvider {
    func isConfigured(providerId: String) -> Bool { ["google", "discord"].contains(providerId) }
    func launch(providerId: String) async -> OAuthLaunchResult { .unavailable }
    func parseCallback(providerId: String, code: String?, state: String?) -> OAuthCallback { .malformed }
}

private struct ScreenshotPasskeyProvider: PasskeyProvider {
    let isSupported = false
    func getAssertion(options: PasskeyAuthenticationOptions) async -> PasskeyResult { .unavailable }
    func register(options: PasskeyRegistrationOptions) async -> PasskeyRegistrationResult { .unavailable }
}

private struct ScreenshotConnectRepository: ConnectRepository {
    func resolveSleeper(username: String, accessToken: String) async -> Result<ResolvedSleeperAccount, ConnectFailure> {
        .success(
            ResolvedSleeperAccount(
                username: username,
                leagues: [
                    SleeperLeague(id: "1", name: "Demo League", season: 2026, scoringFormat: "PPR", teamName: "Demo Team")
                ]
            )
        )
    }

    func connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String
    ) async -> Result<Void, ConnectFailure> {
        .success(())
    }

    func startYahooAuthorization(accessToken: String) async -> Result<URL, ConnectFailure> {
        .success(URL(string: "https://example.invalid/yahoo")!)
    }

    func yahooLeagues(accessToken: String) async -> Result<[YahooLeague], ConnectFailure> {
        .success([YahooLeague(id: "yahoo.l.1", name: "Demo Yahoo", season: 2026)])
    }

    func bindYahooLeague(id: String, accessToken: String) async -> Result<Void, ConnectFailure> {
        .success(())
    }

    /// Nil, so a capture of the ESPN screen shows the handoff steps — the state a real user
    /// arrives in — rather than a connected league they never connected.
    func espnConnection(accessToken: String) async -> Result<EspnConnection?, ConnectFailure> {
        .success(nil)
    }

    /// Screenshot mode never signs in to anything, so this is unreachable by construction. It
    /// fails rather than succeeding: a fixture that reported a successful ESPN connect would put
    /// a fake connected state into store screenshots.
    func connectEspn(_ capture: EspnCapture, accessToken: String) async -> Result<Void, ConnectFailure> {
        .failure(.espnSessionUnreadable(nil))
    }

    /// Empty for the same reason `connectEspn` fails: screenshot mode signs in to nothing, and a
    /// fixture that invented ESPN leagues would put fake league names into store screenshots.
    /// Screenshot mode never writes, so the follow set is reported as accepted and stored —
    /// the "did not persist" disclosure is a real-server state and must not appear in a
    /// marketing capture describing something that did not happen.
    func followLeagues(
        platform: String,
        leagues: [FollowedLeague],
        accessToken: String
    ) async -> Result<Bool, ConnectFailure> {
        .success(true)
    }

    func discoverEspnLeagues(
        espnS2: String,
        swid: String,
        accessToken: String
    ) async -> Result<[EspnLeagueOption], ConnectFailure> {
        .success([])
    }
}

/// Faux tab shell — production `CommandCenterView` requires a real SessionManager;
/// screenshot mode explicitly avoids constructing one. This mirror renders the same
/// 4-tab TabView, wires the Command tab to the correct fixture per scenario key, and
/// leaves the other tabs on their "coming next" placeholders.
private struct FauxShell: View {
    var scenarioKey: String = ""
    /// Which tab the capture opens on. Without it a Trade or League scenario would screenshot
    /// the Command tab and silently prove nothing.
    var initialTab: CommandCenterTab = .command
    /// Set by scenarios that supply a state directly instead of naming a whole fixture.
    var commandStateOverride: OmenCommandCenterState?
    /// Supplied by the carousel scenarios. Everything else leaves this nil and gets the
    /// stacked `carousel == nil` layout, which is what those captures have always been of.
    var carousel: LeagueCarouselViewModel?
    /// A real destination composition supplied by a journey scenario. This keeps the permanent
    /// tab shell while avoiding any network/session state and does not duplicate screen markup.
    var omenContentOverride: AnyView? = nil
    /// Same seam for the Command tab, so J1's terminus can be captured inside the real shell.
    var commandContentOverride: AnyView? = nil
    /// Same seam again for the Trade tab. J4's five screens all live in that destination, and
    /// without this a J4 capture would screenshot `OmenTradeScreen` — the shipped compare
    /// surface — while claiming to be a picture of `TradeBuild`.
    var tradeContentOverride: AnyView? = nil
    /// And for the League tab, which is J5's whole destination.
    var leagueContentOverride: AnyView? = nil

    var body: some View {
        TabView(selection: .constant(initialTab)) {
            Group {
                if let commandContentOverride {
                    commandContentOverride
                } else {
            OmenCommandCenterScreen(
                state: commandState,
                onOpenAccount: {},
                // Supplied so the Waiver Watch "Review Omen's waiver analysis" link renders.
                // The screen hides that link when `onOpenOmen` is nil — correct product
                // behavior, but it meant iOS captures of the `urgent` and `processed` states
                // were silently missing an element of the approved composition that the
                // Android host had all along. Found while capturing M4-CC-WaiverWatch.
                onOpenOmen: {},
                onOpenLedger: { _ in },
                onOpenLeague: {},
                carousel: carousel
            )
                }
            }
                .tabItem { CommandCenterTab.command.label }
            .tag(CommandCenterTab.command)

            Group {
                if let omenContentOverride {
                    omenContentOverride
                } else {
                    OmenDecisionScreen(
                        state: omenState,
                        // Supplied so the capture exercises the header eyebrow and the provider handoff.
                        // Both are optional on the screen by design: absent week means no eyebrow, and
                        // absent provider means no "make this move" button, because neither may be
                        // guessed. A capture that never passes them would silently prove only the
                        // degraded half of the layout.
                        weekLabel: "Week 7",
                        providerName: "ESPN",
                        onMakeMove: {},
                        onDecline: {},
                        onOpenFullArgument: {}
                    )
                }
            }
            .tabItem { CommandCenterTab.omen.label }
            .tag(CommandCenterTab.omen)

            // The REAL screens, driven by explicit state — the same rule the Command and Omen
            // tabs above already followed. These two carried "landing next" placeholders for a
            // day after `M5` slices F and G shipped (`F-VET-B01`), so every screenshot and
            // every accessibility UI test that reached them was assessing a screen that no
            // longer existed.
            Group {
                if let tradeContentOverride {
                    tradeContentOverride
                } else {
                    OmenTradeScreen(state: tradeState, offer: tradeOffer)
                }
            }
            .tabItem { CommandCenterTab.trade.label }
            .tag(CommandCenterTab.trade)

            Group {
                if let leagueContentOverride {
                    leagueContentOverride
                } else {
                    OmenLeagueScreen(state: leagueState)
                }
            }
            .tabItem { CommandCenterTab.league.label }
            .tag(CommandCenterTab.league)
        }
        // Mirrors `CommandCenterView`'s own `.tint`, and for the same reason it was added
        // there on 2026-09-01: without it the selected tab renders in iOS system blue while
        // every other element on the screen is brass.
        //
        // The real view was fixed; this host was not, so from 2026-09-01 until 2026-09-11
        // every iOS capture showed a blue tab bar that the shipped app never rendered — a
        // screenshot of the fixture rather than of the product. Found when the warm light
        // ramp made the blue impossible to keep ignoring. If the real shell's tint changes,
        // change it here in the same edit.
        .tint(OmenColor.accent)
    }

    private var commandState: OmenCommandCenterState {
        if let commandStateOverride { return commandStateOverride }
        switch scenarioKey {
        case "command-center.demo-connected": return OmenCommandCenterFixtures.demoConnected
        case "command-center.disconnected": return OmenCommandCenterFixtures.realDisconnected
        case "command-center.carousel", "command-center.carousel-provider-down":
            return OmenCommandCenterFixtures.realConnected
        default: return OmenCommandCenterFixtures.realDisconnected
        }
    }

    /// Decoded from contract JSON rather than built by memberwise init, so a scenario also
    /// proves the screen renders from a payload the server could actually send. A malformed
    /// fixture surfaces as the screen's own failure state rather than a blank tab.
    private var leagueState: LeagueViewModel.ViewState {
        guard
            scenarioKey != "league.matchup-unavailable",
            let overview = Self.decodeOverview(Self.leagueOverviewJSON)
        else {
            if let degraded = Self.decodeOverview(Self.leagueMatchupUnavailableJSON) {
                return .loaded(degraded)
            }
            return .failed(.decode)
        }
        return .loaded(overview)
    }

    private var tradeState: TradeViewModel.ViewState {
        guard let result = Self.decodeTrade(Self.tradeVerdictJSON) else { return .failed(.decode) }
        return scenarioKey == "trade.empty" ? .idle : .loaded(result)
    }

    private var tradeOffer: TradeOffer {
        scenarioKey == "trade.empty"
            ? TradeOffer()
            : TradeOffer(
                send: [TradePlayer(name: "A.J. Brown", position: "WR", team: "PHI")],
                receive: [TradePlayer(name: "Garrett Wilson", position: "WR", team: "NYJ")]
            )
    }

    private static func decodeOverview(_ json: String) -> LeagueOverview? {
        guard let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(LeagueOverview.self, from: data)
    }

    private static func decodeTrade(_ json: String) -> TradeCompare? {
        guard let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(TradeCompare.self, from: data)
    }

    private static let leagueOverviewJSON = """
    {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
     "league_name":"Demo Slate (mock league)","season":2026,"week":8,
     "matchup":{"status":"live",
       "you":{"team_id":"7","team_name":"Demo Titans","record":"6-1","points":64.8,"projected":null},
       "opponent":{"team_id":"3","team_name":"Demo Rivals","record":"5-2","points":58.1,"projected":null},
       "unavailable_reason":null},
     "standings":{"status":"available",
       "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
       "teams":[
         {"team_name":"Demo Rivals","is_current_user":false,"rank":1,"wins":7,"losses":1},
         {"team_name":"Demo Hawks","is_current_user":false,"rank":2,"wins":6,"losses":2},
         {"team_name":"Demo Titans","is_current_user":true,"rank":3,"wins":6,"losses":1},
         {"team_name":"Demo Bandits","is_current_user":false,"rank":4,"wins":4,"losses":4}]},
     "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
    """

    private static let leagueMatchupUnavailableJSON = """
    {"contract_version":"league-overview.v1","platform":"yahoo","league_id":"1",
     "league_name":"Demo Slate (mock league)","season":2026,"week":8,
     "matchup":{"status":"unavailable","you":null,"opponent":null,
       "unavailable_reason":"provider_unsupported"},
     "standings":{"status":"available",
       "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
       "teams":[{"team_name":"Demo Titans","is_current_user":true,"rank":3,"wins":6,"losses":1}]},
     "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
    """

    private static let tradeVerdictJSON = """
    {"contract_version":"trade-compare.v2","verdict_state":"favors_you",
     "evaluability":{"status":"evaluable","reason":null,"missing_projection_count":0,"total_player_count":2},
     "analysis_context":{"mode":"personalized","platform":"sleeper","league_id":"1",
       "league_name":"Demo Slate (mock league)","applied":["scoring_format","roster_construction"],
       "unavailable_reason":null},
     "net_value":4.2,"explanation":null}
    """

    private var omenState: OmenDecisionBriefState {
        switch scenarioKey {
        case "omen.demo": return OmenDecisionFixtures.demo
        // The capture obligation from `capability-expression-v1.md`: a profile is not covered by
        // a screenshot of its success state, because nothing is missing in a success state.
        case "omen.degraded": return OmenDecisionFixtures.degraded
        default: return OmenDecisionFixtures.realDisconnected
        }
    }
}

/// Server-shaped fixtures shared by the third frame of each J3 pass. They are decoded through
/// the production transport type so the captures fail loudly if the client and route drift.
private enum J3ScreenshotFixtures {
    static let nominalStartSit = decode("""
    {"contract_version":"start-sit-detail.v2","state":"clear_decision","message":null,
     "platform":"espn","league_id":"fixture-league","league_name":"Sample League",
     "team_name":"Sample Team","season":2026,"week":7,"scoring_format":"half_ppr",
     "recommendation":{"slot":"FLEX",
       "start":{"player_key":"sample-wr1","name":"Sample WR1","position":"WR","team":"Sample Team","projected_points":16.8,"status":"Active","kickoff":"Sun 1:00 PM"},
       "over":{"player_key":"sample-wr2","name":"Sample WR2","position":"WR","team":"Sample Team","projected_points":13.0,"status":"Active","kickoff":"Sun 4:25 PM"},
       "points_delta":3.8,"confidence":"confident"},
     "why":["The available projection and usage reads favor Sample WR1."],
     "what_could_change_this":["A late inactive designation would invalidate the recommendation."],
     "evidence":[
       {"category":"projection","kind":"projection","statement":"Sample WR1 projects 3.8 points higher."},
       {"category":"roster","kind":"verified","statement":"Both players are eligible for the flex slot."}],
     "alternatives":[],
     "capabilities":[
       {"name":"league_scoring","state":"live","used":true,"kind":"verified","source":"provider","statement":"Half-PPR scoring was read for the selected league."},
       {"name":"roster","state":"live","used":true,"kind":"verified","source":"provider","statement":"The selected roster was read successfully."},
       {"name":"player_projections","state":"live","used":true,"kind":"projection","source":"provider","statement":"Current-week projections were available."},
       {"name":"start_sit_inference","state":"live","used":true,"kind":"inference","source":"omen","statement":"The model compared the two eligible players."}]}
    """)

    static let degradedStartSit = decode("""
    {"contract_version":"start-sit-detail.v2","state":"incomplete_data",
     "message":"The provider returned league settings, but the current roster and projections were unavailable.",
     "platform":"espn","league_id":"fixture-league","league_name":"Sample League",
     "team_name":"Sample Team","season":2026,"week":7,"scoring_format":"half_ppr",
     "recommendation":null,"why":[],"what_could_change_this":[],"evidence":[],"alternatives":[],
     "capabilities":[
       {"name":"league_scoring","state":"live","used":false,"kind":"verified","source":"provider","statement":"Half-PPR scoring was read, but could not decide the call alone."},
       {"name":"roster","state":"unavailable","used":false,"kind":"limitation","source":"provider","statement":"The provider did not return the current roster.","reason_code":"provider_unavailable"},
       {"name":"player_projections","state":"unavailable","used":false,"kind":"limitation","source":"provider","statement":"Player projections could not be resolved.","reason_code":"provider_unavailable"},
       {"name":"start_sit_inference","state":"unavailable","used":false,"kind":"limitation","source":"omen","statement":"Omen did not run inference without the required inputs.","reason_code":"missing_inputs"},
       {"name":"weather","state":"not_requested","used":false,"kind":"limitation","source":null,"statement":null}]}
    """)

    /// E005–E012's context. Generic for the same reason the player names are: a capture that
    /// escapes into a deck must not read as a real person's league.
    static let context = OmenFirstCallContext(
        crest: "TTO",
        teamName: "Titans of Slopsilonia",
        platform: .espn,
        leagueName: "Slops Saloon",
        onSwitch: {},
        onAddLeague: {}
    )

    private static func decode(_ json: String) -> StartSitDetail {
        do {
            return try JSONDecoder().decode(StartSitDetail.self, from: Data(json.utf8))
        } catch {
            preconditionFailure("Malformed J3 screenshot fixture: \(error)")
        }
    }
}

/// Screenshot host for the §10.2 switcher. The sheet itself takes a view model, so this
/// supplies one backed by `StubLeagueDirectoryRepository` and renders the sheet's body
/// inline rather than as a presented sheet — a modal presentation does not appear in a
/// `simctl io screenshot` of the host window.
struct LeagueSwitcherScreenshotHost: View {
    enum Kind { case loaded, empty, failed }
    let kind: Kind

    @StateObject private var viewModel: LeagueSwitcherViewModel

    init(kind: Kind) {
        self.kind = kind
        let result: Result<LeagueDirectory, OmenApiError>
        switch kind {
        case .loaded: result = .success(LeagueSwitcherScreenshotHost.sampleDirectory())
        case .empty: result = .success(LeagueSwitcherScreenshotHost.emptyDirectory())
        case .failed: result = .failure(.network)
        }
        _viewModel = StateObject(wrappedValue: LeagueSwitcherViewModel(
            repository: StubLeagueDirectoryRepository(directory: result),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "screenshot", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 9_999_999_999
                )),
                nowEpochSeconds: { 0 }
            )
        ))
    }

    var body: some View {
        OmenLeagueSwitcherSheet(
            viewModel: viewModel,
            onSelected: { _ in },
            onConnectAnother: {},
            onManageConnections: {},
            onDismiss: {}
        )
    }

    private static func decode(_ json: String) -> LeagueDirectory {
        // Force-unwrapped deliberately: this is screenshot-only fixture data that ships with
        // the app, and a malformed fixture should fail loudly in a capture run rather than
        // render an empty screen that looks like a real empty state.
        try! JSONDecoder().decode(LeagueDirectory.self, from: Data(json.utf8))
    }

    /// Shared with `TeamSwitcherScreenshotHost` so both switcher captures describe the
    /// same user rather than drifting into two different fixture worlds.
    static func screenshotDirectory() -> LeagueDirectory { sampleDirectory() }

    private static func sampleDirectory() -> LeagueDirectory {
        decode("""
        {"contract_version":"league-directory.v1","season":2026,"selection_persistence":"provider_binding_only",
         "active":{"platform":"sleeper","league_id":"L-alpha","league_name":"Dynasty Dogs","season":2026,"scoring_format":"half_ppr","team_id":"3","team_name":"Justin Titans"},
         "platforms":[
          {"platform":"sleeper","connection_state":"connected","discovery":"full","notice":null,"leagues":[
            {"league_id":"L-alpha","league_name":"Dynasty Dogs","season":2026,"scoring_format":"half_ppr","team_id":"3","team_name":"Justin Titans","is_active":true},
            {"league_id":"L-fam","league_name":"Family League","season":2026,"scoring_format":"ppr","team_id":"5","team_name":"Titans Too","is_active":false}]},
          {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":"ESPN does not expose a league list to Omen, so only the connected league is shown.","leagues":[
            {"league_id":"884411","league_name":null,"season":2026,"scoring_format":null,"team_id":"9","team_name":"Sunday Scaries","is_active":false}]},
          {"platform":"yahoo","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]}]}
        """)
    }

    private static func emptyDirectory() -> LeagueDirectory {
        decode("""
        {"contract_version":"league-directory.v1","season":2026,"selection_persistence":"provider_binding_only",
         "active":null,
         "platforms":[
          {"platform":"sleeper","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]},
          {"platform":"espn","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]},
          {"platform":"yahoo","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]}]}
        """)
    }
}

/// Screenshot host for the 2026-09-05 team switcher: the pinned context bar and the sheet's
/// body, rendered together against one deterministic directory.
///
/// Both are shown inline. A presented `.sheet` does not appear in a `simctl io screenshot` of
/// the host window, and the bar is the half where the shipped defect lived — a scroll that ran
/// off the right edge with no pinned control — so a capture that showed only the sheet would
/// miss exactly what this change fixes.
///
/// One favourite is pre-seeded through the injected preferences store, because the ordering
/// rule and the platinum star are the two things a reviewer needs to *see* rather than read.
struct TeamSwitcherScreenshotHost: View {
    @StateObject private var viewModel: LeagueCarouselViewModel

    init() {
        let preferences = InMemoryLeagueSwitcherPreferences(
            // Sunday Scaries is the ESPN team and third in the server's order. Starring it
            // proves the sort actually moved it, which a favourite that was already first
            // could not.
            favorites: ["screenshot": LeagueFavorites(ordered: ["espn:884411"])]
        )
        _viewModel = StateObject(wrappedValue: LeagueCarouselViewModel(
            directoryRepository: StubLeagueDirectoryRepository(
                directory: .success(LeagueSwitcherScreenshotHost.screenshotDirectory())
            ),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "screenshot", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 9_999_999_999
                )),
                nowEpochSeconds: { 0 }
            ),
            preferences: preferences
        ))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step24) {
            OmenTeamPicker(viewModel: viewModel, userID: "screenshot", onContextChanged: { _ in }, onAddLeague: {})
                .padding(.horizontal, OmenSpacing.step16)
            OmenTeamSwitcherSheet(
                teams: teams,
                platformFilters: filters,
                selectedFilter: viewModel.selectedPlatform,
                notice: nil,
                // Live, not inert: the capture doubles as the manual check that a tap on the
                // star toggles without switching, and a tap on the row switches.
                onSelectFilter: { viewModel.selectedPlatform = $0 },
                onSelectTeam: { team in
                    guard let page = viewModel.allPages.first(where: { $0.id == team.id }) else { return }
                    Task { _ = await viewModel.commit(page) }
                },
                onToggleFavorite: { team in
                    guard let page = viewModel.allPages.first(where: { $0.id == team.id }) else { return }
                    viewModel.toggleFavorite(page)
                },
                onAddLeague: {}
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
        .task { await viewModel.load(userID: "screenshot") }
    }

    private var teams: [OmenSwitcherTeam] {
        viewModel.pages.map { page in
            OmenSwitcherTeam(
                id: page.id,
                platform: page.platform == "espn" ? .espn : (page.platform == "yahoo" ? .yahoo : .sleeper),
                teamName: page.teamName?.isEmpty == false ? page.teamName! : page.displayLeagueName,
                subtitle: Self.subtitle(page),
                isActive: page.isActive,
                isFavorite: viewModel.isFavorite(page),
                isCommitting: false
            )
        }
    }

    /// Mirrors `OmenTeamPicker.subtitle(_:)`. Kept in step deliberately: a capture that showed
    /// a different second line than the real screen would be a screenshot of something that does
    /// not exist.
    private static func subtitle(_ page: LeagueCarouselViewModel.Page) -> String {
        let provider = platformDisplayName(page.platform)
        guard page.teamName?.isEmpty == false else { return "\(provider) · unnamed team" }
        guard page.leagueName?.isEmpty == false else { return provider }
        return "\(provider) · \(page.displayLeagueName)"
    }

    private var filters: [OmenSwitcherPlatformFilter] {
        [OmenSwitcherPlatformFilter(id: LeagueCarouselViewModel.allPlatforms, label: "All", tone: .omen, count: viewModel.allPages.count)]
            + viewModel.availablePlatforms.map { platform in
                OmenSwitcherPlatformFilter(
                    id: platform,
                    label: platformDisplayName(platform),
                    tone: platform == "espn" ? .espn : (platform == "yahoo" ? .yahoo : .sleeper),
                    count: viewModel.allPages.filter { $0.platform == platform }.count
                )
            }
    }
}

/// Owns the carousel view model for the lifetime of the capture and kicks off its load.
private struct CarouselScenarioHost: View {
    var scenarioKey: String
    var failingPlatform: String?
    @StateObject private var viewModel: LeagueCarouselViewModel

    init(scenarioKey: String, failingPlatform: String? = nil) {
        self.scenarioKey = scenarioKey
        self.failingPlatform = failingPlatform
        _viewModel = StateObject(
            wrappedValue: CarouselFixtures.viewModel(failingPlatform: failingPlatform)
        )
    }

    var body: some View {
        // The scenario key was omitted here until 2026-09-17, so `commandState` fell through to
        // `default:` and every carousel capture rendered the DISCONNECTED Command Center beneath
        // a live carousel. Pass it, and the switch below resolves a connected state.
        FauxShell(scenarioKey: scenarioKey, carousel: viewModel)
            .task { await viewModel.load(userID: "fixture") }
    }
}

/// J2's fixtures.
///
/// Copy is taken **verbatim from the artboards** wherever the artboard has any, because on these
/// five screens the words are the design: `CommandQuiet` and `CommandQuietStraight` differ by two
/// sentences and nothing else, and paraphrasing either would erase the voice fence the pair
/// exists to draw.
///
/// Team and player names are the canvas's own invented ones. A capture that escapes into a deck
/// must not read as a real person's league.
enum J2ScreenshotFixtures {
    // MARK: Context

    static let titansContext = OmenScreenContext(
        crest: "TTO",
        teamName: "Titans of Slopsilonia",
        platform: .espn,
        leagueName: "Slops Saloon",
        onSwitch: {},
        onAddLeague: {}
    )

    /// The team being switched **to** on `SwitchLoading`.
    static let davantesContext = OmenScreenContext(
        crest: "DSI",
        teamName: "Davante\u{2019}s Inferno",
        platform: .espn,
        leagueName: "EB Football",
        onSwitch: {},
        onAddLeague: {}
    )

    // MARK: CommandCenter

    private static let waiverMove = OmenDeskWaiverMove(
        addName: "Jaylen Wright",
        addMeta: "RB · TEN",
        addPoints: "11.4",
        dropName: "Roschon Johnson",
        dropMeta: "RB · CHI",
        dropPoints: "4.1",
        reasoning: "Pollard\u{2019}s out three weeks and Wright took almost every backup snap. Roschon is behind two healthy backs — you won\u{2019}t miss him.",
        band: .confident,
        risk: .low,
        riskReason: nil
    )

    private static let ledgerLine = OmenDeskLedgerLine(
        summary: "Start Stafford over Daniels",
        meta: "This week · start / sit · you followed it",
        outcome: .pending
    )

    static let nominalDesk = OmenDeskState(
        weekLabel: "Week 7 · Sunday",
        deadlineLabel: "Lineups lock",
        deadlineTime: "1:00 PM",
        matchup: .read(OmenDeskMatchup(
            platform: .espn,
            status: "Live · Q2",
            leader: OmenDeskTeam(crest: "TTO", name: "Titans of Slopsilonia", record: "5–2 · you", score: "64.8", isMine: true),
            trailer: OmenDeskTeam(crest: "GMR", name: "Gibbs me some Rice", record: "6–1", score: "51.2", isMine: false),
            projection: "119.6 – 114.2",
            projectionNote: "Projected · 5.4 ahead",
            leadFraction: 0.66,
            watch: "Four of your starters left; two of theirs."
        )),
        railCount: 4,
        railIndex: 0,
        waiver: .read(waiverMove),
        ledger: .read(ledgerLine),
        // The nominal artboard has no foot line and neither does this. Nothing was unread and
        // nothing was read-and-ignored, so there is nothing honest to put there.
        footnote: nil
    )

    /// The degraded desk.
    ///
    /// Two classes are visible at once, which is the whole requirement:
    ///
    ///   - `league_matchup` is **unavailable** — named, with a sentence, in the board's own place.
    ///     It is not dropped to make room, because that is the one class the spec says must
    ///     survive truncation.
    ///   - `league_standings` is **live, used: false** — named in the foot line, `text-tertiary`,
    ///     with no evidence styling and no implication that it decided anything.
    ///
    /// The waiver card and the ledger line are untouched, and that is the point of the frame:
    /// a dead matchup read sits beside a live wire, and the screen says which is which.
    static let degradedDesk = OmenDeskState(
        weekLabel: "Week 7 · Sunday",
        deadlineLabel: "Lineups lock",
        deadlineTime: "1:00 PM",
        matchup: .unread(
            capability: "League matchup",
            sentence: "ESPN did not return this week\u{2019}s scoreboard, so Omen has no live score for you. The wire and the ledger below read normally."
        ),
        railCount: 4,
        railIndex: 0,
        waiver: .read(waiverMove),
        ledger: .read(ledgerLine),
        footnote: OmenDeskFootnote(
            text: "League standings were read and did not change this week\u{2019}s call.",
            emphasis: nil
        )
    )

    // MARK: SwitchSheet

    private static let switchFilters = [
        OmenSwitchFilter(id: "all", label: "All"),
        OmenSwitchFilter(id: "espn", label: "ESPN"),
        OmenSwitchFilter(id: "yahoo", label: "Yahoo"),
        OmenSwitchFilter(id: "sleeper", label: "Sleeper")
    ]

    /// Favourites first, then everything else — in the order the directory returned them.
    /// `orderPlatformsByFollowCount` is the single authority and clients must not re-sort, so
    /// these arrays are written in final order and the screen never touches them.
    private static let switchGroups = [
        OmenSwitchGroup(title: "Favourites", rows: [
            OmenSwitchRow(id: "tto", crest: "TTO", teamName: "Titans of Slopsilonia", subtitle: "ESPN", isFavorite: true, isActive: true),
            OmenSwitchRow(id: "dsi", crest: "DSI", teamName: "Davante\u{2019}s Inferno", subtitle: "ESPN · EB Football", isFavorite: true, isActive: false)
        ]),
        OmenSwitchGroup(title: "All teams", rows: [
            OmenSwitchRow(id: "pak", crest: "PAK", teamName: "Puk Around & Find Out", subtitle: "ESPN · Fantasy Madness", isFavorite: false, isActive: false),
            // The artboard's own honest row: a league the provider named and a team it did not.
            // "unnamed team" is the fallback and it is the caller's to decide, never the row's.
            OmenSwitchRow(id: "dar", crest: "DAR", teamName: "League 884411", subtitle: "unnamed team", isFavorite: false, isActive: false)
        ])
    ]

    static let nominalSwitchSheet = OmenSwitchSheetState(
        filters: switchFilters,
        selectedFilterID: "espn",
        groups: switchGroups
    )

    static let degradedSwitchSheet = OmenSwitchSheetState(
        filters: switchFilters,
        selectedFilterID: "espn",
        groups: switchGroups,
        // Named rather than silently absent. A user whose Yahoo teams vanished from this list
        // would conclude they had lost them.
        notice: "Yahoo did not answer, so any Yahoo teams are missing from this list. Your ESPN teams are all here."
    )

    // MARK: SwitchLoading

    static let switchingFootnote = OmenDeskFootnote(
        text: "Reading Davante\u{2019}s Inferno from ESPN.",
        emphasis: "The previous team\u{2019}s numbers are gone, not reused."
    )

    // MARK: Quiet week

    static let quietNeutral = OmenQuietState(
        variant: .neutral,
        weekLabel: "Week 8 · Bye",
        headline: "Nothing worth waking you for.",
        body: "You\u{2019}re on bye, your roster is healthy, and nobody on your waiver wire is worth a claim. Genuinely — go outside.",
        band: .confident,
        risk: .low,
        nextRead: "Next read · Tuesday 3:00 AM waivers",
        footnote: OmenDeskFootnote(
            text: "3rd of 12, two games clear of the cut. Trade deadline in three weeks.",
            emphasis: nil
        )
    )

    static let quietStraight = OmenQuietState(
        variant: .straight,
        weekLabel: "Week 9 · After a loss",
        headline: "Rough week. Nothing worth moving for.",
        body: "You lost by four, Achane is out, and there is nobody on the wire who fixes that. Holding is the call.",
        band: .confident,
        risk: .low,
        nextRead: "Next read · Tuesday 3:00 AM waivers",
        footnote: OmenDeskFootnote(
            text: "5th of 12. One game off the cut with six to play.",
            emphasis: nil
        )
    )
}

/// J4, "settling an argument" — the fixtures behind the eight Trade captures.
///
/// ## The pass split, and why it is not arbitrary
///
/// Four frames per pass, five screens, and two of the five appear in only one pass each. That is
/// the same shape J2 used and it is the contract rather than a convenience.
///
/// `TradeVerdict` is the nominal pass's third frame and `TradeNeedsContext` is the degraded
/// pass's. They are the *same seat* in the journey — the answer — in the two states
/// `trade-compare.v2` can return it in. A read whose inputs did not all arrive cannot produce a
/// confident verdict, so `TradeVerdict` cannot honestly occur in a degraded pass; and
/// `close_needs_context` is not a failure, so it has no business being drawn as one.
///
/// ## What makes the degraded pass degraded
///
/// `capability-expression-v1.md` asks a degraded pass to show **both** of the two classes that
/// are easy to conflate: something Omen could not read at all, and something it read and did not
/// use. Every degraded frame here carries both.
///
///   - `Roster availability` — **unavailable**, named with the server's own sentence.
///   - `Schedule strength` — **live, `used: false`**, named and explicitly not claimed as
///     evidence.
///
/// `not_requested` appears nowhere, which is the fourth class rendering as nothing. It is
/// modelled by the input never existing, so there is no fixture for it to be forgotten in.
///
/// ## Facts of record pinned by these fixtures, not decorated by them
///
///   - `max_teams: 2`, `three_team.supported: false`,
///     `reason: "multi_team_comparison_not_implemented"`. The `Add team` chip renders
///     **unavailable** on both Build frames — not hidden and not working.
///   - `TradeRoster`'s degraded frame is `permanentlyUnavailable`. A provider that will not hand
///     over the other teams' rosters is a **permanent limit, not an outage**, so there is no
///     retry fixture here and there must never be one.
///   - `TradeShare`'s names toggle is **off by default** on the card, in both passes.
///   - Confidence is a **band**, never a percentage, and no fixture here carries a number at all.
enum J4ScreenshotFixtures {

    // MARK: Context

    /// The same team J2's desk runs as, so the switcher bar above J4 reads continuous with the
    /// destination a user actually arrived from.
    static let titansContext = OmenScreenContext(
        crest: "TTO",
        teamName: "Titans of Slopsilonia",
        platform: .espn,
        leagueName: "Slops Saloon",
        onSwitch: {},
        onAddLeague: {}
    )

    // MARK: Capability

    static let twoTeamsOnly = OmenTradeCapability(
        maxTeams: 2,
        threeTeamSupported: false,
        threeTeamReason: "multi_team_comparison_not_implemented"
    )

    // MARK: Partners and filters

    static let partners: [OmenTradePartner] = [
        OmenTradePartner(id: "dsi", crest: "DSI", name: "Davante\u{2019}s Inferno", need: "Needs RB"),
        OmenTradePartner(id: "gmr", crest: "GMR", name: "Gibbs me some Rice", need: "No hole"),
        // `need` is nil, not "No hole". Nobody read this roster, and "No hole" for a roster
        // nobody read is a claim about a roster nobody read.
        OmenTradePartner(id: "puk", crest: "PUK", name: "Puk Around & Find Out", need: nil)
    ]

    /// The artboard's six, including its `.fc.smart` one.
    ///
    /// "Fills my RB hole" rather than "Buy low": `.fc.smart` is a filter that names a
    /// **conclusion** rather than a position, and a conclusion about *this* roster is what makes
    /// it a different kind of control. "Buy low" is a category, which is what the plain chips
    /// already are.
    static let filters: [OmenTradeFilter] = [
        OmenTradeFilter(id: "all", title: "All"),
        OmenTradeFilter(id: "qb", title: "QB"),
        OmenTradeFilter(id: "rb", title: "RB"),
        OmenTradeFilter(id: "wr", title: "WR"),
        OmenTradeFilter(id: "te", title: "TE"),
        OmenTradeFilter(id: "fills-rb", title: "Fills my RB hole", isSmart: true)
    ]

    // MARK: Inputs

    private static let usedRosterNeed = OmenTradeInput(
        capability: "Roster need",
        statement: "Your RB2 slot has averaged 6.1 since Pollard went out.",
        presentation: .used
    )

    private static let usedLeagueScoring = OmenTradeInput(
        capability: "League scoring",
        statement: "Half PPR, and it read your league's own settings.",
        presentation: .used
    )

    /// Class 2 — read, and explicitly **not** claimed as evidence.
    private static let scheduleReadNotUsed = OmenTradeInput(
        capability: "Schedule strength",
        statement: "Omen has it. The two schedules are close enough that it did not move this call.",
        presentation: .readNotUsed
    )

    /// Class 3 — could not read, **named**. Never dropped to make room.
    private static let rosterUnavailable = OmenTradeInput(
        capability: "Roster availability",
        statement: "ESPN did not return the other team\u{2019}s roster for this league.",
        presentation: .couldNotRead
    )

    // MARK: Sides

    static let sides: [OmenTradeSide] = [
        OmenTradeSide(heading: "You send", legs: [
            OmenTradeLeg(direction: .sending, name: "Jaylen Waddle", meta: "WR · MIA", rank: "WR 21")
        ]),
        OmenTradeSide(heading: "Davante\u{2019}s Inferno sends", legs: [
            OmenTradeLeg(direction: .receiving, name: "Tony Pollard", meta: "RB · TEN", rank: "RB 18"),
            // Deliberately unranked. `rank` is optional and nil renders nothing — an em dash in
            // that column reads as a rank of zero rather than as an absence.
            OmenTradeLeg(direction: .receiving, name: "Jaylen Wright", meta: "RB · TEN", rank: nil)
        ])
    ]

    // MARK: Reads

    static let nominalRead = OmenTradeRead(
        headline: "Take it.",
        reasoning: "You are deep at receiver and thin at back, and this trade fixes the side that is costing you points. Pollard is the starter again and Wright is the handcuff, so you get the backfield either way it breaks.",
        caveat: "Scored against Slops Saloon\u{2019}s settings and your roster.",
        isPersonalized: true,
        inputs: [usedRosterNeed, usedLeagueScoring, scheduleReadNotUsed]
    )

    static let degradedRead = OmenTradeRead(
        headline: "Too close to call blind.",
        reasoning: "On value this is a coin flip, and the thing that would break the tie — what the other team is actually short of — is the thing Omen could not read here. Forcing a verdict on half the inputs would be a guess wearing a verdict\u{2019}s clothes.",
        caveat: "Standard scoring — not your league\u{2019}s settings. Need usually decides a trade, and need is what standard scoring cannot see.",
        isPersonalized: false,
        inputs: [usedLeagueScoring, scheduleReadNotUsed, rosterUnavailable]
    )

    // MARK: Submission

    /// Omen never submits on anyone\u{2019}s behalf, so the screen says how to do it there.
    static let submission = OmenTradeSubmission(
        title: "How to send this",
        caption: "ESPN · handoff only",
        steps: [
            "Open ESPN, then League \u{203A} Players \u{203A} Davante\u{2019}s Inferno.",
            "Propose Waddle for Pollard and Wright.",
            "Come back here once they answer and Omen will read the counter."
        ]
    )

    // MARK: TradeBuild

    static let nominalBuild = OmenTradeBuildState(
        kicker: "Two teams",
        title: "Build a deal",
        // The artboard's two tabs, not "Build"/"Rosters". `Type a trade` is the shipped
        // `OmenTradeScreen` path and `Build a trade` is this journey — the split is real
        // product, and both `TradeBuild` and `TradeRoster` draw it with the same tab on.
        tabTitles: ["Type a trade", "Build a trade"],
        selectedTabIndex: 1,
        partners: partners,
        selectedPartnerID: "dsi",
        filters: filters,
        selectedFilterID: "all",
        capability: twoTeamsOnly,
        sides: sides,
        read: nominalRead,
        submission: submission,
        primaryActionTitle: "Get Omen\u{2019}s read"
    )

    static let degradedBuild = OmenTradeBuildState(
        kicker: "Two teams",
        title: "Build a deal",
        // The artboard's two tabs, not "Build"/"Rosters". `Type a trade` is the shipped
        // `OmenTradeScreen` path and `Build a trade` is this journey — the split is real
        // product, and both `TradeBuild` and `TradeRoster` draw it with the same tab on.
        tabTitles: ["Type a trade", "Build a trade"],
        selectedTabIndex: 1,
        partners: partners,
        selectedPartnerID: "dsi",
        filters: filters,
        selectedFilterID: "all",
        capability: twoTeamsOnly,
        sides: sides,
        read: degradedRead,
        // No submission block. The handoff steps come from `trade-capabilities.v1`'s
        // `submission` field, and this pass is the one where that read did not land — inventing
        // three ESPN steps here would be the screen claiming a capability it does not have.
        submission: nil,
        primaryActionTitle: "Get Omen\u{2019}s read"
    )

    // MARK: TradeRoster

    static let nominalRoster = OmenTradeRosterState(
        kicker: "Build a deal",
        title: "Their roster",
        tabTitles: ["Type a trade", "Build a trade"],
        selectedTabIndex: 1,
        partners: partners,
        selectedPartnerID: "dsi",
        filters: filters,
        selectedFilterID: "rb",
        capability: twoTeamsOnly,
        rosters: .read(
            teamName: "Davante\u{2019}s Inferno",
            playerCount: 16,
            rows: [
                OmenTradeRosterState.Row(
                    id: "pollard",
                    name: "Tony Pollard",
                    meta: "RB · TEN · RB 18",
                    availability: .added
                ),
                OmenTradeRosterState.Row(
                    id: "wright",
                    name: "Jaylen Wright",
                    meta: "RB · TEN · unranked",
                    availability: .available
                ),
                OmenTradeRosterState.Row(
                    id: "gibbs",
                    name: "Jahmyr Gibbs",
                    meta: "RB · DET · RB 3",
                    availability: .theyNeedThis
                )
            ],
            freshness: "Rosters read 6 minutes ago"
        ),
        note: "Gibbs is greyed because they are as thin at back as you are. Omen will still score it if you ask, but they will not take it."
    )

    /// Fact of record #16, rendered.
    ///
    /// The provider will not hand over the other teams' rosters for this league, so **Omen
    /// issues no trade call at all** — and that is a permanent provider limit, not an outage.
    /// There is no retry control on this frame and there must never be one: a retry says "try
    /// again later", and later is not a thing that helps here.
    static let degradedRoster = OmenTradeRosterState(
        kicker: "Build a deal",
        title: "Their roster",
        tabTitles: ["Type a trade", "Build a trade"],
        selectedTabIndex: 1,
        partners: partners,
        selectedPartnerID: "dsi",
        filters: filters,
        selectedFilterID: "rb",
        capability: twoTeamsOnly,
        rosters: .permanentlyUnavailable(
            capability: "Opponent rosters",
            sentence: "ESPN does not give Omen the other teams\u{2019} rosters in this league, so there is no trade call to make here. This will not change by trying again."
        ),
        note: nil
    )

    // MARK: TradeVerdict

    /// The screen title is **"The read"**, not the verdict.
    ///
    /// The first build put `compare.headline` in both the screen title and the read block, so
    /// "Take it." appeared twice on one screen. The artboard does not: `.ttl` names the screen
    /// and `.verdh` carries the call, which is also the only arrangement that survives a
    /// headline long enough to wrap.
    static let verdict = OmenTradeVerdictState(
        kicker: "Two teams",
        title: "The read",
        sides: sides,
        read: nominalRead,
        submission: submission,
        primaryActionTitle: "How to send this",
        counterActionTitle: "Build a counter",
        shareActionTitle: "Share this read"
    )

    // MARK: TradeNeedsContext

    /// Same rule as `verdict`: the screen is titled, the call is in the read block.
    static let needsContext = OmenTradeNeedsContextState(
        kicker: "Two teams",
        title: "Not yet",
        sides: sides,
        read: degradedRead,
        remedy: "Connect the league Omen already has for you and it can score this against your own settings instead of standard scoring.",
        connectActionTitle: "Connect this league",
        showAnywayActionTitle: "Show the standard-scoring read anyway"
    )

    // MARK: TradeShare

    /// **Names off by default.** `trade-share.v1` — a 30-day hash, no auth, no provider data.
    /// The default lives here because the screen does not set it: whoever builds the state owns
    /// it, and a default that lives in a view is a default nobody can test.
    private static let inclusions: [OmenTradeShareState.Inclusion] = [
        OmenTradeShareState.Inclusion(
            id: "verdict",
            title: "The call and the reasoning",
            detail: "What Omen said and why.",
            isOn: true
        ),
        OmenTradeShareState.Inclusion(
            id: "names",
            title: "Team names",
            detail: "Off by default. Your league-mates\u{2019} names do not leave Omen unless you turn this on.",
            isOn: false
        ),
        OmenTradeShareState.Inclusion(
            id: "caveat",
            title: "The caveat",
            detail: "Travels on the card itself, so a screenshot cannot lose it.",
            isOn: true
        )
    ]

    private static let card = OmenTradeShareState.Card(
        eyebrow: "Omen\u{2019}s read",
        headline: "Take it.",
        reasoning: "Deep at receiver, thin at back. This trade fixes the side that is costing points.",
        caveat: "Scored against one league\u{2019}s settings. Your league may score it differently.",
        footer: "omen · link expires in 30 days"
    )

    static let nominalShare = OmenTradeShareState(
        kicker: "Send the read",
        title: "Share this call",
        card: card,
        inclusions: inclusions,
        note: "The link carries the read and nothing else — no login, no league, no provider data. It expires after 30 days and cannot be renewed.",
        primaryActionTitle: "Create the link",
        secondaryActionTitle: "Copy as text",
        failure: nil
    )

    /// `POST /api/trade/share` answered 503. That is the **share storage** failing, which is a
    /// different thing from a trade Omen could not read, and the copy says which one it is.
    static let degradedShare = OmenTradeShareState(
        kicker: "Send the read",
        title: "Share this call",
        card: card,
        inclusions: inclusions,
        note: "The link carries the read and nothing else — no login, no league, no provider data. It expires after 30 days and cannot be renewed.",
        primaryActionTitle: "Create the link",
        secondaryActionTitle: "Copy as text",
        failure: "Omen could not create a link just now. The read above is unaffected — this is the sharing service, not the call."
    )
}

// MARK: - J5 fixtures

/// J5's six frames.
///
/// The two states that hinge on `waiver_system` are **decoded by the production parser** from
/// server-shaped JSON, which is J3's pattern and the right one here: `WaiverNotDetermined` exists
/// precisely because a client can mistake "system unknown" for "FAAB with no budget", and a
/// hand-built Swift literal would prove the screen renders without proving the parser ever
/// produces that state. The table fixtures are literals, as J2's are, because the Table screen's
/// mapper is exercised by the real League destination rather than by a capture.
enum J5ScreenshotFixtures {

    // MARK: Context

    static let titansContext = OmenScreenContext(
        crest: "TTO",
        teamName: "Titans of Slopsilonia",
        platform: .espn,
        leagueName: "Slops Saloon",
        onSwitch: {},
        onAddLeague: {}
    )

    /// The Yahoo league, which is where both permanent-limit frames live. Yahoo is a live,
    /// entitled provider — this is a limit of what it exposes for this league type, not a
    /// statement about the provider's availability.
    static let pukContext = OmenScreenContext(
        crest: "PAK",
        teamName: "Puk Around & Find Out",
        platform: .yahoo,
        leagueName: "Fantasy Madness",
        onSwitch: {},
        onAddLeague: {}
    )

    // MARK: The table

    private static let tableRows: [OmenScoutTableRow] = [
        OmenScoutTableRow(rank: 1, crest: "GMR", teamName: "Gibbs me some Rice", form: [true, true, false, true, true], record: "6\u{2013}1", isMine: false),
        OmenScoutTableRow(rank: 2, crest: "PAK", teamName: "Puk Around & Find Out", form: [true, false, true, true, true], record: "5\u{2013}2", isMine: false),
        OmenScoutTableRow(rank: 3, crest: "TTO", teamName: "Titans of Slopsilonia", form: [true, true, true, false, true], record: "5\u{2013}2", isMine: true),
        OmenScoutTableRow(rank: 4, crest: "DSI", teamName: "Davante\u{2019}s Inferno", form: [false, false, true, false, true], record: "4\u{2013}3", isMine: false),
        OmenScoutTableRow(rank: 5, crest: "CHB", teamName: "Chubb Rock", form: [false, true, false, false, false], record: "3\u{2013}4", isMine: false)
    ]

    private static let tradeTargets = [
        OmenScoutTradeTarget(crest: "DSI", teamName: "Davante\u{2019}s Inferno", read: "Thin at RB, three startable receivers. You have the reverse."),
        OmenScoutTradeTarget(crest: "CHB", teamName: "Chubb Rock", read: "3\u{2013}4 and fading. Two backs on byes in weeks 9 and 11.")
    ]

    private static let waiverMove = OmenDeskWaiverMove(
        addName: "Jaylen Wright",
        addMeta: "RB \u{00B7} TEN",
        addPoints: "11.4",
        dropName: "Roschon Johnson",
        dropMeta: "RB \u{00B7} CHI",
        dropPoints: "4.1",
        reasoning: "Pollard is out three weeks and Roschon sits behind two healthy backs \u{2014} you are not losing anything you will miss.",
        band: .confident,
        risk: .low,
        riskReason: nil
    )

    /// `LeagueTable.dc.html`.
    ///
    /// The cut line is present because this fixture is a league whose playoff settings were
    /// actually read. On ESPN that is **not** generally true — `settings_known` is `true` on
    /// Sleeper only — so the real mapper drops the line on this provider and this frame is a
    /// capture of the line's composition rather than a claim that ESPN supplies it.
    static let nominalTable = OmenScoutTableState(
        weekLabel: "Week 7 \u{00B7} 12 teams",
        notice: nil,
        strip: .read(OmenScoutStrip(platform: .espn, myScore: "64.8", theirScore: "51.2", status: "Live \u{00B7} Q2")),
        table: .read(tableRows),
        cutLine: OmenScoutCutLine(afterRank: 4, label: "Playoff cut"),
        tradeTargets: .read(tradeTargets),
        waiver: .read(waiverMove),
        activity: .read([
            OmenScoutActivityRow(category: "Standings", text: "Two teams are tied for the final playoff spot."),
            OmenScoutActivityRow(category: "Standings", text: "You are one game from the playoff cut line.")
        ]),
        // Partial, and the sentence says which half is missing. ESPN does not give Omen
        // transactions today, so the list is real and incomplete at the same time.
        activityUnreadNote: "Transactions unavailable for ESPN right now \u{2014} adds, drops and trades are not in this list, which is unread rather than empty.",
        footnote: nil,
        retryTitle: nil
    )

    /// `LeagueDegraded.dc.html` — the `league` profile's degraded pass.
    ///
    /// Two sections live, two unread, and **each section says which it is** rather than the page
    /// showing one banner and hoping. Both required classes are visible at once:
    ///
    ///   - `trade_rosters` and `league_activity` are `unavailable` — named, each with a sentence,
    ///     each in its own section's place. Neither is dropped to make room.
    ///   - `league_scoring` is `live, used: false` — named in the foot line, `text-tertiary`,
    ///     with no evidence styling and no implication that it decided anything.
    ///
    /// `not_requested` inputs render nowhere at all, which is why there is no "playoff settings"
    /// row: this profile never asked for them.
    static let degradedTable = OmenScoutTableState(
        weekLabel: "Week 7 \u{00B7} 12 teams",
        notice: "ESPN is returning partial data right now. Two sections below are live and two are not. Each one says which it is.",
        strip: .read(OmenScoutStrip(platform: .espn, myScore: "64.8", theirScore: "51.2", status: "Live \u{00B7} Q2")),
        table: .read(Array(tableRows.prefix(3))),
        // Absent, because a partial ESPN read is exactly the case where playoff settings are
        // unproven. Drawing the line here would put a playoff claim on a degraded screen.
        cutLine: nil,
        tradeTargets: .unread(
            capability: "Trade rosters",
            sentence: "Reading other managers\u{2019} rosters needs a call ESPN is currently refusing. Omen issues no trade read without rosters \u{2014} it will not name a team it has not read."
        ),
        waiver: .read(waiverMove),
        activity: .unread(
            capability: "League activity",
            sentence: "Adds, drops and trades are not in this list. The list is not empty \u{2014} it is unread, and those are different things."
        ),
        activityUnreadNote: nil,
        footnote: OmenDeskFootnote(
            text: "League scoring settings were read and did not change anything on this screen.",
            emphasis: nil
        ),
        // A retry is legitimate here and only here: a refusing provider may stop refusing.
        retryTitle: "Retry ESPN"
    )

    /// `LeagueNoRosters.dc.html`.
    ///
    /// A **permanent provider limit for this league**, not an outage — which is why the section
    /// uses `providerLimit` rather than `unread`, why the section header reads "Not possible
    /// here" rather than "Unavailable", and why `retryTitle` is nil. `CONTRACTS.md` is explicit:
    /// "Do not build a retry for it."
    static let noRostersTable = OmenScoutTableState(
        weekLabel: "Week 7 \u{00B7} 10 teams",
        notice: nil,
        strip: .read(OmenScoutStrip(platform: .yahoo, myScore: "78.4", theirScore: "81.9", status: "Live \u{00B7} Q3")),
        table: .read([
            OmenScoutTableRow(rank: 1, crest: "RGB", teamName: "Regulation Blondes", form: [true, true, true, false, true], record: "5\u{2013}1", isMine: false),
            OmenScoutTableRow(rank: 2, crest: "PAK", teamName: "Puk Around & Find Out", form: [true, false, true, true, true], record: "4\u{2013}2", isMine: true),
            OmenScoutTableRow(rank: 3, crest: "MKM", teamName: "Mike\u{2019}s Marauders", form: [false, true, true, false, true], record: "4\u{2013}2", isMine: false)
        ]),
        cutLine: nil,
        tradeTargets: .providerLimit(
            capability: "Trade rosters",
            sentence: "Yahoo does not expose other managers\u{2019} rosters for this league. Without them Omen cannot see who needs what, so it makes no trade read at all rather than guessing from the standings.",
            consequence: "This is a permanent limit of the provider for this league type, not an outage. Omen\u{2019}s weekly call for this team will be a start/sit or a waiver move, never a trade. Everything else on this screen is unaffected."
        ),
        waiver: .read(waiverMove),
        activity: .read([
            OmenScoutActivityRow(category: "Standings", text: "Two teams are tied at 4\u{2013}2 behind the leader.")
        ]),
        activityUnreadNote: nil,
        footnote: nil,
        retryTitle: nil
    )

    // MARK: The wire

    /// `LeagueWaiver.dc.html` — decoded, so the FAAB gate is proven rather than asserted.
    static let nominalWire: OmenScoutWireState = OmenScoutWireState.from(
        analysis: decodeWaiver(nominalWaiverJSON),
        weekLabel: "Week 7 \u{00B7} Waiver"
    )

    /// `WaiverNotDetermined.dc.html` — the `waiver` profile's degraded pass.
    ///
    /// The payload says `"system": "not_determined"`, which is what ESPN and Yahoo return today.
    /// The screen therefore shows **no** budget and **no** claim order — not a dashed one, not a
    /// greyed one, none — and names the three answers it is withholding.
    ///
    /// The foot line carries the `live, used: false` half: the roster read succeeded and did not
    /// decide anything here, because the player read does not depend on the waiver system.
    static let notDeterminedWire: OmenScoutWireState = {
        var state = OmenScoutWireState.from(
            analysis: decodeWaiver(notDeterminedWaiverJSON),
            weekLabel: "Week 7 \u{00B7} Waiver"
        )
        state = OmenScoutWireState(
            weekLabel: state.weekLabel,
            processLabel: state.processLabel,
            processTime: state.processTime,
            system: state.system,
            notice: state.notice,
            body: state.body,
            footnote: OmenDeskFootnote(
                text: "Your roster was read and did not change any of this \u{2014} the player read above does not depend on the waiver system.",
                emphasis: nil
            )
        )
        return state
    }()

    /// `WaiverNoMove.dc.html` — the one J5 artboard declared a **fit**.
    ///
    /// A literal rather than a decode, and the reason is a gap worth naming: the artboard draws a
    /// **watch list** ("Jaylen Wright, if Pollard sits") and `waiver-analysis.v1` carries no such
    /// field. Under the 2026-09-18 precedence rule the artboard's shape is binding and its
    /// literal strings are not, so the block is built and the strings are fixture copy — and the
    /// missing contract field is reported rather than quietly dropped or quietly invented.
    static let noMoveWire = OmenScoutWireState(
        weekLabel: "Week 7 \u{00B7} Waiver",
        processLabel: nil,
        processTime: nil,
        system: .faab(budgetText: "Your budget $63 of $100", orderText: "Claim order 7 of 12"),
        notice: nil,
        body: .noMove(
            headline: "Nothing on this wire beats what you have.",
            body: "Omen checked all 143 free agents against your nine starting slots. The best of them projects 1.2 points above your weakest starter, which is noise.",
            costTitle: "What it would have cost",
            cost: "Claiming the best available means dropping Tyjae Spears, who is one Pollard injury from being startable. Doing nothing is the move this week.",
            band: .confident,
            risk: .low,
            watchTitle: "Watch list",
            watching: [
                OmenScoutWireRow(title: "Jaylen Wright", detail: "RB \u{00B7} TEN \u{00B7} if Pollard sits", status: .watching),
                OmenScoutWireRow(title: "Cade Otton", detail: "TE \u{00B7} TB \u{00B7} if Godwin misses week 8", status: .watching)
            ]
        ),
        footnote: OmenDeskFootnote(
            text: "Next read Tuesday 3:00 AM. Omen will wake you only if something changes.",
            emphasis: nil
        )
    )

    // MARK: Server-shaped payloads

    private static func decodeWaiver(_ json: String) -> WaiverAnalysis {
        // A fixture that cannot decode is a contract drift, and it should stop a capture rather
        // than quietly render an empty screen. This is J3's rule and the crash is deliberate.
        try! JSONDecoder().decode(WaiverAnalysis.self, from: Data(json.utf8))
    }

    private static let nominalWaiverJSON = """
    {
      "contract_version": "waiver-analysis.v1",
      "state": "confirmed_opportunity",
      "deadline": "Tue 3:00 AM",
      "waiver_system": {
        "system": "faab",
        "budget_text": "Your budget $63 of $100",
        "order_text": "Claim order 7 of 12"
      },
      "best_move": {
        "add": { "name": "Jaylen Wright", "position": "RB", "team": "TEN", "projected_points": 11.4 },
        "drop": { "name": "Roschon Johnson", "position": "RB", "team": "CHI", "projected_points": 4.1 },
        "improvement": 7.3,
        "why_now": "Pollard is out three weeks and Wright took almost every backup snap on Sunday. Roschon sits behind two healthy backs \\u2014 you will not miss him.",
        "bid": { "amount": 14, "basis": "two managers ahead of you need a back" }
      },
      "alternatives": [
        {
          "player": { "name": "Jalen McMillan", "position": "WR", "team": "TB", "projected_points": 9.2 },
          "improvement": 2.1,
          "tradeoff": "Projects 2.2 points below Wright against your lineup. Take this one only if you lose the Wright claim."
        },
        {
          "player": { "name": "Cade Otton", "position": "TE", "team": "TB", "projected_points": 8.1 },
          "improvement": 1.4,
          "tradeoff": "There is no defensible drop for this one. Everyone on your bench is either starting somewhere or worth more than Otton. Named rather than forced."
        }
      ]
    }
    """

    /// Note what is **absent**: no `bid`, and `system` is `not_determined`.
    ///
    /// `bid` being absent rather than `{"amount": 0}` is the contract's own rule — null, never
    /// zero, when any input is missing — and this payload is the case that rule was written for.
    private static let notDeterminedWaiverJSON = """
    {
      "contract_version": "waiver-analysis.v1",
      "state": "confirmed_opportunity",
      "waiver_system": { "system": "not_determined" },
      "best_move": {
        "add": { "name": "Jaylen Wright", "position": "RB", "team": "TEN", "projected_points": 11.4 },
        "improvement": 7.3,
        "why_now": "Wright took almost every backup snap on Sunday."
      },
      "alternatives": [
        {
          "player": { "name": "Jalen McMillan", "position": "WR", "team": "TB", "projected_points": 9.2 },
          "improvement": 2.1,
          "tradeoff": "The next best claim if the first one does not land."
        }
      ]
    }
    """
}

/// J6 — `Ledger.dc.html` and `LedgerDetail.dc.html`, as deterministic in-app fixtures.
///
/// ## The Ledger's rule is narrower than the general honesty rule, and these fixtures exist to
/// prove it holds
///
/// `CONTRACTS.md`: *"verified outcomes, self-reported action, and unknown follow-through stay
/// visually and semantically separate."* A fixture set that only contained verified rows would
/// photograph beautifully and prove nothing. So `nominalLedger` deliberately carries all three
/// on one screen:
///
///   - a verified `.followed` row with a verified outcome,
///   - a `.passed(.selfReported)` row — the dotted registry §2.3 carrier,
///   - and an `.unknown` row, whose follow-through nobody knows.
///
/// ## Why no fixture carries a raw `win` or `loss`
///
/// It is not expressible. `OmenLedgerOutcome` has no such case, which is the point of the type:
/// the translation happens in `MovesHistory.ledgerOutcome(for:)` and a raw token cannot reach a
/// screen state. `MovesHistoryTests` pins the mapping; there is nothing for a fixture to add.
enum J6ScreenshotFixtures {

    // MARK: Context

    static let titansContext = OmenScreenContext(
        crest: "TTO",
        teamName: "Titans of Slopsilonia",
        platform: .espn,
        leagueName: "Slops Saloon",
        onSwitch: {},
        onAddLeague: {}
    )

    static let pukContext = OmenScreenContext(
        crest: "PAK",
        teamName: "Puk Around & Find Out",
        platform: .yahoo,
        leagueName: "Fantasy Madness",
        onSwitch: {},
        onAddLeague: {}
    )

    // MARK: Ledger — nominal

    /// `Ledger.dc.html`, with the artboard's own rows.
    ///
    /// The artboard's second row is `You passed` + `Self-reported`, and it is the one row on the
    /// screen whose action Omen did not observe. Keeping it here — rather than promoting it to a
    /// verified pass because it photographs cleaner — is the whole journey.
    static let nominalLedger = OmenLedgerState(
        kicker: "11 calls",
        groups: [
            OmenLedgerGroup(
                title: "Week 7",
                count: "1 open",
                calls: [
                    OmenLedgerCall(
                        id: "j6-w7-1",
                        summary: "Start Stafford over Daniels",
                        callType: "Start / sit",
                        action: .followed(.verified),
                        outcome: .pending,
                        note: nil
                    ),
                    OmenLedgerCall(
                        id: "j6-w7-2",
                        summary: "Claim Wright, drop Johnson",
                        callType: "Waiver",
                        action: .passed(.selfReported),
                        outcome: .notVerified,
                        note: "Wright went for 94 and a score. Somebody else claimed him Wednesday."
                    )
                ]
            ),
            OmenLedgerGroup(
                title: "Weeks 1\u{2013}6",
                count: "9 closed",
                calls: [
                    OmenLedgerCall(
                        id: "j6-w6-1",
                        summary: "Trade Kupp for Nacua",
                        callType: "Trade",
                        action: .followed(.verified),
                        outcome: .worked,
                        note: nil
                    ),
                    OmenLedgerCall(
                        id: "j6-w4-1",
                        summary: "Bench Kyren Williams, Week 4",
                        callType: "Start / sit",
                        action: .followed(.verified),
                        outcome: .didNotWork,
                        note: "He went for 21.4. Omen was wrong \u{2014} the snap-share read didn\u{2019}t survive the game script."
                    ),
                    OmenLedgerCall(
                        id: "j6-w3-1",
                        summary: "Claim Tank Dell, Week 3",
                        callType: "Waiver",
                        action: .followed(.verified),
                        outcome: .worked,
                        note: nil
                    )
                ]
            )
        ],
        unread: nil,
        footnote: nil
    )

    // MARK: Ledger — degraded

    /// The degraded pass: one input `unavailable`, one `live, used: false`.
    ///
    /// `move_outcomes` unavailable is the one that costs the reader something, so it is named
    /// with a sentence and placed above the rows where truncation cannot reach it. Every row in
    /// this pass therefore reads `Not verified` — which is a true statement about what Omen
    /// could read, not a claim that the calls failed.
    ///
    /// The third row's `.unknown` action is the case that exists so an unread follow-through
    /// never renders as an empty slot a reader completes as "followed".
    static let degradedLedger = OmenLedgerState(
        kicker: "4 calls",
        groups: [
            OmenLedgerGroup(
                title: "Week 7",
                count: "2 open",
                calls: [
                    OmenLedgerCall(
                        id: "j6-d-1",
                        summary: "Start Pollard over Mostert",
                        callType: "Start / sit",
                        action: .followed(.selfReported),
                        outcome: .notVerified,
                        note: nil
                    ),
                    OmenLedgerCall(
                        id: "j6-d-2",
                        summary: "Claim Jaylen Wright",
                        callType: "Waiver",
                        action: .unknown,
                        outcome: .pending,
                        note: "Yahoo did not hand back the transaction, so Omen does not know whether you made this move."
                    )
                ]
            ),
            OmenLedgerGroup(
                title: "Week 6",
                count: "2 closed",
                calls: [
                    OmenLedgerCall(
                        id: "j6-d-3",
                        summary: "Trade Chubb for Etienne",
                        callType: "Trade",
                        action: .passed(.selfReported),
                        outcome: .notVerified,
                        note: nil
                    ),
                    OmenLedgerCall(
                        id: "j6-d-4",
                        summary: "Bench Zay Flowers, Week 6",
                        callType: "Start / sit",
                        action: .unknown,
                        outcome: .notVerified,
                        note: nil
                    )
                ]
            )
        ],
        unread: OmenLedgerUnread(
            capability: "Move outcomes",
            sentence: "Omen could not read how these calls turned out for this league. Every row below says \u{201C}Not verified\u{201D} because nobody checked \u{2014} not because the call was wrong."
        ),
        footnote: OmenDeskFootnote(
            text: "League scoring was read and did not change any row here.",
            emphasis: "did not change any row here"
        )
    )

    // MARK: LedgerDetail — nominal

    /// `LedgerDetail.dc.html`, the artboard's own receipt: the Week 4 Kyren Williams bench.
    ///
    /// It is a **loss**, and that is the artboard's choice, not an accident of fixture picking.
    /// The screen's closing line is *"Losses stay in the Ledger — a record that only shows wins
    /// is marketing."* A nominal capture of a winning receipt would make that sentence
    /// decorative.
    ///
    /// `issuedLabel` is built through `OmenLedgerReceiptState.issuedLabel(issuedAt:timezone:)`
    /// from a real timestamp and a real zone rather than hard-coded, so the fixture exercises
    /// the formatter that `CONTRACTS.md`'s `issued_at_timezone` clause exists for.
    static let nominalReceipt = OmenLedgerReceiptState(
        kicker: "Week 4 \u{00B7} Start / sit",
        issuedLabel: OmenLedgerReceiptState.issuedLabel(
            issuedAt: "2026-09-29T07:00:00Z",
            timezone: "America/New_York"
        ),
        callType: "Start / sit",
        headline: "Bench Kyren Williams",
        reasoning: "Snap share fell to 54% over two weeks while Blake Corum climbed to 38%.",
        band: .leaning,
        risk: .medium,
        riskReason: nil,
        status: "Closed",
        action: .followed(.verified),
        outcome: .didNotWork,
        noteLead: "Williams went for 21.4.",
        note: "Omen was wrong. The snap-share read was accurate and did not survive the game script \u{2014} the Rams trailed by seventeen and abandoned the committee.",
        evidence: [
            OmenReceiptEvidence(
                key: "Snaps",
                statement: "54% over two weeks, down from 71%.",
                kind: .used
            ),
            OmenReceiptEvidence(
                key: "Corum",
                statement: "38% and rising in the same window.",
                kind: .used
            ),
            OmenReceiptEvidence(
                key: "Game script",
                statement: "Not modelled. Omen had no view of this and it is what decided the game.",
                kind: .couldNotRead
            )
        ],
        fairnessNote: "This receipt is frozen as it was issued. Losses stay in the Ledger \u{2014} a record that only shows wins is marketing."
    )

    // MARK: LedgerDetail — degraded

    /// The degraded receipt. Two things are wrong with it and they are different kinds of wrong.
    ///
    ///   1. `schedule_strength` was **read and not used** — `live, used: false`. It is named,
    ///      de-emphasised, and carries **no** `Live` chip, because the chip is evidence styling
    ///      and this input is not evidence for this call.
    ///   2. `opponent_roster` was **unavailable**. Named, with a sentence, dashed.
    ///
    /// And the receipt arrived with `issued_at` but **no `issued_at_timezone`**, so the scope
    /// line says the zone is missing rather than rendering a bare UTC wall-clock that would read
    /// as the wrong day to anyone west of Greenwich. That is `issuedLabel`'s refusal, captured.
    static let degradedReceipt = OmenLedgerReceiptState(
        kicker: "Week 6 \u{00B7} Waiver",
        issuedLabel: OmenLedgerReceiptState.issuedLabel(
            issuedAt: "2026-10-13T07:00:00Z",
            timezone: nil
        ),
        callType: "Waiver",
        headline: "Claim Jaylen Wright",
        reasoning: nil,
        band: nil,
        risk: nil,
        riskReason: nil,
        status: "Open",
        action: .unknown,
        outcome: .notVerified,
        noteLead: nil,
        note: "Yahoo did not hand back the transaction log for this week, so Omen cannot say whether you made this claim.",
        evidence: [
            OmenReceiptEvidence(
                key: "Depth chart",
                statement: "Pollard out three weeks; Wright the only back behind him.",
                kind: .used
            ),
            OmenReceiptEvidence(
                key: "Schedule strength",
                statement: "Read, and it did not move this call.",
                kind: .readNotUsed
            ),
            OmenReceiptEvidence(
                key: "Opponent roster",
                statement: "Unavailable. Yahoo does not expose other teams\u{2019} rosters for this league type, so Omen had no view of who else needed a back.",
                kind: .couldNotRead
            )
        ],
        fairnessNote: "This receipt is frozen as it was issued. Losses stay in the Ledger \u{2014} a record that only shows wins is marketing."
    )
}
