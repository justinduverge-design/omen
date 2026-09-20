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

/// A control that is drawn, named, and **not usable** — the `unavailable` carrier applied to an
/// affordance rather than to a data source.
///
/// This exists because of one line in `CONTRACTS.md` that is easy to satisfy the wrong way:
/// *"Current capability says `max_teams: 2`. Three-team controls must render unavailable until
/// that changes."* Unavailable, not hidden and not functional. Hiding the control would make the
/// product look like it never imagined a three-team trade; leaving it live would let a user build
/// an offer the server cannot score.
///
/// Carriers, per registry §2.3 and D7 — colour is never the only one:
///   - `text-tertiary` ink,
///   - a hairline outline rather than a filled surface,
///   - a **dashed** border, the `data-stub` shape,
///   - and, load-bearing, a sentence beside it saying why. The reason is the server's own
///     (`multi_team_comparison_not_implemented`), rendered as English by the caller.
///
/// It is deliberately **not** `.disabled()` on a live-looking control. A greyed button with no
/// explanation reads as a bug in the app; this reads as a limit of the product, which is what it
/// is. VoiceOver is told the same thing the sighted reader is told.
struct OmenUnavailableControl<Label: View>: View {
    /// What the control would do, for the accessibility label: "Add a third team".
    let name: String
    /// Why it cannot. One sentence, no jargon, no error code.
    let reason: String
    @ViewBuilder let label: () -> Label

    var body: some View {
        label()
            .foregroundStyle(OmenColor.textTertiary)
            .overlay(
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .foregroundStyle(OmenColor.border)
            )
            // No `Button`, no `onTapGesture`: a control that responds to a tap by doing nothing
            // is worse than one that plainly does not respond.
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(name). Unavailable. \(reason)")
    }
}

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
                        .frame(minHeight: OmenLayout.minTouchTarget)
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

/// `.pt` — one trade partner, with the hole their roster has.
///
/// `need` is the server's read of *their* roster and is optional for the reason every optional in
/// this journey is optional: a partner whose roster Omen could not read still belongs in the row,
/// and inventing "No hole" for them would be a claim about a roster nobody read.
struct OmenTradePartnerChip: View {
    let crest: String
    let name: String
    var need: String?
    var isSelected: Bool = false
    var action: (() -> Void)?

    var body: some View {
        Button(action: { action?() }) {
            VStack(spacing: OmenSpacing.step4) {
                Text(crest)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(isSelected ? OmenColor.accentHover : OmenColor.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(width: 44, height: 44)
                    .background(
                        RoundedRectangle(cornerRadius: 13, style: .continuous)
                            .fill(isSelected ? OmenColor.accentMuted : OmenColor.surface3)
                            .overlay(
                                RoundedRectangle(cornerRadius: 13, style: .continuous)
                                    .strokeBorder(isSelected ? OmenColor.accent : Color.clear, lineWidth: 2)
                            )
                    )
                Text(name)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(isSelected ? OmenColor.textPrimary : OmenColor.textTertiary)
                    .lineLimit(1)
                if let need {
                    Text(need)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.accent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            .frame(width: 66)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([name, need].compactMap { $0 }.joined(separator: ", "))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

/// `.fc` — a position filter, or the brass `.fc.smart` one that filters by the hole Omen found.
struct OmenTradeFilterChip: View {
    let title: String
    var isSelected: Bool = false
    /// The `.smart` variant: brass ink and a brass-tinted hairline. It is a different *kind* of
    /// filter — the others name a position, this one names a conclusion — so it reads differently.
    var isSmart: Bool = false
    var action: (() -> Void)?

    private var ink: Color {
        if isSelected { return OmenColor.textPrimary }
        return isSmart ? OmenColor.accent : OmenColor.textTertiary
    }

    var body: some View {
        Button(action: { action?() }) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(ink)
                .lineLimit(1)
                .padding(.horizontal, OmenSpacing.step10)
                .frame(minHeight: OmenLayout.minTouchTarget)
                .background(
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(isSelected ? OmenColor.surface3 : Color.clear)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .strokeBorder(
                            isSelected ? Color.clear : (isSmart ? OmenColor.accent.opacity(0.38) : OmenColor.borderSubtle),
                            lineWidth: 1
                        )
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

/// `.lrow` on `TradeRoster` — a player on someone else's roster, and what you may do about them.
///
/// The three trailing states are not decoration and they are not the same control:
///   - **available** — `Add to deal`, a real button;
///   - **theyNeedThis** — Omen's read that this manager is unlikely to move the player. It is
///     still tappable, because the artboard's own note is explicit: *"You can still offer; Omen
///     is telling you the odds, not stopping you."* A disabled row would turn advice into a rule.
///   - **added** — already in the offer.
struct OmenTradeRosterRow: View {
    enum Availability {
        case available
        case theyNeedThis
        case added
    }

    let name: String
    /// "WR · CIN · WR 3", or "WR · CIN · unranked" where no rank exists. Never a fabricated rank.
    let meta: String
    let availability: Availability
    var action: (() -> Void)?

    private var actionTitle: String {
        switch availability {
        case .available: return "Add to deal"
        case .theyNeedThis: return "They need this"
        case .added: return "In the deal"
        }
    }

    private var actionInk: Color {
        switch availability {
        case .available: return OmenColor.accent
        case .theyNeedThis: return OmenColor.textTertiary
        case .added: return OmenColor.textPrimary
        }
    }

    var body: some View {
        Button(action: { action?() }) {
            HStack(spacing: OmenSpacing.step10) {
                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(name)
                        .omenTextStyle(OmenTypography.name)
                        .foregroundStyle(availability == .theyNeedThis ? OmenColor.textTertiary : OmenColor.textPrimary)
                        .lineLimit(1)
                    Text(meta)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.textTertiary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Text(actionTitle)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(actionInk)
            }
            .padding(.vertical, OmenSpacing.step10)
            .frame(minHeight: OmenLayout.minTouchTarget)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(name). \(meta). \(actionTitle).")
    }
}

/// `TradeShare`'s inclusion row — one thing the card may carry, and whether it does.
///
/// **Names default to off** and that is a contract, not a preference: `CONTRACTS.md` says so for
/// `trade-share.v1`, and the artboard's own note gives the reason — a shared card should be
/// arguable on its own merits without telling a group chat which league you are in. The default
/// lives with the caller that builds the state; this control only shows and toggles it.
struct OmenTradeShareToggleRow: View {
    let title: String
    /// What that line would actually put on the card, so the choice is made with the value in
    /// view rather than in the abstract.
    let detail: String
    let isOn: Bool
    var action: (() -> Void)?

    var body: some View {
        Button(action: { action?() }) {
            HStack(spacing: OmenSpacing.step10) {
                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(title)
                        .omenTextStyle(OmenTypography.name)
                        .foregroundStyle(OmenColor.textPrimary)
                    Text(detail)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.textTertiary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                // The word, not a switch glyph, and not colour alone (D7). "On"/"Off" is what
                // the artboard draws and it is also the only carrier that survives a screenshot
                // in greyscale.
                Text(isOn ? "On" : "Off")
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(isOn ? OmenColor.textPrimary : OmenColor.textTertiary)
            }
            .padding(.vertical, OmenSpacing.step10)
            .frame(minHeight: OmenLayout.minTouchTarget)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title), \(detail)")
        .accessibilityValue(isOn ? "On" : "Off")
        .accessibilityHint("Double tap to turn \(isOn ? "off" : "on")")
    }
}
