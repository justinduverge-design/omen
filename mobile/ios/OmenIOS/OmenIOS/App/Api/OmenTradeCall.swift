import Foundation

/// A `recommendation.type == "trade_suggestion"` call, read off the Omen envelope so the Omen tab can show
/// it as a trade and hand it to the Trade screens.
///
/// **Only fields the server returned.** The two players come from `primary_player` (the one you get) and
/// `comparison_player` (the one you send). The partner team is not a structured field today: the server
/// states it once, in `recommendation.move` ("Offer <give> to <team> for <get>."), so it is read from that
/// sentence only when the sentence matches the server's template exactly, anchored on the two player names
/// the server also sent. Anything else leaves it nil and the screen simply does not name a partner; it is
/// never guessed. (A structured partner field on the recommendation would remove this reading.)
struct OmenTradeCall: Equatable {
    struct Side: Equatable {
        let name: String
        let position: String?
        let team: String?
        /// The provider's own id (`recommendation.*_player.id`), so Compare can resolve a projection by key.
        let playerKey: String?

        /// "WR · PHI", the position alone, the team alone, or nil. Never a placeholder.
        var meta: String? {
            let parts = [position, team].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            return parts.isEmpty ? nil : parts.joined(separator: " · ")
        }

        var tradePlayer: TradePlayer {
            TradePlayer(name: name, position: position, team: team, playerKey: playerKey)
        }
    }

    /// The player you send (`comparison_player`).
    let give: Side
    /// The player you get (`primary_player`).
    let receive: Side
    /// The team on the other side, when the server's sentence names one.
    let partnerName: String?
    /// `espn`, `sleeper` or `yahoo`, from `signals.trade_rosters.source` (`<platform>_league_rosters`).
    let platform: String?
    /// The league the server answered for. The shell fills it from the picker when the server sent none.
    var scope: OmenCallScope?
    /// The server's own sentence for why the swap helps both lineups (`explanation.why_it_matters`).
    let whyBothLineups: String?
    /// The server's caution (`explanation.risk`): a better projected lineup is not an accepted offer.
    let acceptanceCaveat: String?

    /// Yahoo gives Omen no projections, so the server never issues a Yahoo trade call. If one ever arrived,
    /// it would not be offered for review: there would be nothing behind it to review.
    var canReview: Bool {
        platform?.lowercased() != "yahoo" && scope?.platform.lowercased() != "yahoo"
    }

    /// "Offer A to Team for B." only when `move` is exactly that, for exactly these two names.
    static func partnerName(inMove move: String?, give: String, receive: String) -> String? {
        let prefix = "Offer \(give) to "
        let suffix = " for \(receive)."
        guard let move, move.hasPrefix(prefix), move.hasSuffix(suffix),
              move.count > prefix.count + suffix.count else { return nil }
        let name = String(move.dropFirst(prefix.count).dropLast(suffix.count))
            .trimmingCharacters(in: .whitespacesAndNewlines)
        // The server's own stand-in when it has no team name; that is not a team.
        guard !name.isEmpty, name != "that team" else { return nil }
        return name
    }

    /// `espn_league_rosters` -> `espn`.
    static func platform(fromRostersSource source: String?) -> String? {
        guard let source = source?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), !source.isEmpty else { return nil }
        let suffix = "_league_rosters"
        guard source.hasSuffix(suffix) else { return nil }
        let name = String(source.dropLast(suffix.count))
        return name.isEmpty ? nil : name
    }
}

extension OmenDecisionEnvelope {
    /// The trade call this envelope carries, or nil for any other kind of call (and for a trade with a
    /// player the server did not name: a half-named swap is not shown as a trade).
    func tradeCall() -> OmenTradeCall? {
        guard let recommendation, recommendation.type == "trade_suggestion",
              let give = Self.tradeSide(recommendation.comparisonPlayer),
              let receive = Self.tradeSide(recommendation.primaryPlayer) else { return nil }
        let explanationBlock = recommendation.explanation ?? explanation
        let platform = OmenTradeCall.platform(fromRostersSource: signals?["trade_rosters"]?.source)
            ?? answeredFor?.platform?.lowercased()
        return OmenTradeCall(
            give: give,
            receive: receive,
            partnerName: OmenTradeCall.partnerName(inMove: recommendation.move, give: give.name, receive: receive.name),
            platform: platform,
            scope: answeredFor?.scope,
            whyBothLineups: Self.nonEmpty(explanationBlock?.whyItMatters),
            acceptanceCaveat: Self.nonEmpty(explanationBlock?.risk)
        )
    }

    private static func tradeSide(_ player: Player?) -> OmenTradeCall.Side? {
        guard let name = player?.name?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty,
              name != "Unknown" else { return nil }
        return OmenTradeCall.Side(name: name, position: player?.position, team: player?.team, playerKey: player?.id)
    }

    private static func nonEmpty(_ text: String?) -> String? {
        guard let trimmed = text?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return nil }
        return trimmed
    }
}
