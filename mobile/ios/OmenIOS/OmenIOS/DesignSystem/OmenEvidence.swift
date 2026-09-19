import SwiftUI

/// The named symbols `OmenCall-v1` requires. The contract states that a missing symbol name is a
/// build failure, so these are declared rather than left to call sites to name.
///
/// Path data was copied verbatim from `design/native-visual-lock-2026-09-13/OmenCall.dc.html` into
/// vector imagesets. Each renders as a template so it takes its tint from the type role — which is
/// what lets `unreadSource` sit at `text-tertiary` beside read facts at `text-secondary` without a
/// second asset.
enum OmenEvidenceIcon: String {
    /// `evidence.wind`
    case wind = "EvidenceWind"
    /// `evidence.travel-zones`
    case travelZones = "EvidenceTravelZones"
    /// `evidence.rest-clock`
    case restClock = "EvidenceRestClock"
    /// `evidence.unread-source` — the factor Omen could not read.
    case unreadSource = "EvidenceUnreadSource"

    var image: Image { Image(rawValue).renderingMode(.template) }
}

/// Confidence as a band, never a number.
///
/// Registry §2.3: `Confident / Leaning / Coin flip`, a **14×2px accent rule preceding the word.
/// No numeral, no bar, no gradient.** Fact-of-record #16 and `C1` deleted the numeral; a gradient
/// meter encodes nothing the band does not already say, and `U1` names both as do-not-touch.
///
/// There is deliberately no initialiser taking a score. The mapping from score to band is server
/// policy (`decisionBriefV2.js`), and a client that can re-derive it is a client that will.
struct OmenConfidenceBandLabel: View {
    let band: OmenConfidenceBand

    var body: some View {
        HStack(spacing: OmenSpacing.step8) {
            Rectangle()
                .fill(OmenColor.accent)
                .frame(width: 14, height: 2)
                .accessibilityHidden(true)
            Text(band.label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.accentHover)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Confidence: \(band.label)")
    }
}

/// Risk as form, not hue (D7, registry §2.3).
///
/// - low: `text-tertiary` label, no container
/// - medium: outlined chip, `border`, `text-secondary` ink
/// - high: filled `surface-3`, `border` outline, `text-primary` ink, leading `▲`, and the label
///   **names the risk** — "Hamstring — game-time call" — never the word "high" alone
///
/// `reason` is what makes the high treatment legal. Passing nil at high risk renders "High risk",
/// which the registry calls out as the thing not to ship; it is allowed here only so a payload
/// that genuinely carries no reason still renders rather than crashing, and it is the weaker state.
struct OmenRiskLabel: View {
    let level: OmenRiskLevel
    var reason: String?

    private var text: String {
        switch level {
        case .low: return "Low risk"
        case .medium: return "Medium risk"
        case .high: return reason?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
            ? reason! : "High risk"
        }
    }

    var body: some View {
        switch level {
        case .low:
            Text(text)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
        case .medium:
            Text(text)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textSecondary)
                .padding(.vertical, OmenSpacing.step4)
                .padding(.horizontal, OmenSpacing.step8)
                .overlay(Capsule().stroke(OmenColor.border, lineWidth: 1))
        case .high:
            HStack(spacing: OmenSpacing.step4) {
                Text("▲").omenTextStyle(OmenTypography.micro)
                Text(text).omenTextStyle(OmenTypography.micro)
            }
            .foregroundStyle(OmenColor.textPrimary)
            .padding(.vertical, OmenSpacing.step4)
            .padding(.horizontal, OmenSpacing.step8)
            .background(Capsule().fill(OmenColor.surface3))
            .overlay(Capsule().stroke(OmenColor.border, lineWidth: 1))
        }
    }
}

/// One factor behind the call — "Wind 22", "2 zones", "4 days".
///
/// The `unread` variant is the honesty half of `U1`: a factor Omen could **not** read renders at
/// `text-tertiary` with the `evidence.unread-source` symbol, beside read factors at
/// `text-secondary`. It is present and named rather than omitted, because a factor silently
/// dropped reads as a factor that did not matter.
struct OmenFactChip: View {
    let label: String
    /// Optional on purpose. The artboard draws a factor-specific symbol per chip, but the
    /// capability vocabulary is open-ended — so a symbol appears only where the name genuinely
    /// maps to one. A default glyph would be a claim the data does not support.
    let icon: OmenEvidenceIcon?
    var unread: Bool = false

    var body: some View {
        HStack(spacing: OmenSpacing.step4) {
            if let symbol = unread ? OmenEvidenceIcon.unreadSource : icon {
                symbol.image
                    .resizable()
                    .frame(width: 12, height: 12)
            }
            Text(label).omenTextStyle(OmenTypography.micro)
        }
        .foregroundStyle(unread ? OmenColor.textTertiary : OmenColor.textSecondary)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(unread ? "\(label) — not read" : label)
    }
}

/// One evidence line: a `micro` key in a fixed column, and the statement beside it.
struct OmenEvidenceRow: View {
    let key: String
    let statement: String

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step12) {
            Text(key)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                // The artboard specifies 58pt, sized for "Weather" / "Rest" / "Projection". Real
                // capability names are longer, and at 58 the uppercase tracked `micro` role broke
                // words mid-syllable — the first build rendered "MATCHU P DVP" and "WEATHE R".
                // Widened to 84 with two lines allowed rather than hyphenating a key. Recorded as
                // a contract-vs-vocabulary deviation: the column was drawn against a shorter
                // vocabulary than the API actually has.
                // A capability key is a server-owned name, not copy we control, and the longest
                // single word in the vocabulary ("PROJECTIONS") broke mid-word at this width —
                // "PROJECTION / S". Scaling the key down is the honest trade: the name stays
                // whole and legible, and the sentence beside it keeps its full column.
                // `fixedSize` forced the ideal vertical size, which made SwiftUI wrap before it
                // would ever scale — so `minimumScaleFactor` alone did nothing here. Capping the
                // key at two lines lets the scale factor act on the one-word names.
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .frame(width: 84, alignment: .leading)
                .padding(.top, OmenSpacing.step4)
            Text(statement)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(key). \(statement)")
    }
}

/// The evidence block under the call, closed by the link into the full argument.
///
/// The rows are the server's own statements. The screen never composes a sentence of its own here:
/// `OmenCall-v1`'s experience contract puts the argument on this screen and the *ranking* of
/// candidates elsewhere, so this block explains one decision rather than comparing several.
struct OmenEvidenceDisclosure: View {
    let rows: [(key: String, statement: String)]
    var onOpenFullArgument: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            ForEach(rows, id: \.key) { row in
                OmenEvidenceRow(key: row.key, statement: row.statement)
            }
            if let onOpenFullArgument {
                Button(action: onOpenFullArgument) {
                    HStack(spacing: 0) {
                        Text("See the full argument").omenTextStyle(OmenTypography.label)
                        Spacer(minLength: OmenSpacing.step12)
                        Text("→").omenTextStyle(OmenTypography.label)
                    }
                    .foregroundStyle(OmenColor.accent)
                }
                .buttonStyle(.plain)
                .frame(minHeight: OmenLayout.minTouchTarget, alignment: .leading)
                .accessibilityLabel("See the full argument")
            }
        }
        .padding(.top, OmenSpacing.step12)
        .overlay(alignment: .top) {
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
        }
    }
}
