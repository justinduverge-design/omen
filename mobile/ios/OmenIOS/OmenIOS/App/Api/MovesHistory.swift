import Foundation

struct MoveReceipt: Decodable {
    let snapshot: Snapshot
    let evidenceAtTheTime: [Evidence]
    let userAction: Statement
    let observedOutcome: Statement
    let fairnessNote: String
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
        case observedOutcome = "observed_outcome", fairnessNote = "fairness_note"
    }
}

/// M5-Native-API-Client slice E — `GET /api/moves` → `moves-history.v1`.
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
    /// Maps `moves-history.v1` onto the shipped `OmenLedgerPreviewState`.
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
            outcomeProvenance: move.provenance?.trimmed.lowercased()
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
    static func outcomeText(for move: Move) -> String {
        let outcome = move.outcome?.trimmed.lowercased()
        var parts: [String] = []

        switch outcome {
        case "worked": parts.append("Verified outcome: worked")
        case "did_not_work": parts.append("Verified outcome: did not work")
        case "not_verified": parts.append("Outcome not verified")
        case "win": parts.append("Outcome: win")
        case "loss": parts.append("Outcome: loss")
        case "pending", nil, "": parts.append("Outcome pending")
        default:
            // An unrecognised outcome is shown verbatim rather than bucketed. Forcing an
            // unknown value into "pending" would hide a real backend change.
            parts.append("Outcome: \(move.outcome ?? "")")
        }

        if (outcome == "win" || outcome == "loss"),
           move.followed == true,
           let effectiveness = move.effectivenessPct {
            parts.append("\(Int(effectiveness.rounded()))% effective")
        }

        return parts.joined(separator: " · ")
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
