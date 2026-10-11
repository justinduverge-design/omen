import SwiftUI

/// The trade presentation of an Omen call: who you send, who you get, and who you would deal with.
///
/// Every line is one the server returned (`OmenTradeCall` reads nothing else), so a missing field is a missing
/// line, never a placeholder. The numbers and the "why it helps both lineups" sentence are the server's own;
/// this view lays them out and states nothing about acceptance that the server did not.
struct OmenTradeCallSwap: View {
    let call: OmenTradeCall

    var body: some View {
        OmenCard(variant: .outlined, contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                row(title: "You send", side: call.give)
                row(title: "You get", side: call.receive)
                if let partner = call.partnerName {
                    VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                        Text("Trade partner")
                            .omenTextStyle(OmenTypography.micro)
                            .foregroundStyle(OmenColor.textTertiary)
                        Text(partner)
                            .omenTextStyle(OmenTypography.body)
                            .foregroundStyle(OmenColor.textPrimary)
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel(Self.partnerAccessibilityLabel(partner))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityIdentifier("omen-trade-call-swap")
    }

    private func row(title: String, side: OmenTradeCall.Side) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Text(side.name)
                .omenTextStyle(OmenTypography.name)
                .foregroundStyle(OmenColor.textPrimary)
            if let meta = side.meta {
                Text(meta)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Self.accessibilityLabel(title: title, side: side))
    }

    /// "You send A.J. Brown, WR, PHI." Spoken as a sentence, not as three stacked fragments.
    static func accessibilityLabel(title: String, side: OmenTradeCall.Side) -> String {
        let detail = side.meta.map { ", \($0.replacingOccurrences(of: " · ", with: ", "))" } ?? ""
        return "\(title) \(side.name)\(detail)."
    }

    static func partnerAccessibilityLabel(_ partner: String) -> String {
        "Trade partner \(partner)."
    }
}

/// Why a trade call helps both lineups, in the server's words, with the projected gain it computed.
struct OmenTradeCallWhy: View {
    let call: OmenTradeCall
    /// `expected_value_delta`, already formatted by the mapper ("+3.8 projected (meaningful)").
    let impact: String?
    let riskReasons: [String]

    var body: some View {
        if call.whyBothLineups != nil || impact != nil || !riskReasons.isEmpty {
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text("Why it helps both lineups")
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.textTertiary)
                    if let impact {
                        Text("Your lineup: \(impact)")
                            .omenTextStyle(OmenTypography.name)
                            .foregroundStyle(OmenColor.textPrimary)
                    }
                    if let why = call.whyBothLineups {
                        Text(why)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                    ForEach(Array(riskReasons.enumerated()), id: \.offset) { _, reason in
                        Text(reason)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                    if let caveat = call.acceptanceCaveat {
                        Text(caveat)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textTertiary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}
