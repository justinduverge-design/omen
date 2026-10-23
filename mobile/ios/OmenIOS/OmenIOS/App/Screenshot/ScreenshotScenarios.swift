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
        "trade.verdict": ScreenshotScenario(
            label: "Trade — personalized verdict",
            content: { AnyView(FauxShell(scenarioKey: "trade.verdict", initialTab: .trade)) }
        ),
        "trade.empty": ScreenshotScenario(
            label: "Trade — no offer entered yet",
            content: { AnyView(FauxShell(scenarioKey: "trade.empty", initialTab: .trade)) }
        ),
        // Find a trade is the Trade tab's front door (the front page above carries it); these two
        // are the swipe review it opens, on fixtures: a real-shaped batch, and the honest
        // unavailable state for a provider that gives Omen no projections.
        // The offer Omen's own trade call filled in ("Review this trade" on the Omen tab).
        "trade.prefilled": ScreenshotScenario(
            label: "Trade — offer filled in from Omen's trade call",
            content: { AnyView(FauxShell(scenarioKey: "trade.prefilled", initialTab: .trade)) }
        ),
        "trade.find-review": ScreenshotScenario(
            label: "Trade — Find a trade, one swap",
            content: { AnyView(FindReviewScenarioHost(unavailableReason: nil)) }
        ),
        "trade.find-unavailable": ScreenshotScenario(
            label: "Trade — Find a trade, provider has no projections",
            content: { AnyView(FindReviewScenarioHost(unavailableReason: "projections_unavailable", platform: "yahoo")) }
        ),
        // The Desk on the foundation (2026-10-21).
        "desk.ready": ScreenshotScenario(label: "Desk \u{2014} three teams, a move, needs, your team", content: { AnyView(DeskScenario(phase: .ready)) }),
        "desk.loading": ScreenshotScenario(label: "Desk \u{2014} reading leagues", content: { AnyView(DeskScenario(phase: .loading)) }),
        "desk.no-league": ScreenshotScenario(label: "Desk \u{2014} no league yet", content: { AnyView(DeskScenario(phase: .noLeague)) }),
        "desk.failed": ScreenshotScenario(label: "Desk \u{2014} leagues could not be read", content: { AnyView(DeskScenario(phase: .failed(message: "We couldn\u{2019}t reach Omen. Check your connection and try again."))) }),
        "desk.demo": ScreenshotScenario(label: "Desk \u{2014} demo", content: { AnyView(DeskScenario(phase: .ready, demo: true)) }),
        "player.page": ScreenshotScenario(label: "Player \u{2014} Omen's read first", content: { AnyView(NavigationStack { OmenPlayerScreen(page: FoundationFixtures.pukaPage, tradeTitle: "Shop Puka Nacua in a trade", onTrade: {}) }) }),
        "trade.chooser": ScreenshotScenario(label: "Trade \u{2014} chooser", content: { AnyView(OmenTradeChooserView(teamControl: ("espn", "Titans"), onFind: {}, onBuild: {}, onJudge: {})) }),
        "trade.builder": ScreenshotScenario(label: "Trade \u{2014} builder, your roster", content: { AnyView(NavigationStack { OmenTradeBuilderScreen(state: FoundationFixtures.builder, onToggle: { _, _ in }, onRemove: { _, _ in }, onSwitchPartner: { _ in }, onOpenPlayer: { _ in }, onJudge: {}) }) }),
        "trade.builder-theirs": ScreenshotScenario(label: "Trade \u{2014} builder, their roster", content: { AnyView(NavigationStack { OmenTradeBuilderScreen(state: FoundationFixtures.builder, onToggle: { _, _ in }, onRemove: { _, _ in }, onSwitchPartner: { _ in }, onOpenPlayer: { _ in }, onJudge: {}, showingTheirs: true) }) }),
        "trade.three-team": ScreenshotScenario(label: "Trade \u{2014} three-team, who sends what", content: { AnyView(NavigationStack { OmenThreeTeamScreen(state: FoundationFixtures.threeTeam(judged: false), onPickThird: { _ in }, onRemoveThird: {}, onSend: { _, _, _ in }, onOpenPlayer: { _ in }, onJudge: {}, onAdjust: {}, onToggleStep: { _ in }, onCopyStep: { _ in }, onOpenProvider: {}) }) }),
        "trade.three-team-judged": ScreenshotScenario(label: "Trade \u{2014} three-team judged", content: { AnyView(NavigationStack { OmenThreeTeamScreen(state: FoundationFixtures.threeTeam(judged: true), onPickThird: { _ in }, onRemoveThird: {}, onSend: { _, _, _ in }, onOpenPlayer: { _ in }, onJudge: {}, onAdjust: {}, onToggleStep: { _ in }, onCopyStep: { _ in }, onOpenProvider: {}) }) }),
        "foundation.players": ScreenshotScenario(label: "Foundation v1: player pieces", content: { AnyView(FoundationPlayersGallery()) }),
        "foundation.teams": ScreenshotScenario(label: "Foundation v1: team pieces and states", content: { AnyView(FoundationTeamsGallery()) }),
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
        "omen.hold": ScreenshotScenario(
            label: "Omen — Hold call with ranked reasons, best alternative and projection coverage",
            content: { AnyView(FauxShell(scenarioKey: "omen.hold", initialTab: .omen)) }
        ),
        "omen.hold-no-projections": ScreenshotScenario(
            label: "Omen — Yahoo league with no projections: cannot rank a move",
            content: { AnyView(FauxShell(scenarioKey: "omen.hold-no-projections", initialTab: .omen)) }
        ),
        "omen.trade-call": ScreenshotScenario(
            label: "Omen — trade call: who you send, who you get, partner, Review this trade",
            content: { AnyView(FauxShell(scenarioKey: "omen.trade-call", initialTab: .omen)) }
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
                AnyView(j3Shell(AnyView(OmenCallView(state: OmenDecisionFixtures.journeyNominal, weekLabel: "Week 7", providerName: "ESPN", onMakeMove: {}, onReviewTrade: { _ in }, onFindOtherTrades: {}))))
            }
        ),
        "journey-j3.nominal.02-omen-evidence": ScreenshotScenario(
            label: "J3 nominal 2/3 — full argument",
            content: {
                AnyView(j3Shell(AnyView(OmenFullArgumentScreen(payload: OmenDecisionFixtures.journeyNominalPayload))))
            }
        ),
        "journey-j3.nominal.03-start-sit": ScreenshotScenario(
            label: "J3 nominal 3/3 — inline Start/Sit detail",
            content: {
                AnyView(j3Shell(AnyView(OmenCallView(state: OmenDecisionFixtures.journeyNominal, startSit: J3ScreenshotFixtures.nominalStartSit, weekLabel: "Week 7", providerName: "ESPN", onMakeMove: {}, onReviewTrade: { _ in }, onFindOtherTrades: {}))))
            }
        ),
        "journey-j3.degraded.01-omen-call": ScreenshotScenario(
            label: "J3 degraded 1/3 — Omen call",
            content: {
                AnyView(j3Shell(AnyView(OmenCallView(state: OmenDecisionFixtures.degraded, weekLabel: "Week 7", providerName: "ESPN", onMakeMove: {}, onReviewTrade: { _ in }, onFindOtherTrades: {}))))
            }
        ),
        "journey-j3.degraded.02-omen-evidence": ScreenshotScenario(
            label: "J3 degraded 2/3 — unavailable and unused inputs",
            content: {
                AnyView(j3Shell(AnyView(OmenFullArgumentScreen(payload: OmenDecisionFixtures.journeyDegradedPayload))))
            }
        ),
        "journey-j3.degraded.03-start-sit": ScreenshotScenario(
            label: "J3 degraded 3/3 — inline incomplete Start/Sit read",
            content: {
                AnyView(j3Shell(AnyView(OmenCallView(state: OmenDecisionFixtures.degraded, startSit: J3ScreenshotFixtures.degradedStartSit, weekLabel: "Week 7", providerName: "ESPN", onMakeMove: {}, onReviewTrade: { _ in }, onFindOtherTrades: {}))))
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
        "journey-j2.nominal.02-switch-sheet": ScreenshotScenario(
            label: "J2 nominal 2/4 — the switcher sheet over the desk",
            content: { AnyView(j2Shell(AnyView(OmenSwitchSheetOverlay(
                state: J2ScreenshotFixtures.nominalSwitchSheet,
                onSelectFilter: { _ in },
                onSelectRow: { _ in },
                onToggleFavorite: { _ in },
                onDismiss: {},
                backdrop: {
                    DeskScenario(phase: .ready)
                }
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
                    DeskScenario(phase: .ready)
                }
            )))) }
        ),
        "league.root": ScreenshotScenario(label: "League \u{2014} the tab root", content: { AnyView(OmenLeagueView(state: FoundationFixtures.league(degraded: false), teamControl: ("espn", "Titans of Slopsilonia"), onOpenWaivers: {})) }),
        "waivers.move": ScreenshotScenario(label: "Waivers \u{2014} the one add", content: { AnyView(NavigationStack { OmenWaiversScreen(state: FoundationFixtures.waivers(move: true), onOpenProvider: {}) }) }),
        "journey-j4.nominal.01-trade-build": ScreenshotScenario(label: "J4 nominal 1/4 \u{2014} build a deal, third team available", content: { AnyView(NavigationStack { OmenTradeBuilderScreen(state: FoundationFixtures.builder, onToggle: { _, _ in }, onRemove: { _, _ in }, onSwitchPartner: { _ in }, onOpenPlayer: { _ in }, onJudge: {}, onThreeTeam: {}) }) }),
        "journey-j4.nominal.02-trade-roster": ScreenshotScenario(label: "J4 nominal 2/4 \u{2014} three-team, who sends what", content: { AnyView(NavigationStack { OmenThreeTeamScreen(state: FoundationFixtures.threeTeam(judged: false), onPickThird: { _ in }, onRemoveThird: {}, onSend: { _, _, _ in }, onOpenPlayer: { _ in }, onJudge: {}, onAdjust: {}, onToggleStep: { _ in }, onCopyStep: { _ in }, onOpenProvider: {}) }) }),
        "journey-j4.nominal.03-trade-verdict": ScreenshotScenario(
            label: "J4 nominal 3/4 — the read, both sides and the caveat",
            content: { AnyView(j4Shell(AnyView(OmenTradeVerdictSheet(kind: .verdict(J4ScreenshotFixtures.verdict), providerName: "ESPN", onAdjust: {}, onOpenProvider: {}, onShare: {})))) }
        ),
        "journey-j4.nominal.04-trade-share": ScreenshotScenario(
            label: "J4 nominal 4/4 — share the read, names off by default",
            content: { AnyView(j4Shell(AnyView(OmenTradeShareSheet(state: J4ScreenshotFixtures.nominalShare, onToggle: { _ in }, onShare: {}, onCopy: {}, onDone: {})))) }
        ),
        "journey-j4.degraded.01-trade-build": ScreenshotScenario(label: "J4 degraded 1/4 \u{2014} three-team judged, set it up by hand", content: { AnyView(NavigationStack { OmenThreeTeamScreen(state: FoundationFixtures.threeTeam(judged: true), onPickThird: { _ in }, onRemoveThird: {}, onSend: { _, _, _ in }, onOpenPlayer: { _ in }, onJudge: {}, onAdjust: {}, onToggleStep: { _ in }, onCopyStep: { _ in }, onOpenProvider: {}) }) }),
        "journey-j4.degraded.02-trade-roster": ScreenshotScenario(label: "J4 degraded 2/4 \u{2014} no opponent rosters", content: { AnyView(OmenStateBlock(kind: .notEnoughToGoOn, title: "Omen can\u{2019}t see the other teams yet", message: "Omen can't read the other teams' rosters for this provider yet.", actionTitle: "Judge an offer instead", action: {}).padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)) }),
        "journey-j4.degraded.03-trade-needs-context": ScreenshotScenario(
            label: "J4 degraded 3/4 — too close to call blind, and it says which input is missing",
            content: { AnyView(j4Shell(AnyView(OmenTradeVerdictSheet(kind: .needsContext(J4ScreenshotFixtures.needsContext), onAdjust: {}, onConnect: {})))) }
        ),
        "journey-j4.degraded.04-trade-share": ScreenshotScenario(
            label: "J4 degraded 4/4 — the share service failed, and the read did not",
            content: { AnyView(j4Shell(AnyView(OmenTradeShareSheet(state: J4ScreenshotFixtures.degradedShare, onToggle: { _ in }, onShare: {}, onCopy: {}, onDone: {})))) }
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
        "journey-j5.nominal.01-league-table": ScreenshotScenario(label: "J5 nominal 1/3 \u{2014} League: table, targets, the wire, the week", content: { AnyView(OmenLeagueView(state: FoundationFixtures.league(degraded: false), teamControl: ("espn", "Titans of Slopsilonia"), onOpenWaivers: {})) }),
        "journey-j5.nominal.02-league-waiver": ScreenshotScenario(label: "J5 nominal 2/3 \u{2014} Waivers: the one add", content: { AnyView(NavigationStack { OmenWaiversScreen(state: FoundationFixtures.waivers(move: true), onOpenProvider: {}) }) }),
        "journey-j5.nominal.03-waiver-no-move": ScreenshotScenario(label: "J5 nominal 3/3 \u{2014} Waivers: nothing worth doing", content: { AnyView(NavigationStack { OmenWaiversScreen(state: FoundationFixtures.waivers(move: false), onOpenProvider: {}) }) }),
        "journey-j5.degraded.01-league-degraded": ScreenshotScenario(label: "J5 degraded 1/3 \u{2014} League without standings or rosters", content: { AnyView(OmenLeagueView(state: FoundationFixtures.league(degraded: true), teamControl: ("espn", "Titans of Slopsilonia"), onOpenWaivers: {})) }),
        "journey-j5.degraded.02-league-no-rosters": ScreenshotScenario(label: "J5 degraded 2/3 \u{2014} League, other rosters unreadable", content: { AnyView(OmenLeagueView(state: FoundationFixtures.league(degraded: true), teamControl: ("espn", "Titans of Slopsilonia"), onOpenWaivers: {})) }),
        "journey-j5.degraded.03-waiver-not-determined": ScreenshotScenario(label: "J5 degraded 3/3 \u{2014} Waivers, no bid sent", content: { AnyView(NavigationStack { OmenWaiversScreen(state: FoundationFixtures.waivers(move: false), onOpenProvider: {}) }) }),
        "journey-j6.nominal.01-ledger": ScreenshotScenario(label: "J6 nominal 1/2 \u{2014} the Ledger", content: { AnyView(NavigationStack { OmenLedgerScreen(state: FoundationFixtures.ledger(graded: true)) }) }),
        "journey-j6.nominal.02-ledger-detail": ScreenshotScenario(label: "J6 nominal 2/2 \u{2014} one receipt", content: { AnyView(NavigationStack { OmenLedgerReceiptScreen(state: FoundationFixtures.receipt(closed: true)) }) }),
        "journey-j6.degraded.01-ledger": ScreenshotScenario(label: "J6 degraded 1/2 \u{2014} the Ledger before any graded call", content: { AnyView(NavigationStack { OmenLedgerScreen(state: FoundationFixtures.ledger(graded: false)) }) }),
        "journey-j6.degraded.02-ledger-detail": ScreenshotScenario(label: "J6 degraded 2/2 \u{2014} an open receipt", content: { AnyView(NavigationStack { OmenLedgerReceiptScreen(state: FoundationFixtures.receipt(closed: false)) }) }),
        "ledger.root": ScreenshotScenario(label: "Ledger \u{2014} the season record", content: { AnyView(NavigationStack { OmenLedgerScreen(state: FoundationFixtures.ledger(graded: true)) }) }),
        "ledger.receipt": ScreenshotScenario(label: "Ledger receipt \u{2014} one call, frozen", content: { AnyView(NavigationStack { OmenLedgerReceiptScreen(state: FoundationFixtures.receipt(closed: true)) }) }),
        // ----------------------------------------------------------------------------------
        // Chrome. `Account.dc.html` and `ReportPill.dc.html` — the last two artboards.
        //
        // The keys are `chrome.*`, **not** `journey-*`, and that is not a naming preference.
        // `screen-journeys-v1.md` places both of these screens outside the six journeys
        // because they are reachable from anywhere, so there is no order a user meets them in
        // and no contact sheet to build. A `journey-` key here would assert a storyboard that
        // was never observed.
        //
        // For the same reason there is no nominal/degraded pair. A degraded pass needs a
        // capability profile to degrade, and chrome has none. What is here instead is **one
        // scenario per state that genuinely exists** — four for Account, four for the pill.
        "chrome.account.connected": ScreenshotScenario(
            label: "Account \u{2014} three leagues, three providers",
            content: { AnyView(ChromeFixtures.account(.loaded(ChromeFixtures.connections))) }
        ),
        "chrome.account.no-leagues": ScreenshotScenario(
            label: "Account \u{2014} signed in, nothing connected",
            content: { AnyView(ChromeFixtures.account(.none)) }
        ),
        // The honest state the Account screen most easily gets wrong. A directory read that
        // fails renders as an EMPTY list unless something stops it, and an empty list on this
        // screen reads as "your leagues were disconnected".
        "chrome.account.connections-unavailable": ScreenshotScenario(
            label: "Account \u{2014} connections unread, not empty",
            content: { AnyView(ChromeFixtures.account(.unavailable)) }
        ),
        // Where export and delete actually live. The artboard draws the `Privacy & data` row
        // and not the screen behind it, so this composition is built rather than drawn, and is
        // recorded as drift.
        "chrome.account.privacy": ScreenshotScenario(
            label: "Account \u{2014} privacy and data, export beside delete",
            content: { AnyView(ChromeFixtures.privacyAndData()) }
        ),
        // The destructive control's own state: the phrase gate with nothing typed into it,
        // which is the state a user is in when they arrive at it.
        //
        // **The required phrase is `delete`, not `DELETE MY OMEN DATA`.** The founder shortened
        // it on 2026-09-03 (`src/routes/userPrivacy.js`, `AccountDeletion`); the long phrase is
        // kept *accepted* by the server for already-installed clients and is no longer what any
        // client asks for. `CONTRACTS.md`'s `Account` row still says the old one — see the
        // handoff. The screen renders `AccountDeletion.requiredPhrase` rather than a literal,
        // so it cannot drift from whatever the constant says.
        "chrome.account.delete-confirmation": ScreenshotScenario(
            label: "Account \u{2014} the delete phrase gate, unconfirmed",
            content: { AnyView(ChromeFixtures.deleteGate()) }
        ),
        // Walk-1 (2026-10-11): the passkey offer in the system sheet's own chrome, and the About /
        // Data sources screen that carries the nflverse CC BY 4.0 credit.
        "passkey.offer": ScreenshotScenario(
            label: "Passkey offer \u{2014} system sheet, copy fully visible",
            content: { AnyView(PasskeyOfferScenarioHost()) }
        ),
        "account.about-data-sources": ScreenshotScenario(
            label: "About & data sources \u{2014} nflverse credit, provider data is the user's own",
            content: { AnyView(NavigationStack { OmenSourcesScreen() }) }
        ),
        "account.how-calls": ScreenshotScenario(label: "How Omen makes a call", content: { AnyView(NavigationStack { OmenHowCallsScreen() }) }),
        "chrome.report-pill.composer": ScreenshotScenario(
            label: "Report pill \u{2014} the composer, showing exactly what it sends",
            content: { AnyView(ChromeFixtures.composer(.composing)) }
        ),
        // The two ends of one POST, and both are real. `201` is what the route returns when the
        // insert lands; `503 report_storage_unavailable` is what it returns when it does not —
        // which is the shape the storage gate produces today, since
        // `sql/2026-09-14_beta_reports_review.sql` is review-only until migration approval.
        "chrome.report-pill.sent": ScreenshotScenario(
            label: "Report pill \u{2014} received, with the server's own reference",
            content: { AnyView(ChromeFixtures.composer(.done(.received(id: "rpt_8f21c4")))) }
        ),
        "chrome.report-pill.not-saved": ScreenshotScenario(
            label: "Report pill \u{2014} not saved, said plainly",
            content: { AnyView(ChromeFixtures.composer(.done(.notSaved))) }
        ),
        // The REAL presented system sheet over a directory where every provider flags one league
        // `is_active` (as production does) while `active` names a single league: the capture must
        // show exactly one check mark.
        "switcher.real-sheet": ScreenshotScenario(
            label: "Team switcher — the system sheet, five teams over three providers, one check",
            content: { AnyView(RealSwitcherSheetScreenshotHost()) }
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
        // The retired Command screen carried six Waiver Watch states. The current v2 wire
        // contract has three different, server-backed meanings: confirmed opportunity,
        // no credible move, and waiver-system not determined. Only `no-credible-move` is the
        // same fact as one of the old keys, so it keeps its historical identity. Pending claim,
        // processed claim, player availability unknown, no connected league and off-season do
        // not have a current `waiver-analysis.v1` wire body; keeping their keys by relabelling a
        // different screen would create false evidence. The current equivalents that do exist
        // are already covered by the J5 journey scenarios immediately above.
        "waiver-watch.no-credible-move": ScreenshotScenario(label: "The wire \u{2014} no credible move", content: { AnyView(NavigationStack { OmenWaiversScreen(state: FoundationFixtures.waivers(move: false), onOpenProvider: {}) }) }),
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

    /// J4 opens on the Trade tab through the same Find / Build / Type mode control production
    /// uses. Mounting the inner journey screen directly hid Find a trade from every J4 capture
    /// even though it was available in the live destination.
    private static func j4Shell(_ content: AnyView) -> some View {
        FauxShell(
            initialTab: .trade,
            tradeContentOverride: AnyView(NavigationStack { content })
        )
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

/// Find a trade from fixtures (frame FindTrade): one swap, or the honest "unavailable" answer.
private struct FindReviewScenarioHost: View {
    var unavailableReason: String?
    var platform = "sleeper"

    var body: some View {
        NavigationStack {
            OmenFindTradeScreen(state: state, onOpenInBuilder: {}, onNext: {}, onRetry: {}, onOpenPlayer: { _ in }, onBack: {})
        }
    }

    private var state: OmenFindTradeState {
        if let unavailableReason {
            let copy = OmenFindTradeState.unavailableCopy(reason: unavailableReason, platform: platform)
            return OmenFindTradeState(phase: .unavailable(title: copy.title, message: copy.message, retry: false))
        }
        let flowers = OmenPlayerSummary(id: "zf", name: "Zay Flowers", position: "WR", team: "BAL", number: 4, omenPoints: 13.9, providerPoints: 13.1, providerName: "ESPN", grade: 77, lead: .omen)
        return OmenFindTradeState(
            phase: .reviewing(.init(
                id: "c1", partnerName: "Gibbs me some Rice", partnerNeed: "Needs WR",
                send: FoundationFixtures.smith, receive: flowers,
                yourGain: 1.9, theirGain: 2.4,
                theCatch: "Flowers has a Week 14 bye, your first playoff week."
            ), index: 0, total: 4),
            teamsRead: 9
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
                    DeskScenario(phase: .ready)
                }
            }
                .tabItem { CommandCenterTab.command.label }
            .tag(CommandCenterTab.command)

            Group {
                if let omenContentOverride {
                    omenContentOverride
                } else {
                    OmenCallView(state: omenState, weekLabel: "Week 7", providerName: "ESPN", onMakeMove: {}, onReviewTrade: { _ in }, onFindOtherTrades: {})
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
                    if ["trade.empty", "trade.prefilled", "trade.verdict"].contains(scenarioKey) {
                        NavigationStack {
                            OmenJudgeOfferScreen(
                                state: OmenJudgeOfferState(
                                    send: tradeOffer.send, receive: tradeOffer.receive,
                                    partners: FoundationFixtures.builder.partners, partnerID: FoundationFixtures.builder.partnerID,
                                    results: scenarioKey == "trade.empty" ? [
                                        .init(id: "rr", name: "Rashee Rice", position: "WR", team: "KC", owner: "on Gibbs me some Rice", isCorrection: false),
                                        .init(id: "rs", name: "Rashid Shaheed", position: "WR", team: "NO", owner: "free agent", isCorrection: false),
                                    ] : []
                                ),
                                onQuery: { _, _ in }, onAdd: { _, _ in }, onRemove: { _, _ in }, onSwitchPartner: { _ in }, onJudge: {},
                                side: .receive, query: scenarioKey == "trade.empty" ? "Rash" : ""
                            )
                        }
                    } else {
                        OmenTradeChooserView(onFind: {}, onBuild: {}, onJudge: {})
                    }
                }
            }
            .tabItem { CommandCenterTab.trade.label }
            .tag(CommandCenterTab.trade)

            Group {
                if let leagueContentOverride {
                    leagueContentOverride
                } else {
                    if case .loaded(let overview) = leagueState {
                        OmenLeagueView(state: OmenLeagueState(overview: overview, targets: [], targetsNote: nil, waiver: nil))
                    } else {
                        OmenLeagueView(state: OmenLeagueState(phase: .loading))
                    }
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

    private var tradeOffer: TradeOffer {
        if scenarioKey == "trade.prefilled" {
            return TradeOffer(
                send: [TradePlayer(name: "Sample WR1", position: "WR", team: "Sample Team", playerKey: "sample-wr1")],
                receive: [TradePlayer(name: "Sample RB1", position: "RB", team: "Sample Team", playerKey: "sample-rb1")]
            )
        }
        return scenarioKey == "trade.empty"
            ? TradeOffer(
                send: [TradePlayer(name: "Trey McBride", position: "TE", team: "ARI")],
                receive: [TradePlayer(name: "Jake Ferguson", position: "TE", team: "DAL")]
            )
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
        case "omen.hold": return OmenHoldScreenshotFixtures.hold
        case "omen.hold-no-projections": return OmenHoldScreenshotFixtures.noProjections
        case "omen.trade-call": return OmenTradeCallScreenshotFixtures.espnTrade
        default: return OmenDecisionFixtures.realDisconnected
        }
    }
}

/// A `trade_suggestion` envelope shaped like `mapTradeSuggestionToMvpMove` in `src/services/omen.js` (ESPN), decoded
/// through the production type so a capture fails loudly if the client and the route drift. Generic names only
/// (see `OmenDecisionFixtures`).
private enum OmenTradeCallScreenshotFixtures {
    static var espnTrade: OmenDecisionBriefState {
        let json = """
        {"contract_version":"omen-decision-brief.v3","state":"success","mode":"live","call_kind":"trade_suggestion",
         "answered_for":{"platform":"espn","league_id":"fixture-league","matched":true,"selection":"requested"},
         "signals":{"trade_rosters":{"status":"live","source":"espn_league_rosters",
           "message":"Candidate trade used the other ESPN rosters in this league, read with your connected account."}},
         "recommendation":{"id":"live_omen_trade_sample-wr1_sample-rb1","type":"trade_suggestion",
           "title":"Offer Sample WR1 for Sample RB1",
           "move":"Offer Sample WR1 to Sample Rivals for Sample RB1.",
           "trade":{"partner_team_name":"Sample Rivals","partner_team_id":"3",
             "give":[{"name":"Sample WR1","position":"WR","player_key":"sample-wr1"}],
             "receive":[{"name":"Sample RB1","position":"RB","player_key":"sample-rb1"}]},
           "primary_player":{"id":"sample-rb1","name":"Sample RB1","position":"RB","team":"Sample Team"},
           "comparison_player":{"id":"sample-wr1","name":"Sample WR1","position":"WR","team":"Sample Team"},
           "expected_value_delta":{"points":3.1,"label":"meaningful"},
           "confidence":{"score":62,"band":"leaning","label":"Leaning"},
           "risk":{"level":"medium","reasons":[
             "The other lineup improves by +1.4 as well, but that does not predict acceptance.",
             "This is a one-for-one, projection-backed candidate; packages, draft picks, and future weeks are not modeled."]},
           "explanation":{
             "summary":"Your best live trade candidate is Sample WR1 for Sample RB1.",
             "why_it_matters":"The swap adds +3.1 to your optimal weekly lineup while also improving Sample Rivals's lineup.",
             "risk":"A fair projected lineup gain is not a guarantee that the other manager will accept the offer.",
             "confidence":"Leaning. The roster and projection inputs are live, while acceptance behavior is not modeled."}}}
        """
        guard let envelope = try? JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data(json.utf8)) else {
            return .error("Trade call fixture failed to decode.", retry: nil)
        }
        return envelope.briefState()
    }
}

/// `empty` + `call_kind: hold` envelopes shaped like `test/contracts/fixtures/omen-decision-brief.v3/empty_hold*.json`,
/// decoded through the production type so a capture fails loudly if the client and the route drift.
private enum OmenHoldScreenshotFixtures {
    static var hold: OmenDecisionBriefState {
        decode("""
        {"contract_version":"omen-decision-brief.v3","state":"empty","mode":"live","call_kind":"hold",
         "answered_for":{"platform":"espn","league_id":"fixture-league","matched":true,"selection":"requested"},
         "explanation":{"summary":"No move clears the recommendation threshold this week."},
         "hold":{"kind":"hold","headline":"Hold your lineup this week",
           "summary":"Hold your lineup. The best alternative Omen found does not beat what you already have by enough to be worth the risk.",
           "reasons":[
             {"code":"best_swap_below_bar","text":"Sample WR1 already projects 0.2 points above Sample WR2 (12.0 vs 11.8), so benching Sample WR1 would cost you."},
             {"code":"no_fair_trade","text":"Omen searched 11 other rosters in this league for a one-for-one trade that improves both lineups and keeps the value fair. None cleared both."}],
           "best_alternative":{"kind":"start_sit","slot":"WR","start":{"name":"Sample WR2","projected":11.8},"sit":{"name":"Sample WR1","projected":12.0},"delta":-0.2,"threshold":0.5,"margin_to_threshold":0.7,
             "why_not":"Sample WR1 already projects 0.2 points above Sample WR2 (12.0 vs 11.8), so benching Sample WR1 would cost you."},
           "considered":[
             {"kind":"start_sit","outcome":"below_threshold","detail":"Sample WR1 already projects 0.2 points above Sample WR2, so benching Sample WR1 would cost you."},
             {"kind":"waiver_pickup","outcome":"not_needed","detail":"None of your starters is ruled out, so no waiver pickup was needed."},
             {"kind":"trade_suggestion","outcome":"none_found","detail":"Omen searched 11 other rosters for a one-for-one trade that improves both lineups and keeps the value fair. None cleared both."}],
           "projections":{"available":true,"players_with_projection":14,"players_total":16},"threshold_points":0.5}}
        """)
    }

    static var noProjections: OmenDecisionBriefState {
        decode("""
        {"contract_version":"omen-decision-brief.v3","state":"empty","mode":"live","call_kind":"hold",
         "answered_for":{"platform":"yahoo","league_id":"fixture-league","matched":true,"selection":"requested"},
         "hold":{"kind":"hold","headline":"Hold your lineup this week","summary":"Hold your lineup.",
           "reasons":[{"code":"projections_unavailable","text":"Yahoo does not give Omen weekly projections for this league, so Omen cannot rank lineup swaps or trades. Holding is the only call it can stand behind."}],
           "best_alternative":null,
           "considered":[
             {"kind":"start_sit","outcome":"unavailable","detail":"No weekly projections from Yahoo, so no swap could be scored."},
             {"kind":"waiver_pickup","outcome":"not_needed","detail":"None of your starters is ruled out, so no waiver pickup was needed."},
             {"kind":"trade_suggestion","outcome":"unavailable","reason":"projections_unavailable","detail":"Yahoo does not give Omen weekly projections, so a trade cannot be weighed."}],
           "projections":{"available":false,"players_with_projection":0,"players_total":16},"threshold_points":0.5}}
        """)
    }

    private static func decode(_ json: String) -> OmenDecisionBriefState {
        guard let envelope = try? JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data(json.utf8)) else {
            return .error("Hold fixture failed to decode.", retry: nil)
        }
        return envelope.briefState()
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

/// Presents the production `OmenTeamPicker` sheet, not an inline imitation of it.
struct RealSwitcherSheetScreenshotHost: View {
    @StateObject private var viewModel: LeagueCarouselViewModel
    @State private var presented = true

    init() {
        let json = """
        {"contract_version":"league-directory.v1","season":2026,"selection_persistence":"provider_binding_only",
         "active":{"platform":"yahoo","league_id":"Y1","league_name":"Puk Around","season":2026,"team_id":"2","team_name":"Puk Around & Find Out"},
         "platforms":[
          {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":null,"leagues":[
            {"league_id":"E1","league_name":"EB Football","season":2026,"team_id":"8","team_name":"Titans of Slopsilonia","is_active":true},
            {"league_id":"E2","league_name":"Fantasy Madness","season":2026,"team_id":"3","team_name":"Davante\u{2019}s Inferno","is_active":false},
            {"league_id":"884411","league_name":null,"season":2026,"team_id":"9","team_name":null,"is_active":false}]},
          {"platform":"sleeper","connection_state":"connected","discovery":"full","notice":null,"leagues":[
            {"league_id":"S1","league_name":"Omen App Data","season":2026,"team_id":"1","team_name":"Hall Pass Heroes","is_active":true}]},
          {"platform":"yahoo","connection_state":"connected","discovery":"full","notice":null,"leagues":[
            {"league_id":"Y1","league_name":"Puk Around","season":2026,"team_id":"2","team_name":"Puk Around & Find Out","is_active":true}]}]}
        """
        let directory = try! JSONDecoder().decode(LeagueDirectory.self, from: Data(json.utf8))
        _viewModel = StateObject(wrappedValue: LeagueCarouselViewModel(
            directoryRepository: StubLeagueDirectoryRepository(directory: .success(directory)),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "screenshot", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 9_999_999_999
                )),
                nowEpochSeconds: { 0 }
            ),
            preferences: InMemoryLeagueSwitcherPreferences(
                favorites: ["screenshot": LeagueFavorites(ordered: ["espn:E1"])]
            )
        ))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenTeamPicker(
                viewModel: viewModel, userID: "screenshot", onContextChanged: { _ in }, onAddLeague: {},
                externalPresentation: $presented
            )
            .padding(.horizontal, OmenSpacing.step16)
            Text("Desk").omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
                .padding(.horizontal, OmenSpacing.step16)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
        .task { await viewModel.load(userID: "screenshot") }
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
                isActive: viewModel.isCurrent(page),
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
        guard page.teamName?.isEmpty == false else { return OmenTeamPicker.unnamedTeamSubtitle(provider: provider) }
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
        FauxShell(
            scenarioKey: scenarioKey,
            commandContentOverride: AnyView(
                DeskScenario(phase: .ready)
            )
        )
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

    /// Current-screen stress fixture for the screenshot key that historically exercised long
    /// fantasy team names. It stays on the production desk composition instead of preserving
    /// the retired Command screen solely for truncation evidence.
    static let longNameDesk = OmenDeskState(
        weekLabel: "Week 7 · Sunday",
        deadlineLabel: "Lineups lock",
        deadlineTime: "1:00 PM",
        matchup: .read(OmenDeskMatchup(
            platform: .espn,
            status: "Live · Q2",
            leader: OmenDeskTeam(
                crest: "TTO",
                name: "Justin's Absolutely Enormous Fantasy Team Name",
                record: "5–2 · you",
                score: "64.8",
                isMine: true
            ),
            trailer: OmenDeskTeam(
                crest: "GOS",
                name: "G.O.A.T. SQUAD Championship Or Bust Edition",
                record: "6–1",
                score: "51.2",
                isMine: false
            ),
            projection: "119.6 – 114.2",
            projectionNote: "Projected · 5.4 ahead",
            leadFraction: 0.66,
            watch: "Four of your starters left; two of theirs."
        )),
        railCount: 4,
        railIndex: 0,
        waiver: .read(waiverMove),
        ledger: .read(ledgerLine),
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
            OmenSwitchRow(id: "pak", crest: "PAF", teamName: "Puk Around & Find Out", subtitle: "ESPN · Fantasy Madness", isFavorite: false, isActive: false),
            // The artboard's own honest row: a league the provider named and a team it did not.
            // "unnamed team" is the fallback and it is the caller's to decide, never the row's.
            OmenSwitchRow(id: "dar", crest: "DAR", teamName: "League 884411", subtitle: "ESPN team \u{00B7} name not shared", isFavorite: false, isActive: false)
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
///   - `max_teams: 3`, `three_team.supported: true`, `comparison: "multi_sided"`. The `Add team`
///     chip is available on Build; provider submission remains an ordered split handoff.
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


    // MARK: Partners and filters

    static let partners: [OmenTradePartner] = [
        OmenTradePartner(id: "dsi", crest: "DSI", name: "Davante\u{2019}s Inferno", need: "Needs RB"),
        OmenTradePartner(id: "gmr", crest: "GMR", name: "Gibbs me some Rice", need: "No hole"),
        // `need` is nil, not "No hole". Nobody read this roster, and "No hole" for a roster
        // nobody read is a claim about a roster nobody read.
        OmenTradePartner(id: "puk", crest: "PUK", name: "Puk Around & Find Out", need: nil)
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



    // MARK: TradeRoster



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


// MARK: - Chrome fixtures

/// Deterministic fixtures for `Account.dc.html` and `ReportPill.dc.html`.
///
/// Every value here is invented and says so. `Titans of Slopsilonia` and the two league names
/// are the artboard's own fixtures, carried across so a capture can be diffed against the
/// canvas element for element; the email is the artboard's too. No real account, no session,
/// no network — which is the whole point of the registry and the reason these states are
/// capturable at all.
enum ChromeFixtures {
    static let connections: [OmenAccountConnection] = [
        OmenAccountConnection(id: "espn", platform: "espn", leagueName: "Slops Saloon"),
        OmenAccountConnection(id: "sleeper", platform: "sleeper", leagueName: "Dynasty Degens"),
        OmenAccountConnection(id: "yahoo", platform: "yahoo", leagueName: "Work League", needsSignIn: true),
    ]

    static func account(_ connections: OmenAccountConnections) -> some View {
        NavigationStack {
            OmenAccountScreen(
                state: OmenAccountState(initials: "JD", identity: "justin@slopssaloon.com", identityDetail: "Signed in \u{00B7} passkeys", connections: connections, version: "Omen 1.0 (12)"),
                onOpen: { _ in },
                onConnect: {},
                onDisconnect: { _ in },
                onContactSupport: {},
                onReportProblem: {},
                onSignOut: {}
            )
        }
    }

    static func privacyAndData() -> some View {
        NavigationStack { OmenPrivacyScreen(onDelete: {}) }
    }

    /// The real phrase gate with nothing typed. The session store is empty, so delete cannot reach the network.
    static func deleteGate() -> some View {
        DeleteGateHost()
    }

    /// A sheet drawn in the frame rather than presented over it. A `.sheet` needs a presenting
    /// view and a tap to open; a capture needs the sheet on screen at launch.
    private static func sheetFrame(_ content: AnyView) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            content
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
    }

    static func composer(_ phase: OmenReportComposerSheet.Phase) -> some View {
        chromeShell(AnyView(
            VStack(alignment: .leading, spacing: 0) {
                OmenReportComposerSheet(
                    screen: .commandCenter,
                    connectionState: OmenBetaReportConnectionState(provider: .espn, state: .connected),
                    recentErrorCodes: ["espn_matchup_timeout", "session_refresh_retry"],
                    repository: StubBetaReportRepository(),
                    // No token: a fixture must not carry anything that looks like one, and the
                    // composer's own "Sign in to send a report" line is a real state.
                    accessToken: nil,
                    onDismiss: {},
                    phase: phase,
                    schema: StubBetaReportRepository.schema
                )
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
        ))
    }

    private static func chromeShell(_ content: AnyView) -> some View {
        FauxShell(initialTab: .command, commandContentOverride: content)
    }
}

/// Answers the schema read without a network, with the **server's real disclosure string** —
/// copied from `src/routes/betaReports.js`'s `DISCLOSURE` constant rather than written for the
/// fixture, so a capture shows the sentence a user actually sees.
///
/// It never answers a `send`: every composer scenario is mounted in an explicit phase, and a
/// fixture that could return a success would let a capture claim a report was stored.
private struct StubBetaReportRepository: OmenBetaReportRepository {
    static let schema = OmenBetaReportSchema(
        screens: OmenBetaReportScreen.allCases.map(\.rawValue),
        screenshotsSupported: false,
        disclosure: "Omen's own model, on Omen's servers, summarizes each report and the founder gets that summary by email and can reply to your account email. Your words stay on Omen's servers and are deleted after 30 days. Do not include league data or credentials."
    )

    func schema() async -> OmenBetaReportSchema { Self.schema }

    func send(_ report: OmenBetaReport, accessToken: String) async -> OmenBetaReportOutcome {
        .failed(message: "This is a screenshot fixture. Nothing was sent.")
    }
}

/// The phrase gate in its own view, so the `SessionManager` is constructed inside a `body` —
/// it is `@MainActor`-isolated and the registry's `content` closures are not.
private struct DeleteGateHost: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            OmenDeleteAccountSheet(
                sessionManager: SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
            )
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
    }
}

/// Presents the passkey offer exactly as the app shell does: a real `.sheet`, so the capture
/// shows the system's own chrome and not a hand-drawn frame.
private struct PasskeyOfferScenarioHost: View {
    var body: some View {
        OmenColor.bg
            .ignoresSafeArea()
            .sheet(isPresented: .constant(true)) {
                PasskeyOfferSheet(isRegistering: false, errorMessage: nil, onSave: {}, onNotNow: {})
            }
    }
}
