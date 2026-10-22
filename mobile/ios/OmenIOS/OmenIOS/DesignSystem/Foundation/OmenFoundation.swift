import SwiftUI

// Foundation v1 shared patterns (`Blueprints/specs/design/omen-design-foundation-v1.md` § 5, approved
// 2026-10-21). Screens compose these and draw nothing of their own. A screen that needs something new
// adds it here, and to the spec, first.

// MARK: - Controls without chrome

/// A whole row or region that acts as one control. The look comes from what it wraps.
struct OmenPressable<Label: View>: View {
    let action: () -> Void
    @ViewBuilder let label: () -> Label

    var body: some View {
        Button(action: action, label: label)
            .buttonStyle(OmenPressedStyle())
    }
}

/// Pressed feedback for every chromeless control: a slight dim, removed under Reduce Motion's spirit by
/// being an opacity change, not movement.
struct OmenPressedStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.6 : 1)
            .contentShape(Rectangle())
    }
}

/// The back control on a pushed screen: chevron and the name of where it goes, in the accent, 44pt.
struct OmenBackButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step4) {
                Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold))
                Text(title).omenTextStyle(OmenTypography.body)
            }
            .foregroundStyle(OmenColor.accentHover)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(OmenPressedStyle())
        .accessibilityLabel("Back to \(title)")
    }
}

/// A text control for a navigation bar, a sheet header or a menu: "Clear", "Done", "Close".
struct OmenBarTextButton: View {
    let title: String
    var tone: Color = OmenColor.accentHover
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .omenTextStyle(OmenTypography.rowTitle)
                .foregroundStyle(tone)
                .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(OmenPressedStyle())
    }
}

// MARK: - Identity marks

/// A player's mark: his NFL team's colours, jersey number and position. No photos (spec § 5).
struct OmenPlayerBadge: View {
    enum Size { case row, hero }

    let team: String?
    let number: Int?
    let position: String?
    var size: Size = .row

    var body: some View {
        let pair = OmenNFLTeamColors.pair(for: team)
        let fill = pair.map { OmenNFLTeamColors.color($0.fill) } ?? OmenColor.surface2
        let ink = pair.map { OmenNFLTeamColors.color($0.text) } ?? OmenColor.textSecondary
        let side: CGFloat = size == .row ? 40 : 72
        VStack(spacing: size == .row ? 1 : 3) {
            Text(number.map(String.init) ?? (position ?? "\u{2014}"))
                .omenTextStyle(size == .row ? OmenTypography.numeric : OmenTypography.figure)
            if number != nil, let position {
                Text(position)
                    .omenTextStyle(OmenTypography.micro)
                    .opacity(0.85)
            }
        }
        .foregroundStyle(ink)
        .frame(width: side, height: side)
        .background(fill, in: RoundedRectangle(cornerRadius: size == .row ? 12 : 22, style: .continuous))
        .accessibilityHidden(true)
    }
}

/// A fantasy team's mark: its own logo when the provider sends one, otherwise a monogram.
struct OmenTeamCrest: View {
    let name: String
    var imageURL: URL?
    var side: CGFloat = 32
    var isYours = false

    var body: some View {
        Group {
            if let imageURL {
                AsyncImage(url: imageURL) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        monogram
                    }
                }
            } else {
                monogram
            }
        }
        .frame(width: side, height: side)
        .clipShape(Circle())
        .accessibilityHidden(true)
    }

    private var monogram: some View {
        Text(Self.initials(name))
            .omenTextStyle(OmenTypography.cardLead)
            .minimumScaleFactor(0.6)
            .foregroundStyle(isYours ? OmenColor.accentHover : OmenColor.textSecondary)
            .frame(width: side, height: side)
            .background(isYours ? OmenColor.accentMuted : OmenColor.surface2)
    }

    static func initials(_ name: String) -> String {
        // Skip the small words, so "Titans of Slopsilonia" is TS, not TO.
        let small: Set<String> = ["of", "the", "a", "an", "and", "me", "my", "de", "la"]
        let words = name.split(separator: " ").filter { !small.contains($0.lowercased()) }
        let letters = (words.isEmpty ? name.split(separator: " ") : words).prefix(2).compactMap(\.first)
        return letters.isEmpty ? "?" : String(letters).uppercased()
    }
}

/// A provider shown by name and colour, never a logo (founder, 2026-10-21).
struct OmenProviderMark: View {
    enum Style { case dot, tag }

    let platform: String
    var style: Style = .dot

    var body: some View {
        switch style {
        case .dot:
            HStack(spacing: OmenSpacing.step6) {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(name).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
            }
            .accessibilityElement(children: .combine)
        case .tag:
            Text(short)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(width: 44, height: 22)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(color.opacity(0.7), lineWidth: 1.5))
                .accessibilityLabel(name)
        }
    }

    var name: String { Self.displayName(platform) }

    static func displayName(_ platform: String?) -> String {
        switch platform?.lowercased() {
        case "espn": "ESPN"
        case "yahoo": "Yahoo"
        case "sleeper": "Sleeper"
        default: "Provider"
        }
    }

    private var short: String {
        switch platform.lowercased() {
        case "espn": "ESPN"
        case "yahoo": "YHOO"
        case "sleeper": "SLPR"
        default: platform.uppercased().prefix(4).description
        }
    }

    private var color: Color {
        switch platform.lowercased() {
        case "espn": OmenColor.Data.platformEspn
        case "yahoo": OmenColor.Data.platformYahoo
        case "sleeper": OmenColor.Data.platformSleeper
        default: OmenColor.textTertiary
        }
    }
}

/// The account avatar: initials for now (spec § 5; a photo is a later decision).
struct OmenAvatar: View {
    let initials: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(initials)
                .omenTextStyle(OmenTypography.cardLead)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(width: 40, height: 40)
                .background(OmenColor.surface2, in: Circle())
                .frame(width: 44, height: 44)
        }
        .buttonStyle(OmenPressedStyle())
        .accessibilityLabel("Account and support")
    }
}

// MARK: - Structure

/// Display-face section title in sentence case, with an optional quiet trailing count or link.
struct OmenSectionHeader: View {
    let title: String
    var trailing: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .omenTextStyle(OmenTypography.sectionHeader)
                .foregroundStyle(OmenColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing {
                if let action {
                    OmenBarTextButton(title: trailing, action: action)
                } else {
                    Text(trailing)
                        .omenTextStyle(OmenTypography.quiet)
                        .foregroundStyle(OmenColor.textTertiary)
                }
            }
        }
    }
}

/// The one surface on a screen that holds Omen's answer: raised, with a thin accent top edge.
struct OmenAnswerSurface<Content: View>: View {
    var padding: CGFloat = OmenSpacing.step20
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(OmenColor.surface1, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(alignment: .top) {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(OmenColor.accent.opacity(0.45), lineWidth: 1)
                    .mask(alignment: .top) { Rectangle().frame(height: 3) }
            }
    }
}

/// A number with what it means under it: "+1.9 / your lineup, a week", "Lean / confidence".
struct OmenFigure: View {
    let value: String
    let label: String
    var emphasized = false

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
            Text(value)
                .omenTextStyle(OmenTypography.figure)
                .foregroundStyle(emphasized ? OmenColor.accentHover : OmenColor.textPrimary)
            Text(label)
                .omenTextStyle(OmenTypography.quiet)
                .foregroundStyle(OmenColor.textTertiary)
        }
        .accessibilityElement(children: .combine)
    }
}

/// Two columns of number over label on one surface, hairline-split.
struct OmenStatGrid: View {
    struct Stat: Hashable {
        let label: String
        let value: String
    }

    let stats: [Stat]

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 1), GridItem(.flexible(), spacing: 1)], spacing: 1) {
            ForEach(stats, id: \.self) { stat in
                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(stat.value).omenTextStyle(OmenTypography.figure).foregroundStyle(OmenColor.textPrimary)
                    Text(stat.label).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(OmenSpacing.step12)
                .background(OmenColor.surface1)
                .accessibilityElement(children: .combine)
            }
        }
        .background(OmenColor.borderSubtle)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

/// A label and a value on one line, hairline under: "Snap share · 71%".
struct OmenKeyValueRow: View {
    let key: String
    let value: String
    var valueTone: Color = OmenColor.textPrimary

    var body: some View {
        HStack(spacing: OmenSpacing.step12) {
            Text(key).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            Spacer(minLength: OmenSpacing.step8)
            Text(value).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(valueTone).multilineTextAlignment(.trailing)
        }
        .frame(minHeight: 46)
        .overlay(alignment: .bottom) { OmenHairline() }
        .accessibilityElement(children: .combine)
    }
}

struct OmenHairline: View {
    var body: some View { Rectangle().fill(OmenColor.borderSubtle).frame(height: 1) }
}

// MARK: - States

/// One component, four meanings, each with its own words and one way out (spec § 5, State block).
struct OmenStateBlock: View {
    enum Kind {
        /// Omen checked and nothing beats what you have.
        case hold
        /// No move clears the bar this week.
        case nothingWorthDoing
        /// Inputs are missing; the message names the one that matters.
        case notEnoughToGoOn
        /// The request broke.
        case failed
        case loading
    }

    let kind: Kind
    let title: String
    var message: String?
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            if kind == .loading {
                ProgressView().tint(OmenColor.textTertiary)
            }
            Text(title)
                .omenTextStyle(kind == .hold ? OmenTypography.pageTitle : OmenTypography.sectionHeader)
                .foregroundStyle(OmenColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            if let message {
                Text(message)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let actionTitle, let action {
                OmenButton(
                    title: actionTitle,
                    action: action,
                    variant: kind == .failed || kind == .notEnoughToGoOn ? .primary : .secondary,
                    size: .lg
                )
                .padding(.top, OmenSpacing.step4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }
}

// MARK: - Sheets and docks

/// Sheet header: title, and a visible Close / Done beside the system grabber (spec § 3).
struct OmenSheetHeader: View {
    let title: String
    var eyebrow: String?
    var closeTitle = "Close"
    let onClose: () -> Void

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                if let eyebrow {
                    Text(eyebrow).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                }
                Text(title)
                    .omenTextStyle(OmenTypography.sectionHeader)
                    .foregroundStyle(OmenColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenBarTextButton(title: closeTitle, action: onClose)
        }
    }
}

/// The bottom action area of a focused task: the page fades into it.
struct OmenBottomDock<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(spacing: OmenSpacing.step12, content: content)
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step16)
            .padding(.bottom, OmenSpacing.step8)
            .background(
                LinearGradient(colors: [OmenColor.bg.opacity(0), OmenColor.bg], startPoint: .top, endPoint: .init(x: 0.5, y: 0.25))
                    .ignoresSafeArea()
            )
    }
}
