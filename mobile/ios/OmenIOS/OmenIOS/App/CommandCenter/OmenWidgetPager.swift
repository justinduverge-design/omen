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
struct OmenWidgetPager: View {
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
        // Sized so this pager and the matchup carousel above it share one screen — the
        // founder wants both on the fold, and 340 put this one under it. Every page scrolls
        // internally, so a tall waiver briefing is reachable rather than clipped.
        .frame(height: 260)
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
