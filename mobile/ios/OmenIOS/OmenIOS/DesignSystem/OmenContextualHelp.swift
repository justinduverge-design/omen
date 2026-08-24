import SwiftUI

/// Registry §3.1 **Tooltip / Help**, built for M6-ContextualHelp.
///
/// Authority: `Blueprints/specs/mobile/m4-help-support-v1.md` §1–§5. This is the first half of
/// that contract — "explains the current Omen concept, state, or next step without taking the
/// person away from their work". The second half, the durable Help + Support destination, is
/// `OmenHelpSupportView` and is deliberately untouched here.
///
/// Rules this type exists to enforce (spec §2):
/// - it is **never** unsolicited — presentation is only ever driven by the person's own tap;
/// - it never blocks a decision, so it owns no confirm/deny action and gates nothing;
/// - dismissing returns to the exact prior state, which is why it holds no state but its own
///   `isPresented` and reports nothing back to its host.
///
/// The DS module stays product-agnostic (registry §3.2 M4 note): the value types below carry
/// no Omen concept, and the per-destination copy lives in the feature layer at
/// `App/Help/OmenContextualHelpContent.swift`.

/// One labeled explanation inside a help topic.
struct OmenHelpTip: Equatable, Identifiable {
    let label: String
    let body: String

    var id: String { label }

    init(label: String, body: String) {
        self.label = label
        self.body = body
    }
}

/// A short, local explanation of one surface.
///
/// Spec §4: "A contextual surface that needs more than a short explanation routes to the
/// durable Help Center instead of becoming a dense tooltip." `tips` is capped at
/// ``OmenHelpTopic/maxTips`` to keep that from being a matter of taste.
struct OmenHelpTopic: Equatable {
    let title: String
    let summary: String
    let tips: [OmenHelpTip]

    /// Above this, content belongs in Help + Support, not in a contextual surface.
    static let maxTips = 4

    init(title: String, summary: String, tips: [OmenHelpTip]) {
        self.title = title
        self.summary = summary
        self.tips = tips
    }
}

/// The `What is this?` affordance: an icon-only control that presents its topic on tap.
///
/// Renders as an `OmenIconButton` rather than a bespoke control so the 44pt touch target,
/// focus ring, and required accessibility name come from the approved primitive.
struct OmenContextualHelpButton: View {
    let topic: OmenHelpTopic
    var size: OmenIconButtonSize = .md

    @State private var isPresented = false

    var body: some View {
        OmenIconButton(
            // VoiceOver reads the purpose *and* what will be explained, so the control is
            // distinguishable when several sit on one screen (spec §5).
            contentDescription: "What is this? \(topic.title)",
            icon: Image(systemName: "questionmark.circle"),
            action: { isPresented = true },
            tone: .neutral,
            size: size
        )
        .sheet(isPresented: $isPresented) {
            OmenContextualHelpSheet(topic: topic, onDismiss: { isPresented = false })
                // Short by contract, so the sheet opens at a height that leaves the
                // originating screen visible behind it — help beside the work, not over it.
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }
}

/// The presented explanation. Reading order is title, summary, then tips (spec §5).
struct OmenContextualHelpSheet: View {
    let topic: OmenHelpTopic
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.headerToBody) {
                HStack(alignment: .firstTextBaseline) {
                    Text(topic.title)
                        .omenTextStyle(OmenTypography.h2)
                        .foregroundStyle(OmenColor.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    Spacer(minLength: OmenSpacing.step8)
                    OmenButton(title: "Done", action: onDismiss, variant: .link, size: .sm)
                }

                Text(topic.summary)
                    .omenTextStyle(OmenTypography.body)
                    // Registry §3.1 Tooltip/Help names `surface-2` + `text-primary`. That
                    // pairing is not decorative: `text-secondary` on `surface-2` measures
                    // 4.43:1 in light mode — under AA — and Apple's accessibility audit
                    // fails it as "Contrast nearly passed".
                    .foregroundStyle(OmenColor.textPrimary)
                    // Large text reflows rather than truncating (spec §4).
                    .fixedSize(horizontal: false, vertical: true)

                if !topic.tips.isEmpty {
                    VStack(alignment: .leading, spacing: OmenSpacing.fieldToField) {
                        ForEach(topic.tips) { tip in
                            VStack(alignment: .leading, spacing: OmenSpacing.inputToHint) {
                                Text(tip.label)
                                    .omenTextStyle(OmenTypography.label)
                                    // `text-primary`, not `accent` — registry §3.1's Tooltip/Help
                                    // row allows exactly `surface-2` + `text-primary`, and brass
                                    // here was an implementation deviation, not an approved
                                    // variant. It also failed WCAG AA in dark mode: measured
                                    // 3.68:1 for accent `#A67C2E` on surface-2 `#2C2C2E`
                                    // (light mode passed at 5.70:1, so this was dark-only).
                                    // The body below already followed the registry; the label
                                    // was the half of that earlier fix that got left behind.
                                    // Hierarchy still reads: `OmenTypography.label` differs from
                                    // the body's `bodySmall` in size and weight, not just colour.
                                    .foregroundStyle(OmenColor.textPrimary)
                                Text(tip.body)
                                    .omenTextStyle(OmenTypography.bodySmall)
                                    .foregroundStyle(OmenColor.textPrimary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            // One tip = one VoiceOver stop, label then body.
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(OmenSpacing.cardInterior)
        }
        .background(OmenColor.surface2)
    }
}
