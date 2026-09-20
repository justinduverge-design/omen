import SwiftUI

// MARK: - J4, "settling an argument"
//
// The five artboards of `screen-journeys-v1.md`'s fourth journey: `TradeBuild`, `TradeRoster`,
// `TradeNeedsContext`, `TradeVerdict` and `TradeShare`. Capability profile: `trade`.
//
// Built under the 2026-09-18/19 precedence rule — the artboard owns composition, placement, type
// and tone; `CONTRACTS.md` owns data, vocabulary and state. Where the two disagreed here, the
// disagreements were all of one kind and they are recorded at the point they bite rather than
// summarised: **the artboards draw a product that knows more than `trade-compare.v2` returns.**
//
// ## Trade's own rule, from `CONTRACTS.md`
//
// *"Trade is the argument-settler: the place a manager opens when the league chat is debating
// fairness, value, veto, or whether to make the offer. It must show both sides and state the
// caveat."*
//
// Both halves are structural here rather than editorial. Every verdict-bearing screen renders
// `OmenTradeLegBlock` — both sides, always, even when one side is a single player — and every one
// of them renders `caveat`, which is non-optional in the state types for exactly that reason. A
// screen that could omit the caveat would omit it on the day it mattered.
//
// ## The capability contract on this journey
//
// `capability-expression-v1.md`'s four presentation classes, applied to the inputs a trade read
// actually has:
//
//   - *used evidence*   — `OmenTradeInput.Presentation.used`, full prominence, `text-secondary`.
//   - *read, not used*  — `.readNotUsed`, `text-tertiary`, and the sentence says so. **No
//                          evidence styling**: acceptance rule 3.
//   - *could not read*  — `.couldNotRead`, named, `text-tertiary`, with an `Unavailable` badge
//                          and a sentence saying what was not read. Never dropped to make room.
//   - *out of scope*    — absent from the array. `not_requested` renders nowhere.
//
// There are no capability glyphs. `capability-symbols-v1.md`: a capability renders as a word.
//
// ## The three places the artboards claim more than the contract can pay for
//
// 1. **Three teams.** `TradeBuild.dc.html` and `TradeRoster.dc.html` draw a working three-team
//    deal, an `Add team` chip and a three-leg offer. `trade-capabilities.v1` says `max_teams: 2`
//    and `three_team.supported: false`, `reason: "multi_team_comparison_not_implemented"`, and
//    `CONTRACTS.md` is explicit that three-team controls **render unavailable** — not hidden, not
//    functional. So the composition is kept, the `Add team` chip renders through
//    `OmenUnavailableControl`, the legs are two-team, and the reason is a sentence beside it.
//
// 2. **The confidence band and the risk chip.** Three artboards draw a band (`Leaning`,
//    `Coin flip`) and two draw `Medium risk`. **`trade-compare.v2` returns neither.** Its fields
//    are `verdict_state`, `evaluability`, `analysis_context`, `net_value`, `explanation` and
//    `capabilities` — there is no confidence and no risk anywhere in it.
//
//    A band could be derived: `close_needs_context` plainly means "close". That derivation is
//    exactly the defect `U1` paid for and `capability-symbols-v1.md` records — a mark that made a
//    claim the data did not support. Omen's own fact-of-record #16 retired numeric confidence in
//    favour of a **server-issued** band; a client that mints one is worse than a numeral.
//
//    So the band and the risk chip are **absent**, and the slot they occupied carries the thing
//    the payload does have and the contract demands anyway: the caveat, as `analysis_context`'s
//    own mode. The three artboards are redrawn to the merged result in the same commit.
//
// 3. **`Rosters read live from ESPN at 3:48 PM`** on `TradeRoster` is drawn as unconditional.
//    Fact-of-record #16 says Omen issues **no trade call at all** where a provider will not give
//    the other teams' rosters, and `CONTRACTS.md` calls that a permanent provider limit rather
//    than an outage. `OmenTradeRosterScreen` therefore has a second state for it, and it offers
//    no retry — a retry button would promise that trying again could work.

// MARK: - State

/// One line of an offer. `direction` is the artboard's `.ar` / `.ar.out`.
struct OmenTradeLeg: Equatable {
    enum Direction: Equatable { case sending, receiving }

    let direction: Direction
    let name: String
    /// "RB · IND", or "RB · IND → Davante's" where a third party is involved. Server-composed.
    let meta: String
    /// "RB 8", "WR 3". **Optional, and nil renders nothing.** An unranked player is common and
    /// `—` in this column reads as a rank of zero rather than as an absence.
    var rank: String?

    var label: String { direction == .sending ? "Out" : "In" }
}

/// One side of the deal: a heading and its rows.
///
/// Both sides are always rendered, even when a side has one player, because
/// `CONTRACTS.md`'s rule for this destination is that it *must show both sides*.
struct OmenTradeSide: Equatable {
    /// "You send" / "Davante's Inferno sends". The partner's name comes from the provider.
    let heading: String
    let legs: [OmenTradeLeg]
}

/// One input behind the read, in exactly one of `capability-expression-v1.md`'s four classes.
///
/// There is no case for `not_requested`. That is not an oversight and it is not a `default:` this
/// file forgot — the fourth class renders as nothing, so the honest way to model it is that such
/// an input never reaches the screen at all. A case here would eventually get a treatment.
struct OmenTradeInput: Equatable, Identifiable {
    enum Presentation: Equatable {
        /// `state: live`, `used: true` — "this moved the call".
        case used
        /// `state: live`, `used: false` — "we have it; it didn't matter here".
        case readNotUsed
        /// `state: unavailable`, or `pending` at render. "We tried and couldn't."
        case couldNotRead
    }

    /// A server-owned capability name, rendered as a word. The 13-name vocabulary is closed.
    let capability: String
    /// The server's own sentence. The screen never composes one — a client-authored explanation
    /// of someone else's failure is a guess.
    let statement: String
    let presentation: Presentation

    var id: String { capability + statement }
}

/// A team you could trade with. `need` is Omen's read of *their* roster.
struct OmenTradePartner: Equatable, Identifiable {
    let id: String
    let crest: String
    let name: String
    /// "Needs RB", "No hole". **Nil where their roster was not read** — "No hole" for a roster
    /// nobody read is a claim about a roster nobody read.
    var need: String?
}

/// `trade-capabilities.v1`'s three-team answer, carried rather than assumed.
///
/// Absent (`nil` on the screen state) means the capability read has not happened or failed, and
/// the screens say *that* instead of asserting a limit. "No additional team can be added" is a
/// claim about the system, and a failed read does not establish it — the same distinction
/// `OmenTradeScreen.tradeFormatNote` already makes.
struct OmenTradeCapability: Equatable {
    let maxTeams: Int
    let threeTeamSupported: Bool
    /// `"multi_team_comparison_not_implemented"`, rendered as English by `reasonSentence`.
    let threeTeamReason: String?

    /// The server's reason code, said in the product's voice. Unknown codes fall back to the
    /// plain statement rather than printing the code at a user.
    var reasonSentence: String {
        switch threeTeamReason {
        case "multi_team_comparison_not_implemented":
            return "Omen can only compare two teams today. A third team is not a setting you can turn on — the comparison itself has not been built yet."
        case .some(let other) where !other.isEmpty:
            return "Omen can only compare \(maxTeams) teams today."
        default:
            return "Omen can only compare \(maxTeams) teams today."
        }
    }
}

/// `TradeBuild`.
struct OmenTradeBuildState: Equatable {
    /// "Two teams" — the artboard's `.kick` says "Three teams" and the contract caps it at two.
    let kicker: String
    let title: String
    let tabTitles: [String]
    let selectedTabIndex: Int
    let partners: [OmenTradePartner]
    let selectedPartnerID: String?
    let filters: [OmenTradeFilter]
    let selectedFilterID: String?
    /// Nil when `GET /api/trade/capabilities` has not answered. See `OmenTradeCapability`.
    let capability: OmenTradeCapability?
    let sides: [OmenTradeSide]
    /// The standing read on what has been built so far. Nil before anything is comparable.
    let read: OmenTradeRead?
    let submission: OmenTradeSubmission?
    let primaryActionTitle: String
}

struct OmenTradeFilter: Equatable, Identifiable {
    let id: String
    let title: String
    /// `.fc.smart` — a filter that names a conclusion rather than a position.
    var isSmart: Bool = false
}

/// The verdict block (`.verd`), shared by Build, Verdict and NeedsContext.
struct OmenTradeRead: Equatable {
    /// `TradeCompare.headline`. Server-owned: the screen reads `verdict_state` and never
    /// `verdict`, and never derives a headline from `net_value`.
    let headline: String
    /// `TradeCompare.explanation`, or the state's own subhead. One paragraph.
    let reasoning: String
    /// **Non-optional by design.** `CONTRACTS.md` requires this screen to state the caveat, and
    /// an optional field is a caveat that goes missing on the day the payload is thin.
    let caveat: String
    /// Whether the read used the caller's own league. `analysis_context.mode`, never inferred.
    let isPersonalized: Bool
    /// The inputs, already in the server's order. The screen does not re-rank — re-ranking is a
    /// claim about relative importance that no contract supports.
    let inputs: [OmenTradeInput]
}

/// `.howto` — how to actually submit this, given that Omen never submits on anyone's behalf.
struct OmenTradeSubmission: Equatable {
    let title: String
    /// "ESPN · handoff only". `trade-capabilities.v1`'s `submission` field says which.
    let caption: String
    let steps: [String]
}

/// `TradeRoster`.
struct OmenTradeRosterState: Equatable {
    /// The read half, or the permanent-limit half. Never a spinner and never a retry.
    enum Rosters: Equatable {
        case read(teamName: String, playerCount: Int, rows: [Row], freshness: String)
        /// Fact-of-record #16. The provider will not give the other teams' rosters for this
        /// league, so **Omen issues no trade call at all** — and this is not an outage.
        case permanentlyUnavailable(capability: String, sentence: String)
    }

    struct Row: Equatable, Identifiable {
        let id: String
        let name: String
        let meta: String
        let availability: OmenTradeRosterRow.Availability
    }

    let kicker: String
    let title: String
    let tabTitles: [String]
    let selectedTabIndex: Int
    let partners: [OmenTradePartner]
    let selectedPartnerID: String?
    let filters: [OmenTradeFilter]
    let selectedFilterID: String?
    let capability: OmenTradeCapability?
    let rosters: Rosters
    /// The artboard's `.note`, in the screen's own voice. Present only where there is a greyed
    /// row for it to explain.
    let note: String?
}

/// `TradeVerdict`.
struct OmenTradeVerdictState: Equatable {
    let kicker: String
    let title: String
    let sides: [OmenTradeSide]
    let read: OmenTradeRead
    let submission: OmenTradeSubmission?
    let primaryActionTitle: String
    let counterActionTitle: String?
    /// The route to `TradeShare`. Nil where there is nothing worth sharing — an
    /// `insufficient_data` answer is not an argument to win.
    let shareActionTitle: String?
}

/// `TradeNeedsContext`.
struct OmenTradeNeedsContextState: Equatable {
    let kicker: String
    let title: String
    let sides: [OmenTradeSide]
    let read: OmenTradeRead
    /// The artboard's `.note` — the one sentence that says what would make this answerable.
    let remedy: String?
    let connectActionTitle: String?
    let showAnywayActionTitle: String?
}

/// `TradeShare`.
struct OmenTradeShareState: Equatable {
    struct Inclusion: Equatable, Identifiable {
        let id: String
        let title: String
        let detail: String
        let isOn: Bool
    }

    /// The card itself, as it will actually be rendered by the share route.
    struct Card: Equatable {
        let eyebrow: String
        let headline: String
        let reasoning: String
        /// The caveat travels **on the card**, not only on the screen. A shared read that drops
        /// it is the one that ends up in a group chat claiming more than Omen said.
        let caveat: String
        let footer: String
    }

    let kicker: String
    let title: String
    let card: Card
    let inclusions: [Inclusion]
    let note: String
    let primaryActionTitle: String
    let secondaryActionTitle: String?
    /// A share that failed, named. `POST /api/trade/share` answers 503 when its storage is
    /// unavailable, and that is a different thing from a trade that could not be read.
    let failure: String?
}

// MARK: - TradeBuild

/// J4, screen one: build a deal.
///
/// `TradeBuild.dc.html`. Declared a **scroll** in the canvas README, so it scrolls — and
/// `omenFitProbe` still measures it, because `screen-journeys-v1.md` asks for the overflow of
/// every screen to be stated in px and a declared scroll with 400pt of overflow is a different
/// screen from one with 12pt.
struct OmenTradeBuildScreen: View {
    let state: OmenTradeBuildState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onSelectTab: ((Int) -> Void)?
    var onSelectPartner: ((String) -> Void)?
    var onSelectFilter: ((String) -> Void)?
    var onPrimaryAction: (() -> Void)?

    var body: some View {
        OmenTradeScrollShell(
            screenIdentifier: "j4.trade-build",
            fitProbeIdentifier: "j4.fit.trade-build",
            context: context
        ) {
            OmenTradeJourneyHeader(
                kicker: state.kicker,
                title: state.title,
                onOpenAccount: onOpenAccount
            )
            OmenTradeTabs(
                titles: state.tabTitles,
                selectedIndex: state.selectedTabIndex,
                onSelect: onSelectTab
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)

            partners
            filters
            threeTeamNotice

            ForEach(Array(state.sides.enumerated()), id: \.offset) { _, side in
                OmenTradeLegBlock(side: side)
            }

            if let read = state.read {
                OmenTradeReadBlock(read: read, submission: state.submission)
            }

            OmenButton(
                title: state.primaryActionTitle,
                action: { onPrimaryAction?() },
                variant: .primary,
                size: .lg
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)
        }
    }

    /// `.partners`, plus the `Add team` control the contract will not let work.
    private var partners: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: OmenSpacing.step8) {
                ForEach(state.partners) { partner in
                    OmenTradePartnerChip(
                        crest: partner.crest,
                        name: partner.name,
                        need: partner.need,
                        isSelected: partner.id == state.selectedPartnerID,
                        action: { onSelectPartner?(partner.id) }
                    )
                }
                addTeam
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)
        }
    }

    /// The `.pt.addt` chip, rendered unavailable.
    ///
    /// The artboard draws it as a live dashed `+`. `CONTRACTS.md`: *"Three-team controls must
    /// render unavailable until that changes."* Unavailable is the third thing — not hidden,
    /// which would deny the product ever meant to do this, and not live, which would let a user
    /// build an offer `POST /api/trade/compare` cannot score.
    @ViewBuilder private var addTeam: some View {
        let reason = state.capability.map(\.reasonSentence)
            ?? "Omen has not read this league's trade format yet, so it is comparing two teams."
        OmenUnavailableControl(name: "Add a third team", reason: reason) {
            VStack(spacing: OmenSpacing.step4) {
                Text("+")
                    .omenTextStyle(OmenTypography.h3)
                    .frame(width: 44, height: 44)
                Text("Add team")
                    .omenTextStyle(OmenTypography.bodySmall)
                Text("Two teams max")
                    .omenTextStyle(OmenTypography.micro)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(width: 66)
        }
    }

    private var filters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: OmenSpacing.step6) {
                ForEach(state.filters) { filter in
                    OmenTradeFilterChip(
                        title: filter.title,
                        isSelected: filter.id == state.selectedFilterID,
                        isSmart: filter.isSmart,
                        action: { onSelectFilter?(filter.id) }
                    )
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step10)
        }
    }

    /// The sentence that makes the greyed chip above legible as a limit rather than a bug.
    ///
    /// It is a separate element from the chip's accessibility label on purpose: the chip's label
    /// serves VoiceOver, and this serves everyone else. A dashed control with no visible
    /// explanation is the thing users file bug reports about.
    private var threeTeamNotice: some View {
        OmenTradeNoteBlock(
            text: state.capability.map(\.reasonSentence)
                ?? "Omen has not read this league's trade format yet, so it is comparing two teams.",
            emphasis: nil
        )
        .padding(.top, OmenSpacing.step12)
    }
}

// MARK: - TradeRoster

/// J4, screen two: picking from a real roster.
///
/// `TradeRoster.dc.html`. The screen where fact-of-record #16 is load-bearing — a provider that
/// will not hand over the other teams' rosters makes this screen, and the trade call behind it,
/// permanently impossible for that league.
struct OmenTradeRosterScreen: View {
    let state: OmenTradeRosterState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onSelectTab: ((Int) -> Void)?
    var onSelectPartner: ((String) -> Void)?
    var onSelectFilter: ((String) -> Void)?
    var onAddPlayer: ((String) -> Void)?

    var body: some View {
        OmenTradeScrollShell(
            screenIdentifier: "j4.trade-roster",
            fitProbeIdentifier: "j4.fit.trade-roster",
            context: context
        ) {
            OmenTradeJourneyHeader(kicker: state.kicker, title: state.title, onOpenAccount: onOpenAccount)
            OmenTradeTabs(titles: state.tabTitles, selectedIndex: state.selectedTabIndex, onSelect: onSelectTab)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: OmenSpacing.step8) {
                    ForEach(state.partners) { partner in
                        OmenTradePartnerChip(
                            crest: partner.crest,
                            name: partner.name,
                            need: partner.need,
                            isSelected: partner.id == state.selectedPartnerID,
                            action: { onSelectPartner?(partner.id) }
                        )
                    }
                }
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: OmenSpacing.step6) {
                    ForEach(state.filters) { filter in
                        OmenTradeFilterChip(
                            title: filter.title,
                            isSelected: filter.id == state.selectedFilterID,
                            isSmart: filter.isSmart,
                            action: { onSelectFilter?(filter.id) }
                        )
                    }
                }
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step10)
            }

            rosters

            if let note = state.note {
                OmenTradeNoteBlock(text: note, emphasis: nil)
                    .padding(.top, OmenSpacing.step12)
            }
        }
    }

    @ViewBuilder private var rosters: some View {
        switch state.rosters {
        case .read(let teamName, let playerCount, let rows, let freshness):
            OmenTradeSectionHeader(title: teamName, trailing: "\(playerCount) players")
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(spacing: 0) {
                    ForEach(rows) { row in
                        OmenTradeRosterRow(
                            name: row.name,
                            meta: row.meta,
                            availability: row.availability,
                            action: { onAddPlayer?(row.id) }
                        )
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step16)

            // `.oneline` — the freshness strip. Live is a *claim*, so it is made only where the
            // roster actually read, and it names the time it read at.
            HStack(spacing: OmenSpacing.step10) {
                Text(freshness)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                Spacer(minLength: OmenSpacing.step8)
                OmenBadge(label: "Live", tone: .live)
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)

        case .permanentlyUnavailable(let capability, let sentence):
            // No retry button, deliberately. `CONTRACTS.md` on `LeagueNoRosters`: *"A permanent
            // provider limit for that league, not an outage. Do not build a retry for it."* A
            // Try again that can never succeed teaches a user to keep pressing it.
            OmenTradeUnreadBlock(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step16)
        }
    }
}

// MARK: - TradeVerdict

/// J4, screen three: the read.
///
/// `TradeVerdict.dc.html`, `trade-compare.v2`'s four verdict states. The headline is the server's
/// (`verdict_state` → `TradeCompare.headline`) and nothing on this screen re-derives it.
struct OmenTradeVerdictScreen: View {
    let state: OmenTradeVerdictState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onPrimaryAction: (() -> Void)?
    var onCounter: (() -> Void)?
    var onShare: (() -> Void)?

    var body: some View {
        OmenTradeScrollShell(
            screenIdentifier: "j4.trade-verdict",
            fitProbeIdentifier: "j4.fit.trade-verdict",
            context: context
        ) {
            OmenTradeJourneyHeader(kicker: state.kicker, title: state.title, onOpenAccount: onOpenAccount)

            ForEach(Array(state.sides.enumerated()), id: \.offset) { _, side in
                OmenTradeLegBlock(side: side)
            }

            OmenTradeReadBlock(read: state.read, submission: state.submission)

            OmenButton(
                title: state.primaryActionTitle,
                action: { onPrimaryAction?() },
                variant: .primary,
                size: .lg
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)

            if let counter = state.counterActionTitle {
                OmenButton(title: counter, action: { onCounter?() }, variant: .secondary, size: .lg)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step8)
            }

            // The route to `TradeShare`, which the artboard does not draw — and without which
            // that screen is captured and unreachable, the defect
            // `scripts/check-screen-reachability.mjs` exists to catch. `TradeVerdict.dc.html` is
            // redrawn with this third control in the same commit.
            if let share = state.shareActionTitle {
                OmenButton(title: share, action: { onShare?() }, variant: .secondary, size: .lg)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step8)
            }
        }
    }
}

// MARK: - TradeNeedsContext

/// J4, screen four: too close to call blind.
///
/// `TradeNeedsContext.dc.html`, covering `close_needs_context` **and** `insufficient_data`. Both
/// are live in production and verified, and both are answers rather than errors — §9.4: name
/// incomplete input, do not force a verdict.
///
/// This is the journey's natural degraded surface and it is the frame that has to carry two
/// capability classes at once: something Omen read and did not use, and something it could not
/// read at all.
struct OmenTradeNeedsContextScreen: View {
    let state: OmenTradeNeedsContextState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onConnect: (() -> Void)?
    var onShowAnyway: (() -> Void)?

    var body: some View {
        OmenTradeScrollShell(
            screenIdentifier: "j4.trade-needs-context",
            fitProbeIdentifier: "j4.fit.trade-needs-context",
            context: context
        ) {
            OmenTradeJourneyHeader(kicker: state.kicker, title: state.title, onOpenAccount: onOpenAccount)

            ForEach(Array(state.sides.enumerated()), id: \.offset) { _, side in
                OmenTradeLegBlock(side: side)
            }

            OmenTradeReadBlock(read: state.read, submission: nil)

            if let remedy = state.remedy {
                OmenTradeNoteBlock(text: remedy, emphasis: nil)
                    .padding(.top, OmenSpacing.step12)
            }

            if let connect = state.connectActionTitle {
                OmenButton(title: connect, action: { onConnect?() }, variant: .primary, size: .lg)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step12)
            }
            if let anyway = state.showAnywayActionTitle {
                OmenButton(title: anyway, action: { onShowAnyway?() }, variant: .secondary, size: .lg)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step8)
            }
        }
    }
}

// MARK: - TradeShare

/// J4, screen five: send the read.
///
/// `TradeShare.dc.html`. `POST /api/trade/share` → `trade-share.v1`: a 30-day hash, no auth, no
/// provider data. **Names are off by default**, which is a contract and not a preference, and the
/// default is set by whoever builds the state rather than by this view.
struct OmenTradeShareScreen: View {
    let state: OmenTradeShareState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onToggleInclusion: ((String) -> Void)?
    var onShare: (() -> Void)?
    var onCopyAsText: (() -> Void)?

    var body: some View {
        OmenTradeScrollShell(
            screenIdentifier: "j4.trade-share",
            fitProbeIdentifier: "j4.fit.trade-share",
            context: context
        ) {
            OmenTradeJourneyHeader(kicker: state.kicker, title: state.title, onOpenAccount: onOpenAccount)
            card
            OmenTradeSectionHeader(title: "What goes in the card", trailing: nil)
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(spacing: 0) {
                    ForEach(state.inclusions) { inclusion in
                        OmenTradeShareToggleRow(
                            title: inclusion.title,
                            detail: inclusion.detail,
                            isOn: inclusion.isOn,
                            action: { onToggleInclusion?(inclusion.id) }
                        )
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step16)

            OmenTradeNoteBlock(text: state.note, emphasis: nil)
                .padding(.top, OmenSpacing.step12)

            if let failure = state.failure {
                OmenTradeUnreadBlock(capability: "Share link", sentence: failure)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step12)
            }

            OmenButton(title: state.primaryActionTitle, action: { onShare?() }, variant: .primary, size: .lg)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
            if let secondary = state.secondaryActionTitle {
                OmenButton(title: secondary, action: { onCopyAsText?() }, variant: .secondary, size: .lg)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step8)
            }
        }
    }

    /// `.card.hero` — the card exactly as the share route will render it.
    ///
    /// It carries the caveat. A card that drops it is the one that ends up in a group chat
    /// claiming Omen said more than it did, and the card is the artefact that leaves the app.
    private var card: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                Text(state.card.eyebrow)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                Text(state.card.headline)
                    .omenTextStyle(OmenTypography.h3)
                    .foregroundStyle(OmenColor.textPrimary)
                Text(state.card.reasoning)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(state.card.caveat)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(state.card.footer)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .padding(.top, OmenSpacing.step10)
                    .overlay(alignment: .top) {
                        Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
                    }
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step14)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "Share card preview. \(state.card.headline). \(state.card.reasoning) \(state.card.caveat)"
        )
    }
}

// MARK: - Shared blocks

/// The chrome and the scroll every J4 screen sits in.
///
/// All five Trade artboards are declared **scrolls** in the canvas README, so this is a
/// `ScrollView` rather than a fitted stack — and it still carries `omenFitProbe`, measured the
/// same way J2 measures its fits. A declared scroll still owes a number: the journey spec asks
/// for the overflow to be *stated*, and "it scrolls" is not a number.
///
/// The probe's placement rules are the ones `OmenFitProbe` documents and they are easy to get
/// wrong in the other order: `omenFitContent()` on the inner stack, where it is free to report
/// its natural height; `omenFitProbe` outermost and **above** `safeAreaInset`, so the viewport is
/// the height the screen was actually granted rather than the height plus the switcher bar.
private struct OmenTradeScrollShell<Content: View>: View {
    let screenIdentifier: String
    let fitProbeIdentifier: String
    var context: OmenScreenContext?
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                content()
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .omenFitContent()
        }
        .accessibilityIdentifier(screenIdentifier)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe(fitProbeIdentifier)
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }
}

/// `.top` — the eyebrow, the title, and E017's two controls.
private struct OmenTradeJourneyHeader: View {
    let kicker: String
    let title: String
    var onOpenAccount: (() -> Void)?

    var body: some View {
        // `.bottom`, not `.lastTextBaseline`, for the reason J2 records: baseline alignment asks
        // SwiftUI to resolve a text baseline for the E017 icon buttons, which have no text, and
        // that collapsed their reported frame to the 20pt glyph — under the 44pt floor.
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(kicker)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text(title)
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .trade),
                onOpenAccount: onOpenAccount
            )
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }
}

/// `.leg` — one side of the offer, headed and ruled.
private struct OmenTradeLegBlock: View {
    let side: OmenTradeSide

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            HStack(spacing: OmenSpacing.step8) {
                Text(side.heading)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
            }
            ForEach(Array(side.legs.enumerated()), id: \.offset) { _, leg in
                row(leg)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }

    private func row(_ leg: OmenTradeLeg) -> some View {
        HStack(spacing: OmenSpacing.step10) {
            Text(leg.label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(leg.direction == .sending ? OmenColor.textTertiary : OmenColor.accent)
                .frame(width: 22, alignment: .leading)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(leg.name)
                    .omenTextStyle(OmenTypography.name)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(1)
                Text(leg.meta)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            // Nothing where there is no rank. See `OmenTradeLeg.rank`.
            if let rank = leg.rank {
                Text(rank)
                    .omenTextStyle(OmenTypography.micro)
                    .monospacedDigit()
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }
        .padding(OmenSpacing.step10)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous).fill(OmenColor.surface1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel([leg.label, leg.name, leg.meta, leg.rank].compactMap { $0 }.joined(separator: ", "))
    }
}

/// `.verd` — the read, its caveat, its inputs and how to act on it.
private struct OmenTradeReadBlock: View {
    let read: OmenTradeRead
    let submission: OmenTradeSubmission?

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            // `.verdh` without the band. See this file's header, note 2: `trade-compare.v2`
            // returns no confidence and no risk, and a client that mints one is the `U1` defect.
            Text(read.headline)
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text(read.reasoning)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            // `.meta` — the caveat, in the slot the risk chip used to hold. This is the half of
            // Trade's contract rule that is easiest to lose: *"It must show both sides and state
            // the caveat."*
            HStack(spacing: OmenSpacing.step8) {
                OmenBadge(
                    label: read.isPersonalized ? "Your league" : "Standard scoring",
                    tone: read.isPersonalized ? .live : .neutral
                )
                Text(read.caveat)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, OmenSpacing.step2)

            if !read.inputs.isEmpty {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    ForEach(read.inputs) { input in
                        OmenTradeInputRow(input: input)
                    }
                }
                .padding(.top, OmenSpacing.step10)
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.textPrimary.opacity(0.08)).frame(height: 1)
                }
            }

            if let submission {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    HStack(spacing: OmenSpacing.step8) {
                        Text(submission.title)
                            .omenTextStyle(OmenTypography.micro)
                            .foregroundStyle(OmenColor.textTertiary)
                        Spacer(minLength: OmenSpacing.step8)
                        Text(submission.caption)
                            .omenTextStyle(OmenTypography.micro)
                            .foregroundStyle(OmenColor.textTertiary)
                    }
                    ForEach(Array(submission.steps.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .top, spacing: OmenSpacing.step8) {
                            Text("\(index + 1)")
                                .omenTextStyle(OmenTypography.micro)
                                .foregroundStyle(OmenColor.textSecondary)
                                .frame(width: 17, height: 17)
                                .background(Circle().fill(OmenColor.surface3))
                            Text(step)
                                .omenTextStyle(OmenTypography.bodySmall)
                                .foregroundStyle(OmenColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Step \(index + 1). \(step)")
                    }
                }
                .padding(.top, OmenSpacing.step10)
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.textPrimary.opacity(0.08)).frame(height: 1)
                }
            }
        }
        .padding(OmenSpacing.step14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(LinearGradient(colors: [OmenColor.surface2, OmenColor.surface1], startPoint: .top, endPoint: .bottom))
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
                }
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        )
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step14)
    }
}

/// One `.evr` — a capability, in exactly one of the three renderable classes.
private struct OmenTradeInputRow: View {
    let input: OmenTradeInput

    private var ink: Color {
        input.presentation == .used ? OmenColor.textSecondary : OmenColor.textTertiary
    }

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step12) {
            Text(input.capability)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                // 84pt with two lines allowed, carried from `OmenEvidenceRow` for the reason
                // recorded there: capability names are server-owned words, and the canvas column
                // was drawn against a shorter vocabulary than the API actually has.
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .frame(width: 84, alignment: .leading)
                .padding(.top, OmenSpacing.step4)

            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                Text(input.statement)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(ink)
                    .fixedSize(horizontal: false, vertical: true)
                // Only the could-not-read class gets a badge. Acceptance rule 3 forbids evidence
                // styling on `used: false`, and a "Read" badge beside an input that did not
                // matter is exactly that styling.
                if input.presentation == .couldNotRead {
                    OmenBadge(label: "Unavailable", tone: .unavailable)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var accessibilityText: String {
        switch input.presentation {
        case .used:
            return "\(input.capability). \(input.statement)"
        case .readNotUsed:
            return "\(input.capability). Read, and it did not decide this. \(input.statement)"
        case .couldNotRead:
            return "\(input.capability). Could not read. \(input.statement)"
        }
    }
}

/// The *could not read* class rendered as a whole block rather than a row — used where an entire
/// section failed, as `TradeRoster`'s permanent provider limit does.
///
/// Same treatment as J2's `OmenDeskUnreadSection`: named, a sentence, a dashed hairline, and no
/// evidence styling. It is never dropped to make room — `capability-expression-v1.md` singles
/// this class out as the one that must survive truncation.
private struct OmenTradeUnreadBlock: View {
    let capability: String
    let sentence: String

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            Text(capability)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Text(sentence)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(OmenSpacing.step12)
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(OmenColor.surface1.opacity(0.5))
                .overlay(
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(OmenColor.border)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(capability). Could not read. \(sentence)")
    }
}

/// `.note` — a paragraph on `surface-1`, for the one thing the screen wants read rather than
/// skimmed.
private struct OmenTradeNoteBlock: View {
    let text: String
    let emphasis: String?

    var body: some View {
        Group {
            if let emphasis {
                Text(emphasis).foregroundColor(OmenColor.textPrimary).bold() + Text(" ") + Text(text)
            } else {
                Text(text)
            }
        }
        .omenTextStyle(OmenTypography.bodySmall)
        .foregroundStyle(OmenColor.textSecondary)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(OmenSpacing.step12)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(OmenColor.surface1))
        .padding(.horizontal, OmenSpacing.step16)
        .accessibilityElement(children: .combine)
        .accessibilityLabel([emphasis, text].compactMap { $0 }.joined(separator: " "))
    }
}

/// `.sh` — a bold name and an optional count on the right.
private struct OmenTradeSectionHeader: View {
    let title: String
    let trailing: String?

    var body: some View {
        HStack {
            Text(title)
                .omenTextStyle(OmenTypography.cardLead)
                .foregroundStyle(OmenColor.textPrimary)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing {
                Text(trailing)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step14)
        .padding(.bottom, OmenSpacing.step6)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Binding the journey to `trade-compare.v2`

extension OmenTradeRead {
    /// Builds the read block from a real Compare response.
    ///
    /// **Nothing here invents a value.** The headline is `TradeCompare.headline`, which switches
    /// on `verdict_state` and nothing else. The caveat is `analysis_context`'s own mode. The
    /// inputs are the server's `capabilities` list, mapped class-for-class — and an input the
    /// server marked `not_requested` is dropped rather than rendered, which is the fourth
    /// presentation class doing its job.
    ///
    /// There is deliberately no band and no risk level. See this file's header, note 2.
    static func from(_ compare: TradeCompare) -> OmenTradeRead {
        OmenTradeRead(
            headline: compare.headline,
            reasoning: compare.explanation?.isEmpty == false ? compare.explanation! : compare.subhead,
            caveat: caveat(for: compare),
            isPersonalized: compare.analysisContext.isPersonalized,
            inputs: (compare.capabilities ?? []).compactMap(OmenTradeInput.init(capability:))
        )
    }

    /// The caveat is composed from `analysis_context` and never from the verdict. A personalized
    /// answer still carries one: "your league's settings" is itself the scope of the claim.
    private static func caveat(for compare: TradeCompare) -> String {
        if let reason = compare.analysisContext.unavailableReason {
            switch reason {
            case "unauthenticated":
                return "Omen used standard scoring — sign in and it will use your league's settings instead."
            case "provider_unsupported":
                return "This provider does not support personalized trade analysis yet, so this is standard scoring."
            default:
                return "Omen used standard scoring for this one, not your league's settings."
            }
        }
        if compare.analysisContext.isPersonalized {
            let league = compare.analysisContext.leagueName
            return league.map { "Scored against \($0)'s settings and your roster." }
                ?? "Scored against your league's settings and your roster."
        }
        return "Standard scoring — not your league's settings. Need usually decides a trade, and need is what standard scoring cannot see."
    }
}

extension OmenTradeInput {
    /// Maps one server-resolved capability onto a presentation class.
    ///
    /// Returns `nil` for `not_requested`, which is the whole point: the fourth class renders as
    /// nothing, and the cleanest way to guarantee that is for such an input never to become an
    /// `OmenTradeInput` at all.
    ///
    /// `pending` resolves to *could not read*, never to a spinner. Per the 2026-09-17 latency
    /// contract, an advisory still pending when the screen renders is shown as unread — the
    /// answer has already been given, and the reader is owed what stood behind it rather than an
    /// animation.
    init?(capability: OmenDecisionCapability) {
        // The name is the server's snake_case capability, said as a word. J3's `signalItem`
        // does the same transform; it is duplicated rather than shared only because that one
        // is private to `OmenFirstCallScreens` and hoisting it is a change to J3's file.
        let label = (capability.name ?? "")
            .split(separator: "_")
            .map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }
            .joined(separator: " ")
        guard !label.isEmpty else { return nil }

        switch capability.state {
        case "not_requested":
            // The fourth class renders as nothing, so it never becomes a row.
            return nil
        case "live", "stub", "mock", "demo":
            // `used == nil` means the server did not say, which is **not** `false` and is also
            // not permission to claim it decided anything. The honest reading of "we do not
            // know whether this mattered" is the class that does not claim it did.
            self.init(
                capability: label,
                statement: capability.statement ?? capability.source ?? "",
                presentation: capability.used == true ? .used : .readNotUsed
            )
        default:
            // `unavailable`, `pending`, and anything unrecognised. `pending` resolving here
            // rather than to a spinner is the 2026-09-17 latency contract; an unrecognised
            // state resolving here is the safe direction — it under-claims rather than over.
            self.init(
                capability: label,
                statement: capability.statement ?? "Omen could not read this.",
                presentation: .couldNotRead
            )
        }
    }
}

// MARK: - The production route into J4

/// The J4 answer, built from a real `trade-compare.v2` response.
///
/// ## Why this type exists
///
/// `scripts/check-screen-reachability.mjs` exists because a screen can photograph perfectly and
/// be unreachable: a screenshot scenario mounts it directly against fixtures, so a scenario is
/// **not evidence of a route**. Registering J4's eight captures without this would have added
/// ten findings to that check — five screens on two platforms, every one of them a screen no
/// user could arrive at.
///
/// This is the route for the two that can honestly have one.
///
/// ## What is reachable, and what is not
///
/// `TradeVerdict` and `TradeNeedsContext` are the same seat in the journey — the answer — in the
/// states `trade-compare.v2` actually returns. Everything they show is in that payload or in the
/// offer the user typed, so they mount on live data and nothing is invented.
///
/// **`TradeBuild`, `TradeRoster` and `TradeShare` are deliberately not wired here**, and the
/// reason is the same in all three cases: the data does not exist to mount them honestly.
///
///   - `TradeBuild` needs a partner directory with Omen's read of *their* roster, and position
///     filters over a roster the client holds. `league-overview.v1` gives the other teams'
///     names and nothing about their rosters, so every `need` would be nil and every filter
///     would be a live control that filters nothing. A control that answers a tap by doing
///     nothing is the thing `OmenUnavailableControl` exists to avoid.
///   - `TradeRoster` needs the other team's roster. No native read fetches one. Mounting it
///     would mean rendering `permanentlyUnavailable` on every league — a sentence blaming the
///     provider for a request Omen never made. That is a false claim about ESPN, and it is the
///     precise failure the reachability check's own banner warns against: *"Do not invent state
///     to make it reachable."*
///   - `TradeShare` needs a client for `POST /api/trade/share`. The route exists on the server
///     (`src/routes/trade.js`) and there is no native caller, so the button would either do
///     nothing or fabricate a link.
///
/// Those three stay captured-and-unreachable, reported rather than papered over. Building the
/// reads they need is product work, not a wiring change.
enum OmenTradeAnswer: Equatable {
    case verdict(OmenTradeVerdictState)
    case needsContext(OmenTradeNeedsContextState)

    /// `nil` where there is no answer to show — the offer has no players on one side, so there
    /// is nothing to draw two sides of.
    static func from(_ compare: TradeCompare, offer: TradeOffer) -> OmenTradeAnswer? {
        let sides = Self.sides(of: offer)
        guard sides.contains(where: { !$0.legs.isEmpty }) else { return nil }
        let read = OmenTradeRead.from(compare)

        switch compare.verdictState {
        case .closeNeedsContext, .insufficientData:
            return .needsContext(OmenTradeNeedsContextState(
                // The screen is titled; the call lives in the read block. Putting
                // `compare.headline` in both prints it twice on one screen.
                kicker: "Two teams",
                title: "Not yet",
                sides: sides,
                read: read,
                // The remedy is offered only where it is genuinely the remedy. A personalized
                // read that still could not call it is not fixed by connecting a league that is
                // already connected, and saying so would send the user in a circle.
                remedy: compare.analysisContext.isPersonalized
                    ? nil
                    : "Connect the league this offer is in and Omen can score it against your own settings instead of standard scoring.",
                connectActionTitle: compare.analysisContext.isPersonalized ? nil : "Connect this league",
                // The secondary slot. There is no "show it anyway" here — the read above already
                // is the standard-scoring read — so the honest secondary is the way back to the
                // offer the user is being asked to change.
                showAnywayActionTitle: "Change the offer"
            ))
        case .favorsYou, .youGiveUpTooMuch:
            return .verdict(OmenTradeVerdictState(
                kicker: "Two teams",
                title: "The read",
                sides: sides,
                read: read,
                // `trade-capabilities.v1`'s `submission` is a single word about *how* a provider
                // accepts a trade. It is not a list of steps, and three plausible ESPN steps
                // composed here would be the client inventing a procedure.
                submission: nil,
                primaryActionTitle: "Change the offer",
                // No counter builder exists, and no native caller for `POST /api/trade/share`.
                // A button that does nothing is worse than an absent one.
                counterActionTitle: nil,
                shareActionTitle: nil
            ))
        }
    }

    /// Both sides, always — Trade "must show both sides", and an empty side renders as a heading
    /// with nothing under it rather than disappearing.
    private static func sides(of offer: TradeOffer) -> [OmenTradeSide] {
        [
            OmenTradeSide(heading: "You send", legs: offer.send.map { leg($0, .sending) }),
            OmenTradeSide(heading: "You receive", legs: offer.receive.map { leg($0, .receiving) })
        ]
    }

    /// `rank` is always nil on a live offer, and that is correct rather than missing: the offer
    /// carries names and positions, and `trade-compare.v2` returns no per-player rank. A rank
    /// composed here would be a number Omen never computed.
    private static func leg(_ player: TradePlayer, _ direction: OmenTradeLeg.Direction) -> OmenTradeLeg {
        OmenTradeLeg(
            direction: direction,
            name: player.name,
            meta: [player.position, player.team].compactMap { $0 }.joined(separator: " · "),
            rank: nil
        )
    }
}
