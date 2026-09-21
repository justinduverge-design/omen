import SwiftUI

/// `ReportPill.dc.html` — E042 through E047.
///
/// ## It is an overlay, not a block
///
/// The artboard positions it `bottom:76px` over the Command Center's `.spacer`, absolutely
/// rather than in flow, and that placement is load-bearing rather than cosmetic:
/// `CommandCenter.dc.html` is one of the thirteen artboards **declared `fits`**. A 73pt card
/// added to that screen's content stack would spend headroom the fit declaration has already
/// promised. As an overlay it costs the layout nothing and D11 reads the same number with the
/// pill present as without it, which is checked rather than asserted —
/// `ChromeInteractionUITests.testTheReportPillDoesNotCostCommandCenterItsFit`.
///
/// ## Why the whole card is the target
///
/// The artboard draws `Report` as a 13pt word with no padding, which is 13pt of target. The
/// registry's `V-CanvasConformance` rule is that the **target** grows and the type does not, so
/// the word keeps its size and the tap area becomes the card. Recorded drift, same trade
/// `OmenSectionLink` and `OmenLeagueSwitcherBar` already make.
///
/// ## The subtitle is a promise the payload keeps
///
/// *"never your league data"* is not marketing copy — it is `CONTRACTS.md`'s rule for this
/// route, and `OmenBetaReport` is a closed struct precisely so the sentence stays true. The
/// words live here and the guarantee lives in the type; neither can quietly drop the other.
struct OmenReportPill: View {
    var title: String = "Something look wrong?"
    var subtitle: String = "Sends this screen, your app version and the provider \u{2014} never your league data."
    var actionTitle: String = "Report"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step10) {
                // `!` in an accent-muted tile. `capability-symbols-v1.md` bans glyphs for
                // *capabilities*; this is an attention mark on a control, not a capability
                // rendering, and the control is labelled in words beside it.
                Text("!")
                    .omenTextStyle(OmenTypography.h3)
                    .foregroundStyle(OmenColor.accent)
                    .frame(width: 30, height: 30)
                    .background(OmenColor.accentMuted)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(title)
                        .omenTextStyle(OmenTypography.name)
                        .foregroundStyle(OmenColor.textPrimary)
                    Text(subtitle)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Text(actionTitle)
                    .omenTextStyle(OmenTypography.label)
                    .foregroundStyle(OmenColor.accent)
                    .layoutPriority(1)
            }
            .padding(OmenSpacing.step12)
            .frame(maxWidth: .infinity, minHeight: OmenLayout.minTouchTarget, alignment: .leading)
            .background(OmenColor.surface2)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(OmenColor.borderSubtle, lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        // One element, one sentence. Three separate texts inside a button make VoiceOver read
        // the card and then its parts, and the part a user needs — the promise — is the one a
        // summarised label would drop.
        .accessibilityLabel("\(title). \(subtitle)")
        .accessibilityHint("Opens the report composer")
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier("chrome.report-pill")
    }
}
