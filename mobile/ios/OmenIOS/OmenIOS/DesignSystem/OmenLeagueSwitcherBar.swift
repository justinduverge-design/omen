import SwiftUI

/// E005–E012 of the native visual lock: the league/team switcher **bar**.
///
/// ## Why this is not `OmenContextStrip`
///
/// `OmenContextStrip` (registry §3.2, Figma `25:2`) is the approved *card* — a rounded
/// `surface-1` panel with an `h3` team name and a platform badge, sized to sit above the
/// Command Center matchup. The artboards draw something structurally different: a **49pt bar**
/// flush to the screen edges, closed by a hairline, carrying a 28pt crest, a 13pt name, a 10pt
/// uppercase provider line with a 7pt provider-hex square, a chevron and a `+`.
///
/// Under the 2026-09-18 precedence decision the artboard owns composition, so this is a new
/// component rather than a re-skin of the card. **Both now exist on purpose.** The card stays
/// Command Center's until `U3` rebuilds that destination against `CommandCenter.dc.html`, whose
/// artboard also draws this bar — retiring the card is that item's call, not this one's.
///
/// ## Why it was missing
///
/// This bar is in the contract of every screen that has one and was never built. It is not a
/// scheduled item: it sits inside `U1-OmenScreen`, which is still `READY`, and two later items
/// (`V-CanvasConformance`'s 44pt touch targets) already assume it exists. It appears on 25 of
/// the 30 artboards, so it is built once here and inherited by every journey after J3.
struct OmenLeagueSwitcherBar: View {
    /// The crest monogram (E006). Derived by the caller from the team name — never invented
    /// here, because a crest is a claim about identity and a wrong one is worse than none.
    let crest: String
    /// E008. The team as the provider names it.
    let teamName: String
    let platform: OmenPlatform
    /// E009's second half. Optional for the same reason `OmenContextStrip`'s is: ESPN genuinely
    /// failed to return a league name for every user until the adapter learned to read it.
    /// Omitting the clause is honest; inventing one is not.
    var leagueName: String?
    /// E011. Absent when there is nowhere to switch to — a chevron that opens nothing is a lie
    /// about what the bar can do.
    var onSwitch: (() -> Void)?
    /// E012. Absent when the product cannot currently add a league.
    var onAddLeague: (() -> Void)?

    private var providerLine: String {
        let provider: String
        switch platform {
        case .espn: provider = "ESPN"
        case .yahoo: provider = "Yahoo"
        case .sleeper: provider = "Sleeper"
        }
        guard let leagueName, !leagueName.isEmpty else { return provider }
        return "\(provider) · \(leagueName)"
    }

    private var providerChip: Color {
        switch platform {
        case .espn: return OmenColor.Data.platformEspnChip
        case .yahoo: return OmenColor.Data.platformYahooChip
        case .sleeper: return OmenColor.Data.platformSleeperChip
        }
    }

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            crestMark
            identity
            if onSwitch != nil {
                Image(systemName: "chevron.down")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(OmenColor.textTertiary)
                    .accessibilityHidden(true)
            }
            if let onAddLeague {
                Button(action: onAddLeague) {
                    Image(systemName: "plus")
                        .font(.system(size: 17, weight: .regular))
                        .foregroundStyle(OmenColor.accent)
                        // E012 draws a 13x18 glyph. `V-CanvasConformance` requires the target
                        // reach 44pt without growing the glyph, so the frame grows and the
                        // symbol does not.
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Add a league")
            }
        }
        .padding(.leading, OmenSpacing.step16)
        .padding(.trailing, onAddLeague == nil ? OmenSpacing.step16 : OmenSpacing.step2)
        .padding(.top, OmenSpacing.step8)
        .padding(.bottom, OmenSpacing.step10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .bottom) {
            // E005 closes with a hairline, not a card edge. 0.5pt is an optical hairline and is
            // exempt from the spacing scale by design.
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 0.5)
        }
    }

    /// E006. A brass-lipped gradient tile, per the artboard's `canvas-gradient(surface-2 ->
    /// surface-1)` with an accent-hover monogram.
    private var crestMark: some View {
        Text(crest)
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(OmenColor.accentHover)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(width: 28, height: 28)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [OmenColor.surface2, OmenColor.surface1],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            )
            .accessibilityHidden(true)
    }

    /// E007–E010.
    private var identity: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
            Text(teamName)
                .omenTextStyle(OmenTypography.name)
                .foregroundStyle(OmenColor.textPrimary)
                .lineLimit(1)
                .truncationMode(.tail)
            HStack(spacing: OmenSpacing.step4) {
                // E010. The provider hex is the sole colour exception in this chrome, and it is
                // never the only carrier — the provider is named in the text beside it (D7).
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(providerChip)
                    .frame(width: 7, height: 7)
                    .accessibilityHidden(true)
                Text(providerLine)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .onTapGesture { onSwitch?() }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(teamName), \(providerLine)")
        .accessibilityHint(onSwitch == nil ? "" : "Switch team or league")
        .accessibilityAddTraits(onSwitch == nil ? [] : .isButton)
    }
}
