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
//    deal, an `Add team` chip and a three-leg offer. `trade-capabilities.v1` now pays for that
//    composition with `max_teams: 3`, `comparison: "multi_sided"` and
//    `three_team.supported: true`. Submission remains `handoff_only`: the server evaluates all
//    three participants but returns ordered linked two-team handoffs because no connected
//    provider exposes a native three-team write API.
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
    /// T5 adds `.lateral`: a 3-team ring can move a player between two teams that are neither
    /// "you" — `OmenTradeLeg.Direction` used to be exhaustive with only two cases because a
    /// 2-team trade only ever has two participants, and anything not sent by you was received by
    /// you. `TradeBuildThreeTeam-v1.md`'s own interaction note: rather than mislabel a lateral
    /// leg "In" (wrong — it never reaches you) or invent a new glyph, this state renders no
    /// label at all — `_shared.css`'s "absence is the state" philosophy, same tier as `.rk.lo`.
    enum Direction: Equatable { case sending, receiving, lateral }

    let direction: Direction
    let name: String
    /// "RB · IND", or "RB · IND → Davante's" where a third party is involved. Server-composed.
    let meta: String
    /// "RB 8", "WR 3". **Optional, and nil renders nothing.** An unranked player is common and
    /// `—` in this column reads as a rank of zero rather than as an absence.
    var rank: String?

    /// The visible label. Blank, not a dash, for `.lateral` — see the type's own doc comment.
    var label: String {
        switch direction {
        case .sending: return "Out"
        case .receiving: return "In"
        case .lateral: return ""
        }
    }

    /// What VoiceOver says for the direction, independent of `label`. A blank visible label must
    /// still be **announced**, not just visually absent — `TradeBuildThreeTeam-v1.md`'s own
    /// acceptance rule: "never color as the only carrier of the blank state." Silence here would
    /// make the row read as `name, meta, rank` with no direction at all, which under-informs a
    /// screen-reader user relative to a sighted one looking at three visually distinct states.
    var accessibilityDirection: String {
        switch direction {
        case .sending: return "Sent by you"
        case .receiving: return "Received by you"
        case .lateral: return "Not sent or received by you"
        }
    }
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
    var forwardWeek: Double? = nil
    var theCatch: String? = nil
}

/// `.howto` — how to actually submit this, given that Omen never submits on anyone's behalf.
struct OmenTradeSubmission: Equatable {
    let title: String
    /// "ESPN · handoff only". `trade-capabilities.v1`'s `submission` field says which.
    let caption: String
    let steps: [String]
    /// T5: one flag per `steps` entry — a client-local "done" toggle for the 3-team
    /// split-handoff checklist. **Empty for the 2-team case**, which has no checklist at all
    /// (`OmenTradeAnswer.from` never sets `submission` for a 2-team verdict), so this is purely
    /// additive and never renders for the existing approved 2-team screens.
    ///
    /// Never synced, never sent to the server, never read back as proof a leg went through —
    /// `TradeBuildThreeTeam-v1.md`'s own rule: "never claims a leg went through because a box
    /// got tapped."
    var stepDone: [Bool] = []
    /// "0 of 3 legs sent." — derived purely from `stepDone`. Nil where there is nothing to count
    /// (the 2-team case, or before `stepDone` exists).
    var progressCaption: String? = nil
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
            inputs: (compare.capabilities ?? []).compactMap(OmenTradeInput.init(capability:)),
            forwardWeek: compare.forwardHorizons?.week.status == "available" ? compare.forwardHorizons?.week.value : nil,
            theCatch: compare.theCatch?.status == "available" ? compare.theCatch?.statement : nil
        )
    }

    /// The caveat is composed from `analysis_context` and never from the verdict. A personalized
    /// answer still carries one: "your league's settings" is itself the scope of the claim.
    private static func caveat(for compare: TradeCompare) -> String {
        caveat(analysisContext: compare.analysisContext)
    }

    /// T5: hoisted so `TradeThreeTeamCompare` — which carries the identical `analysis_context`
    /// vocabulary but is a distinct decodable type — reads the same sentences rather than a
    /// second copy of them.
    fileprivate static func caveat(analysisContext: TradeCompare.AnalysisContext) -> String {
        if let reason = analysisContext.unavailableReason {
            switch reason {
            case "unauthenticated":
                return "Omen used standard scoring — sign in and it will use your league's settings instead."
            case "provider_unsupported":
                return "This provider does not support personalized trade analysis yet, so this is standard scoring."
            default:
                return "Omen used standard scoring for this one, not your league's settings."
            }
        }
        if analysisContext.isPersonalized {
            let league = analysisContext.leagueName
            return league.map { "Scored against \($0)'s settings and your roster." }
                ?? "Scored against your league's settings and your roster."
        }
        return "Standard scoring — not your league's settings. Need usually decides a trade, and need is what standard scoring cannot see."
    }

    /// T5: the "your own" read for a three-team compare. `TradeThreeTeamCompare` has no
    /// top-level `explanation` field (T1's route never sets one for the `legs` branch), so the
    /// reasoning line is composed the same way `TradeCompare.subhead` is — from `verdictState`
    /// and `evaluability` — rather than left blank. There are no `capabilities` in this response
    /// either, so `inputs` is always empty, which the existing "only render the divider if
    /// non-empty" check already handles with no further change needed.
    static func from(_ compare: TradeThreeTeamCompare) -> OmenTradeRead {
        OmenTradeRead(
            headline: TradeCompare.headline(for: compare.verdictState),
            reasoning: threeTeamSubhead(for: compare),
            caveat: caveat(analysisContext: compare.analysisContext),
            isPersonalized: compare.analysisContext.isPersonalized,
            inputs: []
        )
    }

    /// The three-team mirror of `TradeCompare.subhead` — same vocabulary, applied to the overall
    /// `evaluability`/`verdictState` this response carries at its top level.
    private static func threeTeamSubhead(for compare: TradeThreeTeamCompare) -> String {
        switch compare.verdictState {
        case .insufficientData:
            switch compare.evaluability.reason {
            case "no_players":
                return "Add players to every leg and Omen will look at it."
            case "missing_projections":
                let n = compare.evaluability.missingProjectionCount
                return n == 1
                    ? "Omen has no projection for 1 of these players, so it won't force a verdict."
                    : "Omen has no projection for \(n) of these players, so it won't force a verdict."
            default:
                return "Omen doesn't have enough to evaluate this three-team deal."
            }
        case .closeNeedsContext:
            return "The value is close enough that your roster and league settings decide it."
        default:
            return compare.analysisContext.isPersonalized
                ? "Based on your league's scoring and your roster."
                : "Based on standard scoring — not your league's settings."
        }
    }
}

extension OmenTradeSubmission {
    /// T5: builds the split-handoff checklist from T1's `submission` block plus the client-local
    /// `doneSteps` set. `doneSteps` is never sent anywhere — it lives only in
    /// `TradeViewModel.threeTeamSubmissionDoneSteps` for exactly as long as the screen is open.
    static func from(_ submission: TradeThreeTeamCompare.Submission, platform: String?, doneSteps: Set<Int>) -> OmenTradeSubmission {
        let doneFlags = submission.steps.indices.map { doneSteps.contains($0) }
        let doneCount = doneFlags.filter { $0 }.count
        let caption = [platform?.uppercased(), "Handoff only"].compactMap { $0 }.joined(separator: " · ")
        return OmenTradeSubmission(
            title: "How to submit this",
            caption: caption.isEmpty ? "Handoff only" : caption,
            steps: submission.steps,
            stepDone: doneFlags,
            progressCaption: "\(doneCount) of \(submission.steps.count) legs sent."
        )
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
/// **`TradeBuild`, `TradeRoster` and `TradeShare` are now wired too**, from `CommandCenterView`
/// rather than from `OmenTradeAnswer` — they are not "the answer", they are the path to one and
/// the way to send it, so they route independently of `verdictState`:
///
///   - `TradeBuild`/`TradeRoster` are driven by `TradeViewModel.rosterBuildState` /
///     `.rosterScreenState`, built from `GET /api/trade/roster` (`trade-roster.v1`). A partner's
///     `need` stays nil — Omen has never read what a partner needs, only their roster — and the
///     three-team `Add team` control still renders through `OmenUnavailableControl`, per
///     `trade-capabilities.v1`. A provider or connection that genuinely can't supply a roster
///     (ESPN/Yahoo re-auth required, a league that hasn't drafted) renders
///     `Rosters.permanentlyUnavailable` with the server's own reason — never a guessed one, and
///     never rendered for a league that simply hasn't been asked yet.
///   - `TradeShare` is driven by `TradeViewModel.shareScreenState` / `.share(userID:)`, calling
///     the same `POST /api/trade/share` route this file's header already documented as working
///     server-side. The card's headline/reasoning/caveat come from the already-displayed
///     `trade-compare.v2` read, never from the share response, which returns the raw
///     `compareTrade()` shape and carries no verdict.
enum OmenTradeAnswer: Equatable {
    case verdict(OmenTradeVerdictState)
    case needsContext(OmenTradeNeedsContextState)

    /// `nil` where there is no answer to show — the offer has no players on one side, so there
    /// is nothing to draw two sides of.
    static func from(_ compare: TradeCompare, offer: TradeOffer) -> OmenTradeAnswer? {
        let sides = Self.sides(of: offer, compare: compare)
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
                // No counter builder exists yet — a counter-offer flow is separate product work
                // from wiring the existing `POST /api/trade/share` route.
                counterActionTitle: nil,
                // `TradeViewModel.share(userID:)` now calls `POST /api/trade/share` for real.
                shareActionTitle: "Share this read"
            ))
        }
    }

    /// Both sides, always — Trade "must show both sides", and an empty side renders as a heading
    /// with nothing under it rather than disappearing.
    /// Not private: `TradeViewModel.rosterBuildState` (M5/J4 roster-read wiring) reuses this to
    /// render the same "both sides, always" block on `TradeBuild` before a verdict exists.
    static func sides(of offer: TradeOffer, compare: TradeCompare? = nil) -> [OmenTradeSide] {
        [
            OmenTradeSide(heading: "You send", legs: offer.send.map { leg($0, .sending, compared: compare?.compared($0)) }),
            OmenTradeSide(heading: "You receive", legs: offer.receive.map { leg($0, .receiving, compared: compare?.compared($0)) })
        ]
    }

    /// `rank` is always nil on a live offer, and that is correct rather than missing: the offer
    /// carries names and positions, and `trade-compare.v2` returns no per-player rank. A rank
    /// composed here would be a number Omen never computed.
    private static func leg(_ player: TradePlayer, _ direction: OmenTradeLeg.Direction, compared: TradeCompare.ComparedPlayer? = nil) -> OmenTradeLeg {
        // Real numbers and Omen's read join the meta line when the verdict carries them.
        let ppg = compared?.stats?.pointsPerGame.map { "\(String(format: "%.1f", $0)) PPG" }
        let omen = compared?.omenRead?.points.map { "Omen \(String(format: "%.1f", $0))" }
        let grade = compared?.rating?.rating.map { "\(compared?.rating?.title ?? OmenPlayerRating.familyName) \(String(format: "%.1f", $0))" }
        let omenLabel = [ppg, grade, omen].compactMap { $0 }.joined(separator: " · ").nonEmptyTradeLabel
        return OmenTradeLeg(
            direction: direction,
            name: player.name,
            meta: ([player.position, player.team, omenLabel].compactMap { $0 }).joined(separator: " · "),
            rank: nil
        )
    }

    // MARK: - T5: three-team leg blocks

    /// Generalizes the fixed "You send"/"You receive" pair into N team-headed blocks, one per
    /// team that sends something — `TradeBuildThreeTeam-v1.md`'s own rule: *"each leg block is
    /// headed by a team, not by a direction... never one block per pairwise leg."*
    ///
    /// **Built from the locally-authored `TradeThreeTeamOffer.legs`, not from
    /// `TradeThreeTeamCompare.participants[].sends`.** The two disagree in one respect the
    /// contract does not resolve: T1's `participant.sends` pools every leg that team sent into
    /// one flat list with no per-player destination and no player `team` (NFL) field
    /// (`TradeThreeTeamCompare.Player` doc comment). This beta's only tested shape is a ring where
    /// each team sends to exactly one recipient, so the two sources agree there — but reading the
    /// destination and NFL-team abbreviation off the client's own authored legs is the only way
    /// to build the exact `meta` string (`"RB · IND → Davante's"`) the contract specifies without
    /// fabricating a `team` the server never returns. This is enrichment of already-known data,
    /// not the "leg-to-side reassembly" the contract warns against — the grouping (which teams
    /// get a block, and in what order) still comes from `teamOrder`, which the caller derives
    /// from the same `uniqueTeamIdsFromLegs`-style bookkeeping T1 itself does server-side.
    ///
    /// - Parameter teamOrder: viewer id first, then partner ids in the order they were added to
    ///   the trade — `TradeBuildThreeTeam-v1.md`: "block order matches the `.partners` chip order
    ///   above it." A team with nothing to send (per the contract, only participants that send
    ///   something get a block) is filtered out.
    static func sides(of offer: TradeThreeTeamOffer, viewerTeamID: String, teamOrder: [String]) -> [OmenTradeSide] {
        let sendingTeamIDs = Set(offer.legs.map(\.from))
        return teamOrder.filter(sendingTeamIDs.contains).map { teamID in
            let legsFromTeam = offer.legs.filter { $0.from == teamID }
            let heading = teamID == viewerTeamID
                ? "You send"
                : "\((legsFromTeam.first?.fromName).flatMap { $0.isEmpty ? nil : $0 } ?? teamID) sends"
            let rows = legsFromTeam.flatMap { leg in
                leg.players.map { player in threeTeamLeg(player, leg: leg, viewerTeamID: viewerTeamID) }
            }
            return OmenTradeSide(heading: heading, legs: rows)
        }
    }

    /// One row of a three-team leg block. `rank` stays nil for the same reason the 2-team `leg()`
    /// helper leaves it nil — `trade-compare.v2` computes no per-player rank in either shape.
    private static func threeTeamLeg(_ player: TradePlayer, leg: TradeThreeTeamLeg, viewerTeamID: String) -> OmenTradeLeg {
        let direction: OmenTradeLeg.Direction
        if leg.from == viewerTeamID { direction = .sending }
        else if leg.to == viewerTeamID { direction = .receiving }
        else { direction = .lateral }

        let parts = [player.position, player.team].compactMap { $0 }.filter { !$0.isEmpty }
        var meta = parts.joined(separator: " · ")
        // The destination suffix is load-bearing only when the recipient is not the viewer —
        // `TradeBuildThreeTeam-v1.md`'s own rule, restated in `meta`'s doc comment already: never
        // "→ you" for a row where the viewer is the recipient.
        if leg.to != viewerTeamID, let toName = leg.toName, !toName.isEmpty {
            meta = meta.isEmpty ? "→ \(toName)" : "\(meta) → \(toName)"
        }
        return OmenTradeLeg(direction: direction, name: player.name, meta: meta, rank: nil)
    }
}


private extension String {
    var nonEmptyTradeLabel: String? { isEmpty ? nil : self }
}
