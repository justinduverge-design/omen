import SwiftUI

/// The second Command Center swipe — Waiver Watch, the Ledger and League Pulse as one paged
/// widget instead of three stacked sections.
///
/// Founder sketch, 2026-09-04: "in the next box it should switch between the other widgets."
///
/// ## Why labelled tabs and not dots
///
/// Paging buys back roughly two screens of vertical space, and it costs discoverability: a
/// user who never swipes never learns the Ledger is there. Dots would make that worse — they
/// say "there is more" without saying what. The tab row names all three at once, so the two
/// that are not showing are still *known* to exist. That was a deliberate trade, chosen over
/// the tighter dots-only version.
///
/// ## Why the tabs are also the control
///
/// Tapping a tab jumps to it, so the widget works for someone who reads labels and never
/// swipes at all. A swipe-only carousel has one input; this has two.
/// Each page's intrinsic height, keyed by page, so the pager can size to the current one.
private struct WidgetPageHeightKey: PreferenceKey {
    static let defaultValue: [OmenWidgetPager.Page: CGFloat] = [:]
    static func reduce(
        value: inout [OmenWidgetPager.Page: CGFloat],
        nextValue: () -> [OmenWidgetPager.Page: CGFloat]
    ) {
        value.merge(nextValue()) { current, next in max(current, next) }
    }
}

struct OmenWidgetPager: View {
    /// Floor, so a page mid-load does not collapse the pager to nothing.
    private static let minimumPageHeight: CGFloat = 96
    /// Ceiling, so a long Ledger cannot push the matchup off the fold. It scrolls past this.
    private static let maximumPageHeight: CGFloat = 260

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var measuredHeights: [Page: CGFloat] = [:]

    private var pageHeight: CGFloat {
        let measured = measuredHeights[selection] ?? Self.minimumPageHeight
        return min(max(measured, Self.minimumPageHeight), Self.maximumPageHeight)
    }

    /// A page. Identity is the case itself — there are exactly three and they never reorder,
    /// unlike the league carousel where the page list is server-driven.
    enum Page: String, CaseIterable, Identifiable {
        case waiver
        case ledger
        case pulse

        var id: String { rawValue }

        /// Short enough that three fit a phone width without scrolling. "League Pulse" is the
        /// section's real name and it does not fit beside the other two, so the tab is "Pulse"
        /// and the section keeps its full name inside the page.
        var tabLabel: String {
            switch self {
            case .waiver: return "Waiver"
            case .ledger: return "Ledger"
            case .pulse:  return "Pulse"
            }
        }

        var sectionTitle: String {
            switch self {
            case .waiver: return "Waiver Watch"
            case .ledger: return "The Ledger"
            case .pulse:  return "League Pulse"
            }
        }
    }

    @Binding var selection: Page
    let waiver: AnyView
    let ledger: AnyView
    let pulse: AnyView

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            tabRow
            pager
        }
    }

    private var tabRow: some View {
        HStack(spacing: OmenSpacing.step8) {
            ForEach(Page.allCases) { page in
                OmenChip(
                    label: page.tabLabel,
                    tone: .omen,
                    selected: selection == page,
                    action: { selection = page }
                )
                .accessibilityLabel(accessibilityLabel(page))
                .accessibilityAddTraits(selection == page ? [.isSelected] : [])
            }
            Spacer(minLength: 0)
        }
    }

    private var pager: some View {
        TabView(selection: $selection) {
            page(.waiver, content: waiver)
            page(.ledger, content: ledger)
            page(.pulse, content: pulse)
        }
        // `.never`: the tab row above already says where you are, and the system dots are a
        // colour-only cue, which §10.2 rules out as a selection indicator.
        .tabViewStyle(.page(indexDisplayMode: .never))
        // Height follows the page you are ON, not the tallest of the three.
        //
        // A shared fixed height was fine while all three pages printed a briefing. Once
        // Waiver became a deadline line and a link, 200 reserved roughly 300pt of empty space
        // under it — caught by the screenshot gate on 2026-09-10, and invisible to every
        // clipping assertion because nothing was clipped, it was simply blank.
        //
        // Measured per page, clamped, and animated so a swipe between a short page and a long
        // one does not snap. The clamp keeps a very long Ledger from pushing the matchup off
        // the fold; that page still scrolls inside itself.
        .frame(height: pageHeight)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: pageHeight)
        .onPreferenceChange(WidgetPageHeightKey.self) { heights in
            measuredHeights = measuredHeights.merging(heights) { _, new in new }
        }
    }

    private func page(_ id: Page, content: AnyView) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                Text(id.sectionTitle)
                    .omenTextStyle(OmenTypography.label)
                    .foregroundStyle(OmenColor.textSecondary)
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            // Measured inside the ScrollView, whose content is laid out at its intrinsic
            // height rather than the height the TabView is imposing — the same reason the
            // league carousel measures with `fixedSize`.
            .background(
                GeometryReader { proxy in
                    Color.clear.preference(
                        key: WidgetPageHeightKey.self,
                        value: [id: proxy.size.height]
                    )
                }
            )
        }
        // Scrolls within its own page rather than clipping: a long Ledger must not become
        // unreachable just because it shares a fixed-height pager with two shorter siblings.
        .tag(id)
    }

    private func accessibilityLabel(_ page: Page) -> String {
        let position = (Page.allCases.firstIndex(of: page) ?? 0) + 1
        return "\(page.sectionTitle), \(position) of \(Page.allCases.count)"
    }
}
