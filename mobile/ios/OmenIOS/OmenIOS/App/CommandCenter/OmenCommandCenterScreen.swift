import SwiftUI

/// Registry §3.2 approved **screen assembly** (feature layer). Rebuilt for v1.1 per
/// mobile-visual-briefs §1.1 to orient and prioritize the selected roster's week — it
/// does NOT duplicate Omen's full decision workspace. The full DecisionBrief lives on the
/// Omen destination, not here.
///
/// v1.1 hierarchy:
///   1. Header (page title + profile control)
///   2. Persistent OmenContextStrip (approved node 25:2)
///   3. OmenMatchupHero / Matchup Spine (approved node 25:26)
///   4. Waiver Watch — approved M4-CC-WaiverWatch composition
///   5. Ledger preview — approved node 72:2
///   6. League Pulse — approved node 74:2
///
/// Callers own the state and choose an honest fixture (demo mode vs real signed-in user).
/// This composition never selects a "connected" fixture on its own — exposing
/// demo-connected provider claims to a real user would violate facts-of-record #7.
struct OmenCommandCenterScreen: View {
    let state: OmenCommandCenterState
    let onSwitchContext: (() -> Void)?
    let onOpenMatchup: (() -> Void)?
    let onOpenAccount: (() -> Void)?
    let onOpenOmen: (() -> Void)?
    /// M5-NativeConnect. Supplied only when a connect path exists; when nil the screen keeps
    /// its previous behavior and shows no call to action it cannot honor.
    let onConnect: (() -> Void)?
    let onOpenLedger: ((OmenLedgerEntry) -> Void)?
    let onOpenLeague: (() -> Void)?
    let onConnectPlatform: ((OmenPlatform) -> Void)?

    /// The league carousel — provider chips over a swipeable matchup-per-league stack.
    ///
    /// Optional so this composition keeps working exactly as before when it is nil, which is
    /// what every fixture, preview and screenshot scenario passes. When supplied it REPLACES
    /// the context strip and the single Matchup Hero, because those two were the halves the
    /// carousel merges: the strip named one league, the hero showed that league's week, and
    /// the swipe now does both for every league at once.
    let carousel: LeagueCarouselViewModel?
    /// Only meaningful alongside `carousel`. Re-reads the surfaces the server named after a
    /// swipe changed which league is active.
    let onContextChanged: (([String]) -> Void)?
    var userID: String?

    /// Drives the tap-through detail sheet. The sheet carries the existing
    /// `OmenPlatformConnectionCard` content — that content is moved off the main surface, not new.
    @State private var detailRow: OmenPlatformRowState?
    /// Which of the three secondary widgets is showing. Opens on Waiver Watch: it is the only
    /// one of the three that is ever time-critical, and a user who never swipes should land on
    /// the page that can expire.
    @State private var widgetPage: OmenWidgetPager.Page = .waiver

    init(
        state: OmenCommandCenterState,
        onSwitchContext: (() -> Void)? = nil,
        onOpenMatchup: (() -> Void)? = nil,
        onOpenAccount: (() -> Void)? = nil,
        onConnect: (() -> Void)? = nil,
        onOpenOmen: (() -> Void)? = nil,
        onOpenLedger: ((OmenLedgerEntry) -> Void)? = nil,
        onOpenLeague: (() -> Void)? = nil,
        onConnectPlatform: ((OmenPlatform) -> Void)? = nil,
        carousel: LeagueCarouselViewModel? = nil,
        userID: String? = nil,
        onContextChanged: (([String]) -> Void)? = nil
    ) {
        self.carousel = carousel
        self.userID = userID
        self.onContextChanged = onContextChanged
        self.onConnectPlatform = onConnectPlatform
        self.state = state
        self.onSwitchContext = onSwitchContext
        self.onOpenMatchup = onOpenMatchup
        self.onOpenAccount = onOpenAccount
        self.onOpenOmen = onOpenOmen
        self.onConnect = onConnect
        self.onOpenLedger = onOpenLedger
        self.onOpenLeague = onOpenLeague
    }

    var body: some View {
        ScrollView {
            // `sectionStack` is 48pt, which is right for a page of stacked sections and far
            // too much for one with two carousels that both need to be on screen. The carousel
            // layout uses a tighter rhythm; the legacy stacked layout keeps the original.
            VStack(alignment: .leading, spacing: carousel == nil ? OmenSpacing.sectionStack : OmenSpacing.step24) {
                header
                // The vertical platform status strip is suppressed when the carousel is
                // present. Founder, 2026-09-04: "you still have Sleeper, Yahoo and ESPN going
                // down on three columns — it should just be horizontal, and the icons should
                // represent the leagues that are connected. If they don't have that, then it
                // doesn't pop up."
                //
                // The strip listed all three providers unconditionally, so two thirds of it
                // was usually the word "Disconnected" occupying the fold above the matchup.
                // The carousel's chip row answers the same question better: it names only what
                // the user actually has, horizontally, and each chip filters to that
                // provider's leagues instead of merely reporting a status.
                //
                // What the strip also carried, and where it went: last-sync time and
                // reconnect-required now surface on the affected league's own carousel page
                // (a page that cannot read says so on its own card), and full connection
                // management stays in Account, which is where the ESPN consent copy already
                // tells users to go to disconnect.
                if carousel == nil { platformsStrip }
                leagueSection
                if let onConnect, showsConnectCallToAction, carousel == nil {
                    // Honest-state doctrine: the screen already tells a disconnected user to
                    // connect a league. Before M5-NativeConnect there was no way to act on
                    // that. The button appears only when the shell has no usable context AND
                    // a connect path exists, so it can never advertise a dead end.
                    OmenButton(title: "Connect a league", action: onConnect, variant: .primary, size: .md)
                }
                secondaryWidgets
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg.ignoresSafeArea())
        .sheet(item: $detailRow) { row in
            platformDetailSheet(row)
        }
    }

    /// Founder sketch, 2026-09-04: the three sections below the matchup become one paged
    /// widget. Paged only when the carousel is live — every fixture, preview and screenshot
    /// scenario keeps the stacked layout, which is what those captures are of, and a paged
    /// screenshot would show one third of the page.
    @ViewBuilder
    private var secondaryWidgets: some View {
        if carousel != nil {
            OmenWidgetPager(
                selection: $widgetPage,
                // Each page keeps its existing composition verbatim — this change moves the
                // sections, it does not rewrite them.
                waiver: AnyView(waiverWatchBody),
                // The section links ride along into the paged layout as trailing rows. They
                // are the only route from each preview to its full screen, and dropping them
                // in the move would have stranded both sections.
                ledger: AnyView(VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    ledgerPreviewBody
                    ledgerSeeAll
                }),
                pulse: AnyView(VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    leaguePulseBody
                    leaguePulseLink
                })
            )
        } else {
            waiverWatch
            ledgerPreview
            leaguePulse
        }
    }

    /// The carousel when the caller supplied one, and the pre-carousel composition
    /// otherwise. Both branches are real: fixtures, previews and the screenshot workflow
    /// have no session and must keep rendering their labelled honest states.
    ///
    /// The carousel subsumes the connect call-to-action too — it has its own empty state
    /// with the same button — which is why the shell's copy of that button is suppressed
    /// above rather than shown twice.
    @ViewBuilder
    private var leagueSection: some View {
        if let carousel {
            OmenLeagueCarousel(
                viewModel: carousel,
                userID: userID,
                demoMatchup: state.matchup,
                onOpenMatchup: onOpenMatchup,
                onConnect: onConnect,
                onAddLeague: onConnect,
                onContextChanged: { onContextChanged?($0) }
            )
        } else {
            OmenContextStrip(state: state.context, onSwitch: onSwitchContext)
            OmenMatchupHero(state: state.matchup, onOpen: onOpenMatchup)
        }
    }

    /// Native `.sheet` per Figma `73:2` ("iOS: tap presents the detail sheet as a native .sheet").
    private func platformDetailSheet(_ row: OmenPlatformRowState) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            Text(row.platformName)
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
            OmenPlatformConnectionCard(
                platform: row.platform,
                status: row.status,
                description: row.resolvedLastSyncText.map { "Last sync \($0)" } ?? "No sync recorded.",
                actionLabel: row.isConnected ? "Manage league" : "Connect",
                onAction: { onConnectPlatform?(row.platform) }
            )
            Spacer(minLength: 0)
        }
        .padding(OmenSpacing.step16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(OmenColor.bg.ignoresSafeArea())
        .presentationDetents([.medium])
    }

    /// Visual brief §1.1 position 3 (amended 2026-08-14) · Figma `73:2`. Capped at ~2 row-heights
    /// so the Matchup Hero keeps the fold — that cap is the whole reason this strip is compact.
    @ViewBuilder
    private var platformsStrip: some View {
        if !state.platforms.isEmpty {
            OmenPlatformCompactStrip(
                rows: state.platforms,
                onOpenDetail: { detailRow = $0 },
                onConnect: onConnectPlatform.map { handler in { handler($0.platform) } }
            )
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text("Command Center")
                    .omenTextStyle(OmenTypography.eyebrow)
                    .foregroundStyle(OmenColor.textSecondary)
                Text(state.greeting)
                    // `h2` on one line, not `h1` across two. At 32pt the headline took roughly
                    // a quarter of the screen and pushed the second carousel off the fold —
                    // the founder wants the matchup AND the widget pager visible together, and
                    // the headline is the only block on this screen that is purely narration.
                    // `minimumScaleFactor` keeps the longest line ("Preparing your Week 12 game
                    // plan.") on one row at large Dynamic Type instead of truncating it.
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer(minLength: OmenSpacing.step8)
            // M6-ContextualHelp. Sits beside the profile control so help is reachable from the
            // header without competing with it for the eye.
            OmenContextualHelpButton(topic: OmenContextualHelpContent.topic(for: .commandCenter))
            if let onOpenAccount {
                OmenIconButton(
                    contentDescription: "Account and profile",
                    icon: Image(systemName: "person.crop.circle"),
                    action: onOpenAccount,
                    tone: .neutral
                )
            }
        }
    }

    /// Label plus body, for the stacked (non-paged) layout.
    @ViewBuilder
    private var waiverWatch: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Waiver Watch")
            waiverWatchBody
        }
    }

    /// The section without its own heading — the widget pager supplies that, and two headings
    /// stacked would read as two sections.
    @ViewBuilder
    private var waiverWatchBody: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            switch state.waiverWatch {
            case let .urgent(deadlineText, bestMove, longHorizonMoves):
                urgentWaiverBriefing(deadlineText: deadlineText, bestMove: bestMove, longHorizonMoves: longHorizonMoves)
            case let .calm(opportunities):
                calmWaiverList(opportunities: opportunities)
            case .pending:
                waiverStatusCard(title: "Claim pending", message: "Omen has identified an opportunity. Claim outcome is not yet known.")
            case .processed:
                waiverStatusCard(
                    title: "Waivers processed",
                    message: "Your league’s waivers have processed. Review current opportunities.",
                    showOmenLink: true
                )
            case .availabilityUnknown:
                waiverStatusCard(title: "Availability needs confirmation", message: "Omen cannot confirm availability for this league.")
            case .noCredibleMove:
                OmenStateSurface(
                    kind: .empty,
                    title: "No credible move",
                    message: "No waiver move stands out for this roster right now."
                )
            case .notConnected:
                OmenStateSurface(
                    kind: .disconnected,
                    title: "Personalized waiver moves need a league",
                    // The Try Demo pointer was removed 2026-08-30 with W3. Copy that names an
                    // affordance the user cannot see is an unverified claim about the product's
                    // own surface — an abort class 1 candidate, not a cosmetic mismatch.
                    message: "Connect a league to see roster-aware opportunities Omen can act on."
                )
            case .offSeason:
                OmenStateSurface(
                    kind: .empty,
                    title: "Long-horizon waiver context",
                    message: "Omen will surface relevant roster opportunities without weekly waiver urgency."
                )
            }
        }
    }

    private func urgentWaiverBriefing(
        deadlineText: String,
        bestMove: OmenWaiverOpportunity,
        longHorizonMoves: [OmenWaiverOpportunity]
    ) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text(deadlineText).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
            OmenCard(variant: .preview) {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Rectangle().fill(OmenColor.accent).frame(height: OmenSpacing.step4)
                    Text("Best Move").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accent)
                    opportunityContent(bestMove)
                }
            }
            omenLinkButton(title: "Review Omen’s waiver analysis")
            if !longHorizonMoves.isEmpty {
                Text("For the long horizon").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textSecondary)
                ForEach(Array(longHorizonMoves.prefix(2))) { opportunity in
                    opportunityRow(opportunity)
                }
            }
        }
    }

    private func calmWaiverList(opportunities: [OmenWaiverOpportunity]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            ForEach(Array(opportunities.enumerated()), id: \.element.id) { index, opportunity in
                opportunityRow(opportunity, rank: index + 1)
            }
            omenLinkButton(title: "See full waiver analysis")
        }
    }

    private func waiverStatusCard(title: String, message: String, showOmenLink: Bool = false) -> some View {
        OmenCard(variant: .outlined) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                Text(title).omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
                Text(message).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                if showOmenLink { omenLinkButton(title: "Review Omen’s waiver analysis") }
            }
        }
    }

    private func opportunityRow(_ opportunity: OmenWaiverOpportunity, rank: Int? = nil) -> some View {
        OmenCard(variant: .outlined) {
            opportunityContent(opportunity, rank: rank)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(opportunity.accessibilityLabel(rank: rank))
    }

    private func opportunityContent(_ opportunity: OmenWaiverOpportunity, rank: Int? = nil) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text([rank.map(String.init), "\(opportunity.playerName) · \(opportunity.position)"].compactMap { $0 }.joined(separator: "  "))
                .omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
            Text(opportunity.team).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
            Text(opportunity.availability).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
            Text(opportunity.reason).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
        }
    }

    @ViewBuilder
    private func omenLinkButton(title: String) -> some View {
        if let onOpenOmen {
            OmenButton(title: "\(title) →", action: onOpenOmen, variant: .link, size: .lg)
        }
    }

    @ViewBuilder
    private var ledgerPreview: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            HStack {
                sectionLabel("The Ledger")
                Spacer()
                ledgerSeeAll
            }
            ledgerPreviewBody
        }
    }

    /// "See all" survives into the paged layout as a trailing row — it is the only route from
    /// the preview to the full Ledger, and dropping it would strand the section.
    @ViewBuilder
    private var ledgerSeeAll: some View {
        if case .entries = state.ledger, let first = state.ledger.entries.first, let onOpenLedger {
            OmenButton(title: "See all →", action: { onOpenLedger(first) }, variant: .link, size: .md)
        }
    }

    @ViewBuilder
    private var ledgerPreviewBody: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            switch state.ledger {
            case .entries(let entries):
                VStack(spacing: 0) {
                    ForEach(Array(entries.prefix(3))) { entry in
                        OmenListRow(
                            title: "\(entry.period) · \(entry.callType)",
                            subtitle: "\(entry.summary)\n\(entry.outcome)",
                            action: onOpenLedger.map { callback in { callback(entry) } },
                            leading: {
                                Rectangle()
                                    .fill(OmenColor.accent)
                                    .frame(width: 2, height: 44)
                                    .accessibilityHidden(true)
                            },
                            trailing: { EmptyView() }
                        )
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel(entry.accessibilityLabel)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
            case .empty:
                OmenStateSurface(kind: .empty, title: "No Ledger entries yet", message: "Omen’s recent recommendations will appear here as immutable snapshots.")
            case .notConnected:
                OmenStateSurface(kind: .disconnected, title: "The Ledger needs a league", message: "Connect a league to keep an evidence-bound record of Omen’s recommendations.")
            case .loading:
                OmenStateSurface(kind: .loading, title: "Loading the Ledger", message: "Reading your recorded moves.")
            case .error(let message):
                OmenStateSurface(kind: .error, title: "The Ledger didn’t load", message: message)
            }
        }
    }

    @ViewBuilder
    private var leaguePulse: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            HStack {
                sectionLabel("League Pulse")
                Spacer()
                leaguePulseLink
            }
            leaguePulseBody
        }
    }

    @ViewBuilder
    private var leaguePulseLink: some View {
        if let onOpenLeague {
            OmenButton(title: "League →", action: onOpenLeague, variant: .link, size: .md)
        }
    }

    @ViewBuilder
    private var leaguePulseBody: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            switch state.leaguePulse {
            case let .available(position, cutLine, activity):
                OmenCard(variant: .outlined) {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text(position).omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
                        // `league-standings.v1` carries no playoff settings, so the cut line is
                        // omitted rather than guessed. Same for activity: there is no transaction
                        // feed yet, and an invented line here would be the exact fabrication the
                        // honest-state registry exists to prevent.
                        if let cutLine {
                            Text(cutLine).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                        }
                        if let activity {
                            Text("Around the League").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textSecondary)
                            Text(activity).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
                        }
                    }
                }
            case let .offSeason(summary):
                OmenStateSurface(kind: .empty, title: "Off-season league context", message: summary)
            case .loading:
                OmenStateSurface(kind: .loading, title: "Reading your league standings", message: "This one comes from your provider, so it lands a moment after the rest.")
            case .unavailable:
                OmenStateSurface(kind: .empty, title: "Standings didn't come back", message: "Omen won't show a stale rank. Pull to refresh, or try again when your league updates.")
            case .notConnected:
                OmenStateSurface(kind: .disconnected, title: "League Pulse needs a league", message: "Connect a league to see verified standings. League activity stays empty until a real feed exists.")
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .omenTextStyle(OmenTypography.label)
            .foregroundStyle(OmenColor.textSecondary)
    }
}

/// Immutable view state.
extension OmenCommandCenterScreen {
    /// Only when the strip has no verified league. A connected user does not need this CTA,
    /// and showing it beside a real league name would read as "your league didn't work."
    var showsConnectCallToAction: Bool {
        if case .empty = state.context { return true }
        return false
    }
}

struct OmenCommandCenterState {
    let greeting: String
    let context: OmenContextStripState
    /// Fixed provider order (Sleeper, Yahoo, ESPN) — never connection-sorted. Empty hides the strip.
    let platforms: [OmenPlatformRowState]
    let matchup: OmenMatchupHeroState
    let waiverWatch: OmenWaiverWatchState
    let ledger: OmenLedgerPreviewState
    let leaguePulse: OmenLeaguePulseState

    init(
        greeting: String,
        context: OmenContextStripState,
        platforms: [OmenPlatformRowState] = [],
        matchup: OmenMatchupHeroState,
        waiverWatch: OmenWaiverWatchState = .notConnected,
        ledger: OmenLedgerPreviewState = .notConnected,
        leaguePulse: OmenLeaguePulseState = .notConnected
    ) {
        self.greeting = greeting
        self.context = context
        self.platforms = platforms
        self.matchup = matchup
        self.waiverWatch = waiverWatch
        self.ledger = ledger
        self.leaguePulse = leaguePulse
    }
}

enum OmenLedgerPreviewState {
    case entries([OmenLedgerEntry])
    case empty
    case notConnected
    /// Slice E. The Ledger loads on its own request after the shell is already on screen, so
    /// it needs its own in-flight and failure states. Both render through `OmenStateSurface`;
    /// neither substitutes a fixture (facts-of-record #7).
    case loading
    case error(String)

    var entries: [OmenLedgerEntry] {
        guard case .entries(let entries) = self else { return [] }
        return entries
    }
}

struct OmenLedgerEntry: Identifiable {
    let id: String
    let period: String
    let callType: String
    let summary: String
    let outcome: String

    var accessibilityLabel: String { [period, callType, summary, outcome].joined(separator: ", ") }
}

enum OmenLeaguePulseState {
    case available(position: String, cutLine: String?, activity: String?)
    case offSeason(summary: String)
    /// The standings request is genuinely in flight. This is the ONLY League Pulse case that
    /// may render a spinner. It exists because `.unavailable` used to be drawn with
    /// `kind: .loading`, which put a `ProgressView` on a resting state — the section spun
    /// forever on every healthy league and read to the founder as "takes forever to load".
    case loading
    /// We asked and got no usable answer. A resting state, not a pending one.
    case unavailable
    case notConnected
}

/// View-only contract: callers provide verified data or an explicit honest state. This view never
/// infers a provider, availability, or waiver deadline.
enum OmenWaiverWatchState {
    case urgent(deadlineText: String, bestMove: OmenWaiverOpportunity, longHorizonMoves: [OmenWaiverOpportunity] = [])
    case calm(opportunities: [OmenWaiverOpportunity])
    case pending, processed, availabilityUnknown, noCredibleMove, notConnected, offSeason
}

struct OmenWaiverOpportunity: Identifiable {
    let id = UUID()
    let playerName: String
    let position: String
    let team: String
    let availability: String
    let reason: String

    func accessibilityLabel(rank: Int?) -> String {
        [rank.map { "Opportunity \($0)" }, playerName, position, team, availability, reason]
            .compactMap { $0 }
            .joined(separator: ", ")
    }
}

/// Fixture registry. Every fixture is explicitly labelled by its variable name; none
/// mints a "connected provider" claim for a real user. Screenshot workflow and
/// `Try Demo` session both consume these; a real signed-in user without connected
/// context sees `realDisconnected` until live wiring exists.
enum OmenCommandCenterFixtures {
    static let demoConnected = OmenCommandCenterState(
        greeting: "Demo · Sunday. Week 7 is in play.",
        context: .selected(platform: .sleeper, leagueName: "Demo Slate (mock league)", teamName: "Demo Titans"),
        platforms: [
            OmenPlatformRowState(platform: .sleeper, status: .connected, lastSyncText: "4m ago"),
            OmenPlatformRowState(platform: .yahoo, status: .disconnected),
            OmenPlatformRowState(platform: .espn, status: .disconnected)
        ],
        matchup: .live(
            // Both columns populated, because a live matchup is exactly when PROJ and SCORE
            // together are the point — and demo is the path App Review is told to take, so it
            // has to show the real design rather than a simpler one.
            selectedTeam: OmenMatchupTeam(name: "Demo Titans", record: "6–1", scoreText: "64.8", projectedText: "119.6"),
            opponent: OmenMatchupTeam(name: "Demo Rivals", record: "5–2", scoreText: "58.1", projectedText: "114.2"),
            projectedFinish: "119.6–114.2",
            whatToWatch: "Opponent has two demo players remaining Monday night."
        ),
        waiverWatch: .urgent(
            deadlineText: "Demo deadline · Wed 3:00 AM",
            bestMove: OmenWaiverOpportunity(
                playerName: "Tyrone Tracy Jr.", position: "RB", team: "NYG",
                availability: "Available in this demo league", reason: "Immediate help at RB during a thin Week 7."
            ),
            longHorizonMoves: [
                OmenWaiverOpportunity(playerName: "Demo Player A", position: "WR", team: "ATL", availability: "Available", reason: "Dynasty upside."),
                OmenWaiverOpportunity(playerName: "Demo Player B", position: "TE", team: "SEA", availability: "Available", reason: "Future opportunity.")
            ]
        ),
        ledger: .entries([
            OmenLedgerEntry(
                id: "demo-start-sit-week-6", period: "DEMO WEEK 6", callType: "START/SIT",
                summary: "Start DeVonta Smith over Chris Olave",
                outcome: "Smith 18.4 · Olave 11.2 · Demo outcome aligned."
            ),
            OmenLedgerEntry(
                id: "demo-waiver-week-6", period: "DEMO WEEK 6", callType: "WAIVER",
                summary: "Add Tyrone Tracy Jr.", outcome: "Demo claim pending."
            )
        ]),
        leaguePulse: .available(
            position: "Demo: 3rd of 12 · In a playoff spot",
            cutLine: "Demo standing · 2 games clear of the cut line",
            activity: "No demo league activity feed — this section stays honest until one exists."
        )
    )

    /// Honest disconnected state — what a real signed-in user without a connected
    /// league sees. No fabricated provider status, no fake matchup, no no-op CTA.
    static let realDisconnected = OmenCommandCenterState(
        greeting: "No game plan yet.",
        context: .empty,
        platforms: [
            OmenPlatformRowState(platform: .sleeper, status: .disconnected),
            OmenPlatformRowState(platform: .yahoo, status: .disconnected),
            OmenPlatformRowState(platform: .espn, status: .disconnected)
        ],
        // Conflict resolution (M6 merge): this branch's row list is kept, but its matchup
        // copy — "connect Sleeper, Yahoo, or ESPN" — is not. Yahoo is `.onHold`: it cannot be
        // connected anywhere right now, so naming it here would send someone to a dead end.
        // Sleeper connects in the app and ESPN connects on the Omen website, so both belong.
        matchup: .noMatchup(reason: "No matchup yet — connect Sleeper or ESPN to see your team's week.")
    )

    /// Honest loading state — session restore or dashboard-summary in flight.
    static let realLoading = OmenCommandCenterState(
        greeting: "Restoring your session…",
        context: .empty,
        matchup: .noMatchup(reason: "Loading…"),
        ledger: .loading,
        leaguePulse: .loading
    )
}

#if DEBUG
#Preview("CC — demo connected") { OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoConnected) }
#Preview("CC — real disconnected") { OmenCommandCenterScreen(state: OmenCommandCenterFixtures.realDisconnected) }
#endif
