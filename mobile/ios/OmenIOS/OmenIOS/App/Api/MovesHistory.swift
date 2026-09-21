import Foundation

/// `GET /api/moves/:id` → `move-detail.v1`. An immutable snapshot of one call.
///
/// Android has asserted `contract_version == "move-detail.v1"` since slice E
/// (`MovesHistory.kt`); iOS decoded whatever arrived. That asymmetry is closed here rather than
/// left as a note: a receipt is the one surface in the product that claims to show what was
/// true at issue time, so decoding a payload that never said which contract it was written to
/// is the wrong kind of forgiving.
struct MoveReceipt: Decodable {
    let snapshot: Snapshot
    let evidenceAtTheTime: [Evidence]
    let userAction: Statement
    let observedOutcome: Statement
    let fairnessNote: String
    /// Issue-time capability snapshot only; current capability reads never revise a receipt.
    let capabilities: [OmenDecisionCapability]?
    struct Snapshot: Decodable {
        let recommendation: String?
        let issuedAt: String?
        let issuedAtTimezone: String?
        enum CodingKeys: String, CodingKey {
            case recommendation, issuedAt = "issued_at", issuedAtTimezone = "issued_at_timezone"
        }
    }
    struct Evidence: Decodable { let kind: String; let statement: String }
    struct Statement: Decodable { let known: Bool; let statement: String }
    enum CodingKeys: String, CodingKey {
        case snapshot, evidenceAtTheTime = "evidence_at_the_time", userAction = "user_action"
        case observedOutcome = "observed_outcome", fairnessNote = "fairness_note", capabilities
        case contractVersion = "contract_version"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let version = try c.decodeIfPresent(String.self, forKey: .contractVersion)
        guard version == "move-detail.v1" else {
            throw DecodingError.dataCorruptedError(
                forKey: .contractVersion, in: c,
                debugDescription: "expected move-detail.v1, got \(version ?? "no contract_version")"
            )
        }
        snapshot = try c.decode(Snapshot.self, forKey: .snapshot)
        evidenceAtTheTime = try c.decode([Evidence].self, forKey: .evidenceAtTheTime)
        userAction = try c.decode(Statement.self, forKey: .userAction)
        observedOutcome = try c.decode(Statement.self, forKey: .observedOutcome)
        fairnessNote = try c.decode(String.self, forKey: .fairnessNote)
        capabilities = try c.decodeIfPresent([OmenDecisionCapability].self, forKey: .capabilities)
    }
}

/// M5-Native-API-Client slice E — `GET /api/moves` → `moves-history.v2`.
///
/// Replaces the Ledger preview fixture. The approved composition (Figma node `72:2`) is
/// unchanged: this is wiring only.
///
/// Every row field except `id` is optional because `normalizeMove()` in `src/routes/moves.js`
/// emits `null` for each of them individually — `recommendation` is `headline || reasoning ||
/// null`, `followed` / `stars` / `effectiveness_pct` / `created_at` are `null` until the user
/// or the scorer fills them, and `move_type` is `null` for any row written without one.
/// Modelling those as required would turn an ordinary half-filled row into a `.decode`
/// failure, which would tell the user "Omen sent something this app couldn't read" when the
/// truth is "this move hasn't been graded yet".
struct MovesHistory: Decodable, Equatable {
    let contractVersion: String?
    let season: Int?
    let summary: Summary?
    let moves: [Move]

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case season, summary, moves
    }

    struct Summary: Decodable, Equatable {
        let wins: Int?
        let losses: Int?
        let pending: Int?
        let avgEffectivenessPct: Int?
        let followedCount: Int?
        let totalCount: Int?

        enum CodingKeys: String, CodingKey {
            case wins, losses, pending
            case avgEffectivenessPct = "avg_effectiveness_pct"
            case followedCount = "followed_count"
            case totalCount = "total_count"
        }
    }

    struct Move: Decodable, Equatable {
        let id: Identifier
        let season: Int?
        let week: Int?
        let moveType: String?
        let recommendation: String?
        let followed: Bool?
        let actionProvenance: String?
        let provenance: String?
        let stars: Int?
        let outcome: String?
        let effectivenessPct: Double?
        let createdAt: String?

        enum CodingKeys: String, CodingKey {
            case id, season, week, followed, stars, outcome, provenance
            case moveType = "move_type"
            case recommendation
            case headline
            case actionProvenance = "action_provenance"
            case effectivenessPct = "effectiveness_pct"
            case createdAt = "created_at"
        }

        init(
            id: Identifier, season: Int?, week: Int?, moveType: String?, recommendation: String?,
            followed: Bool?, actionProvenance: String? = nil, provenance: String? = nil,
            stars: Int?, outcome: String?, effectivenessPct: Double?, createdAt: String?
        ) {
            self.id = id
            self.season = season
            self.week = week
            self.moveType = moveType
            self.recommendation = recommendation
            self.followed = followed
            self.actionProvenance = actionProvenance
            self.provenance = provenance
            self.stars = stars
            self.outcome = outcome
            self.effectivenessPct = effectivenessPct
            self.createdAt = createdAt
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(Identifier.self, forKey: .id)
            season = try c.decodeIfPresent(Int.self, forKey: .season)
            week = try c.decodeIfPresent(Int.self, forKey: .week)
            moveType = try c.decodeIfPresent(String.self, forKey: .moveType)
            recommendation = try c.decodeIfPresent(String.self, forKey: .headline) ?? c.decodeIfPresent(String.self, forKey: .recommendation)
            followed = try c.decodeIfPresent(Bool.self, forKey: .followed)
            actionProvenance = try c.decodeIfPresent(String.self, forKey: .actionProvenance)
            provenance = try c.decodeIfPresent(String.self, forKey: .provenance)
            stars = try c.decodeIfPresent(Int.self, forKey: .stars)
            outcome = try c.decodeIfPresent(String.self, forKey: .outcome)
            effectivenessPct = try c.decodeIfPresent(Double.self, forKey: .effectivenessPct)
            createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
        }
    }

    /// `moves.id` is a Supabase primary key. The table is `bigint` today and the app has no
    /// business asserting that forever, so both a JSON number and a JSON string decode. This
    /// is the one field with no honest fallback — a row with no stable identity cannot be
    /// rendered in an `Identifiable` list — so an unreadable id drops the row rather than
    /// inventing a UUID that would change on every refresh.
    enum Identifier: Decodable, Equatable {
        case int(Int)
        case string(String)

        var value: String {
            switch self {
            case .int(let value): return String(value)
            case .string(let value): return value
            }
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let intValue = try? container.decode(Int.self) {
                self = .int(intValue)
                return
            }
            self = .string(try container.decode(String.self))
        }
    }
}

// MARK: - Contract → screen state

extension MovesHistory {
    /// Maps `moves-history.v2` onto the shipped `OmenLedgerPreviewState`.
    ///
    /// An empty list is a real answer, not a failure: a signed-in user with a connected league
    /// and no recorded moves genuinely has an empty Ledger, and the approved empty surface says
    /// exactly that. Rows that cannot be rendered honestly are dropped individually, so one
    /// malformed row never blanks the section.
    var ledgerState: OmenLedgerPreviewState {
        let entries = moves.compactMap(Self.entry(from:))
        return entries.isEmpty ? .empty : .entries(entries)
    }

    static func entry(from move: Move) -> OmenLedgerEntry? {
        // The recommendation IS the row. `recommendationFrom()` already falls back from
        // `headline` to `reasoning`, so a null here means the row has no sentence at all —
        // there is nothing to show but a timestamp, and a Ledger line that says only
        // "WEEK 6 · WAIVER" reads as a rendering bug.
        guard let recommendation = move.recommendation?.trimmed, !recommendation.isEmpty else {
            return nil
        }

        return OmenLedgerEntry(
            id: move.id.value,
            period: period(for: move),
            callType: callType(for: move),
            summary: recommendation,
            outcome: outcomeText(for: move),
            actionStatus: actionText(for: move),
            outcomeProvenance: move.provenance?.trimmed.lowercased(),
            // J6. The same two facts as structure, for `OmenLedgerScreen`. Built here rather
            // than parsed back out of the sentences above, because recovering them from the
            // rendered strings would mean re-merging the two axes the Ledger's rule keeps apart.
            action: action(for: move),
            ledgerOutcome: ledgerOutcome(for: move)
        )
    }

    private static func period(for move: Move) -> String {
        guard let week = move.week else {
            // Week is not nullable in the table, but the contract types it as optional and a
            // season alone is still a true, useful period label.
            guard let season = move.season else { return "RECORDED" }
            return "\(season) SEASON"
        }
        return "WEEK \(week)"
    }

    private static func callType(for move: Move) -> String {
        guard let moveType = move.moveType?.trimmed, !moveType.isEmpty else {
            // Deliberately generic. Naming an unlabelled row "START/SIT" or "WAIVER" would
            // assert a kind of advice Omen never recorded.
            return "MOVE"
        }
        return moveType.uppercased()
    }

    /// The outcome line. Built only from what the row actually carries — `outcome`, `followed`,
    /// and `effectiveness_pct` — and it never converts silence into a claim. `buildSummary()`
    /// only counts effectiveness for followed, decided moves, so this line mirrors that rule
    /// rather than pairing a score with a move the user never made.
    ///
    /// ## The stored column is translated, never surfaced raw
    ///
    /// `CONTRACTS.md` is explicit about `LedgerDetail`: the stored `outcome` column holds raw
    /// `win`/`loss` and **"is translated, never surfaced raw"**. `moves-history.v2` exists to do
    /// that translation — it maps the raw column to `worked` / `did_not_work` / `not_verified`
    /// — and both clients have requested v2 since J2.
    ///
    /// Until now this function still had `case "win": "Outcome: win"` on both platforms, and a
    /// v1-shaped payload (an older server, a cached response, a proxy that ignored the query)
    /// would have rendered the raw column straight to the reader. Three tests, one per platform
    /// plus a view-model test, **pinned that behaviour as correct**. They were written before
    /// v2 existed and they are updated here rather than deleted.
    ///
    /// A raw `win` is **not** translated to "worked" on the client. The server's mapping has
    /// three outputs, not two: `not_verified` exists precisely because a stored win is not the
    /// same claim as a verified one. A client that turned `win` into "worked" would be inventing
    /// the verification. So an untranslated value resolves to *"Outcome not verified"* — true
    /// whatever the column held, and it never puts a machine word in front of a person.
    ///
    /// The same applies to an unrecognised token. The previous comment argued that printing it
    /// verbatim avoided hiding a backend change; a backend change is visible in
    /// `contract_version` and in these tests, and neither of those is the user's screen.
    static func outcomeText(for move: Move) -> String {
        let outcome = move.outcome?.trimmed.lowercased()
        var parts: [String] = []
        var decided = false

        switch outcome {
        case "worked":
            parts.append("Verified outcome: worked")
            decided = true
        case "did_not_work":
            parts.append("Verified outcome: did not work")
            decided = true
        case "pending", nil, "":
            parts.append("Outcome pending")
        // `not_verified` is v2's own third value; `win` and `loss` are the raw column arriving
        // untranslated; anything else is a token this build has no copy for. All three are the
        // same statement to a reader: there is a row, and nobody has verified how it went.
        default:
            parts.append("Outcome not verified")
        }

        if decided, move.followed == true, let effectiveness = move.effectivenessPct {
            parts.append("\(Int(effectiveness.rounded()))% effective")
        }

        return parts.joined(separator: " · ")
    }

    /// What the user did, and **who says so**, as two facts rather than one sentence.
    ///
    /// `action_provenance` is the only thing that licenses the unqualified reading. Anything
    /// that is not `self_reported` is treated as verified — `normalizeMove()` writes the column
    /// when Omen observed the change — and an absent `followed` is `unknown` rather than
    /// `passed`, because a roster Omen could not read is not a roster the user declined to move.
    static func action(for move: Move) -> OmenLedgerAction {
        let provenance: OmenLedgerProvenance =
            move.actionProvenance?.trimmed.lowercased() == "self_reported" ? .selfReported : .verified
        switch move.followed {
        case true: return .followed(provenance)
        case false: return .passed(provenance)
        case nil: return .unknown
        }
    }

    /// The four values of `moves-history.v2`. A raw `win`/`loss` resolves to `.notVerified` for
    /// the reason `outcomeText(for:)` gives at length: translating it to `.worked` here would
    /// invent the verification that v2's third value exists to withhold.
    static func ledgerOutcome(for move: Move) -> OmenLedgerOutcome {
        switch move.outcome?.trimmed.lowercased() {
        case "worked": return .worked
        case "did_not_work": return .didNotWork
        case "pending", nil, "": return .pending
        default: return .notVerified
        }
    }

    static func actionText(for move: Move) -> String? {
        switch move.actionProvenance?.trimmed.lowercased() {
        case "self_reported":
            switch move.followed {
            case true: return "You reported following this call"
            case false: return "You reported not following this call"
            case nil: return "Action report is incomplete"
            }
        // Anything else is a provenance value this build does not have copy for. Printing
        // the raw token ("Action status: verified_import") leaks a machine word into the
        // product; saying nothing is the honest fallback, and the row still renders.
        default: return nil
        }
    }
}

private extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}
