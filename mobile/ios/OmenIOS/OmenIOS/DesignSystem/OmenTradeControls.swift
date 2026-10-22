import SwiftUI

// MARK: - J4's interactive primitives
//
// The five Trade artboards draw six controls the design system did not have: the two-way
// `.tabs2` tab strip, the `.pt` partner chip, the `.fc` filter chip, the roster row's
// `Add to deal` action, the share sheet's on/off inclusion row, and the treatment for a
// control that exists and **cannot be used**.
//
// They live here rather than in `App/` for the reason `OmenSwitchSheet` gives: iOS's
// `PrimitiveEnforcementTests` bans raw `Button(` under `App/`, and every one of these is a
// button. Putting them in a feature file would mean either an allowlist entry or six private
// copies, and the allowlist's own doc comment says the offender is usually a primitive sitting
// in a feature folder. It is.

/// `.tabs2` — the two-way tab strip above the build surface.
///
/// Two tabs, not a general segmented control: the artboard draws exactly two on `TradeBuild` and
/// `TradeRoster`, and a general N-way control here would invite a third tab the contract has no
/// state for.
struct OmenTradeTabs: View {
    let titles: [String]
    let selectedIndex: Int
    var onSelect: ((Int) -> Void)?

    var body: some View {
        HStack(spacing: OmenSpacing.step16) {
            ForEach(Array(titles.enumerated()), id: \.offset) { index, title in
                let isOn = index == selectedIndex
                Button(action: { onSelect?(index) }) {
                    Text(title)
                        .omenTextStyle(OmenTypography.label)
                        .foregroundStyle(isOn ? OmenColor.textPrimary : OmenColor.textTertiary)
                        // The artboard's underline is 2px on the selected tab only. The frame
                        // reaches 44pt for the thumb; the underline stays where the type is.
                        //
                        // `minWidth` as well as `minHeight`: "Build" is 40.3pt wide at
                        // `OmenTypography.label`, so the height floor alone left a tab target
                        // 3.7pt under the HIG minimum on its short axis. Found by
                        // `J4InteractionUITests.testTheBuildScreenOffersItsTabsFiltersAndPartners`,
                        // which is the whole reason that test measures both axes.
                        .frame(minWidth: OmenLayout.minTouchTarget, minHeight: OmenLayout.minTouchTarget)
                        .overlay(alignment: .bottom) {
                            Rectangle()
                                .fill(isOn ? OmenColor.accent : Color.clear)
                                .frame(height: 2)
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title)
                .accessibilityAddTraits(isOn ? [.isSelected] : [])
            }
            Spacer(minLength: 0)
        }
        .overlay(alignment: .bottom) {
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
        }
    }
}

