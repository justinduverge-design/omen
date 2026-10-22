import SwiftUI

// Foundation v1 player patterns (spec § 5: Player row, Omen read block, Start / sit pair).

/// What every player pattern draws, independent of which API answered. Missing values stay nil and their
/// element is left out; nothing is ever shown as zero (spec § 6).
struct OmenPlayerSummary: Equatable, Identifiable {
    let id: String
    let name: String
    var position: String?
    var team: String?
    var number: Int?
    /// Omen's forecast points this week.
    var omenPoints: Double?
    /// The provider's forecast points this week.
    var providerPoints: Double?
    var providerName: String = "Provider"
    var grade: Int?
    /// The server's forecast-authority result: which source's number is set larger (spec § 2).
    var lead: Lead = .unresolved
    /// One quiet line under the name: "LAR · Sun 4:25", "Out · can't be traded".
    var detail: String?
    /// The player cannot be added to a trade (game started, provider lock, injured reserve).
    var locked = false

    enum Lead: Equatable { case omen, provider, unresolved }

    static func one(_ value: Double) -> String { String(format: "%.1f", value) }
}

/// The player row (named OmenRosterRow beside the older OmenPlayerRow, which retires), in the three variants of spec § 5.
struct OmenRosterRow: View {
    enum Variant {
        /// A list you browse: the whole row opens the player.
        case browse(onOpen: () -> Void)
        /// Both forecasts with sources, the whole row opens the player.
        case compare(onOpen: () -> Void)
        /// A list you pick from: the row toggles the pick, a separate info control opens the player.
        case pick(selected: Bool, onToggle: () -> Void, onInfo: () -> Void)
    }

    let player: OmenPlayerSummary
    let variant: Variant
    var showsGrade = false

    var body: some View {
        switch variant {
        case .browse(let onOpen), .compare(let onOpen):
            OmenPressable(action: onOpen) { rowContent }
                .accessibilityElement(children: .combine)
                .accessibilityHint("Opens \(player.name)'s page")
        case .pick(let selected, let onToggle, let onInfo):
            HStack(spacing: OmenSpacing.step8) {
                OmenPressable(action: onToggle) {
                    HStack(spacing: OmenSpacing.step12) {
                        check(selected)
                        rowContent
                    }
                }
                .disabled(player.locked)
                .opacity(player.locked ? 0.45 : 1)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(player.locked ? "\(player.name), can't be traded" : player.name)
                .accessibilityHint(player.locked ? "" : selected ? "Removes him from the trade" : "Adds him to the trade")
                .accessibilityAddTraits(selected ? .isSelected : [])
                OmenPressable(action: onInfo) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(OmenColor.textTertiary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("\(player.name) details")
            }
        }
    }

    private var rowContent: some View {
        HStack(spacing: OmenSpacing.step12) {
            OmenPlayerBadge(team: player.team, number: player.number, position: player.position)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(player.name)
                    .omenTextStyle(OmenTypography.rowTitle)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(2)
                if let detail = player.detail ?? defaultDetail {
                    Text(detail)
                        .omenTextStyle(OmenTypography.quiet)
                        .foregroundStyle(OmenColor.textTertiary)
                }
            }
            Spacer(minLength: OmenSpacing.step8)
            trailing
        }
        .frame(minHeight: 58)
    }

    private var defaultDetail: String? {
        [player.position, player.team].compactMap { $0 }.joined(separator: " \u{00B7} ").nilIfEmpty
    }

    @ViewBuilder
    private var trailing: some View {
        if showsGrade {
            OmenGradeRing(grade: player.grade)
        } else if case .compare = variant {
            VStack(alignment: .trailing, spacing: OmenSpacing.step2) {
                if let omen = player.omenPoints {
                    Text("Omen \(OmenPlayerSummary.one(omen))")
                        .omenTextStyle(player.lead == .provider ? OmenTypography.quiet : OmenTypography.numeric)
                        .foregroundStyle(player.lead == .provider ? OmenColor.textTertiary : OmenColor.textPrimary)
                }
                if let provider = player.providerPoints {
                    Text("\(player.providerName) \(OmenPlayerSummary.one(provider))")
                        .omenTextStyle(player.lead == .provider ? OmenTypography.numeric : OmenTypography.quiet)
                        .foregroundStyle(player.lead == .provider ? OmenColor.textPrimary : OmenColor.textTertiary)
                }
            }
        } else if let points = player.omenPoints ?? player.providerPoints {
            Text(OmenPlayerSummary.one(points))
                .omenTextStyle(OmenTypography.numeric)
                .foregroundStyle(OmenColor.textPrimary)
        }
    }

    private func check(_ selected: Bool) -> some View {
        ZStack {
            Circle()
                .strokeBorder(selected ? OmenColor.accent : OmenColor.border, lineWidth: 2)
                .background(Circle().fill(selected ? OmenColor.accent : .clear))
            if player.locked {
                Image(systemName: "lock.fill").font(.system(size: 11, weight: .bold)).foregroundStyle(OmenColor.textTertiary)
            } else if selected {
                Image(systemName: "checkmark").font(.system(size: 12, weight: .heavy)).foregroundStyle(OmenColor.textOnAccent)
            }
        }
        .frame(width: 26, height: 26)
        .frame(width: 32, height: 44)
    }
}

/// The Omen grade, 0-100, as a ring: accent stroke when 80+, a quieter stroke below, dashed when missing.
struct OmenGradeRing: View {
    let grade: Int?
    var side: CGFloat = 40

    var body: some View {
        Text(grade.map(String.init) ?? "\u{2014}")
            .omenTextStyle(side > 50 ? OmenTypography.figure : OmenTypography.cardLead)
            .foregroundStyle(grade == nil ? OmenColor.textTertiary : OmenColor.textPrimary)
            .frame(width: side, height: side)
            .overlay(
                Circle().stroke(
                    (grade ?? 0) >= 80 ? OmenColor.accent : OmenColor.border,
                    style: StrokeStyle(lineWidth: side > 50 ? 3 : 2, dash: grade == nil ? [3, 3] : [])
                )
            )
            .accessibilityLabel(grade.map { "Omen grade \($0)" } ?? "No Omen grade")
    }
}

/// Omen's read: the forecasts with their sources, the grade, and up to three reasons the server returned.
/// Which number is set larger follows the server's authority result; never invented here (spec § 2).
struct OmenReadBlock: View {
    struct Reason: Hashable {
        let text: String
        let points: Double
    }

    let player: OmenPlayerSummary
    var reasons: [Reason] = []
    var title = "Omen\u{2019}s read"

    var body: some View {
        OmenAnswerSurface {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                        Text(title).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                        numbers
                    }
                    Spacer(minLength: OmenSpacing.step12)
                    if player.grade != nil {
                        VStack(spacing: OmenSpacing.step6) {
                            OmenGradeRing(grade: player.grade, side: 64)
                            Text("Omen grade").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        }
                    }
                }
                if !reasons.isEmpty {
                    OmenHairline()
                    VStack(spacing: OmenSpacing.step12) {
                        ForEach(reasons.prefix(3), id: \.self) { reason in
                            HStack {
                                Text(reason.text).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
                                Spacer(minLength: OmenSpacing.step8)
                                Text((reason.points >= 0 ? "+" : "\u{2212}") + OmenPlayerSummary.one(abs(reason.points)))
                                    .omenTextStyle(OmenTypography.numeric)
                                    .foregroundStyle(reason.points >= 0 ? OmenColor.accentHover : OmenColor.textSecondary)
                            }
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var numbers: some View {
        let omenLeads = player.lead == .omen
        let providerLeads = player.lead == .provider
        if let omen = player.omenPoints, !providerLeads {
            lead(value: omen, source: "Omen")
            if let provider = player.providerPoints {
                second(source: player.providerName, value: provider)
            }
        } else if let provider = player.providerPoints, !omenLeads {
            lead(value: provider, source: player.providerName)
            if let omen = player.omenPoints { second(source: "Omen", value: omen) }
        }
        if player.lead == .unresolved, player.omenPoints != nil, player.providerPoints != nil {
            Text("Neither has the better record for this yet.")
                .omenTextStyle(OmenTypography.quiet)
                .foregroundStyle(OmenColor.textTertiary)
        }
    }

    private func lead(value: Double, source: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: OmenSpacing.step6) {
            Text(OmenPlayerSummary.one(value)).omenTextStyle(OmenTypography.heroNumber).foregroundStyle(OmenColor.textPrimary)
            Text(source).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textTertiary)
        }
        .accessibilityElement(children: .combine)
    }

    private func second(source: String, value: Double) -> some View {
        Text("\(source) \(OmenPlayerSummary.one(value))")
            .omenTextStyle(OmenTypography.body)
            .foregroundStyle(OmenColor.textSecondary)
    }
}

/// Two players side by side, the one to act on outlined in the accent. Stacks at large text sizes.
struct OmenSidePair: View {
    struct Side {
        let label: String
        let player: OmenPlayerSummary
        var value: String?
        var valueCaption: String?
        var onOpen: (() -> Void)?
    }

    let primary: Side
    let secondary: Side
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: OmenSpacing.step10)) : AnyLayout(HStackLayout(spacing: OmenSpacing.step10))
        layout {
            card(primary, emphasized: true)
            card(secondary, emphasized: false)
        }
    }

    private func card(_ side: Side, emphasized: Bool) -> some View {
        let content = VStack(spacing: OmenSpacing.step6) {
            Text(side.label).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(emphasized ? OmenColor.accentHover : OmenColor.textTertiary)
            OmenPlayerBadge(team: side.player.team, number: side.player.number, position: side.player.position)
            Text(side.player.name)
                .omenTextStyle(OmenTypography.rowTitle)
                .foregroundStyle(emphasized ? OmenColor.textPrimary : OmenColor.textSecondary)
                .multilineTextAlignment(.center)
            if let value = side.value {
                Text(value).omenTextStyle(OmenTypography.figure).foregroundStyle(emphasized ? OmenColor.textPrimary : OmenColor.textTertiary)
            }
            if let caption = side.valueCaption {
                Text(caption).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(OmenSpacing.step14)
        .background(OmenColor.surface1, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(emphasized ? OmenColor.accent : .clear, lineWidth: 1.5))

        return Group {
            if let onOpen = side.onOpen {
                OmenPressable(action: onOpen) { content }
                    .accessibilityElement(children: .combine)
                    .accessibilityHint("Opens \(side.player.name)'s page")
            } else {
                content.accessibilityElement(children: .combine)
            }
        }
    }
}

extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
