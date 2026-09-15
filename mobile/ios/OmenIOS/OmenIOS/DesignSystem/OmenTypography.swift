import SwiftUI
import UIKit
import CoreText

/// Registry §2.4: the two bundled Wix Madefor optical cuts, resolved through one native seam.
///
/// Both files are **variable fonts** carrying a single `wght` axis, 400–800, with named
/// instances at Regular/Medium/SemiBold/Bold/ExtraBold. The `rawValue` is the PostScript name of
/// the *default* instance — which is what `UIAppFonts` registration exposes — and a weight is
/// selected by setting the axis, never by asking for a differently-named face.
///
/// **Why the axis and not a weight trait.** Applying `UIFontDescriptor.TraitKey.weight` to a
/// descriptor that already names a concrete face does not move a variable font off its default
/// instance: the returned font is still `WixMadeforDisplay-Regular` with no axis coordinate set,
/// so every role renders at 400 and the whole ramp goes flat. That is not a theory — it was the
/// shipped behaviour of this file on 2026-09-15, and it is invisible to any test that asserts a
/// family name, because the family name is identical either way. `TypographyDerivationTests`
/// asserts the resolved *face* per role for exactly this reason.
///
/// No call site may name a font directly (registry §2.6); this enum stays the only seam. It is
/// internal rather than private only so the role guard test can read `role.family`.
enum OmenFontFamily: String {
    case display = "WixMadeforDisplay-Regular"
    case text = "WixMadeforText-Regular"

    /// The OpenType `wght` axis tag, `'w' 'g' 'h' 't'` packed big-endian.
    static let weightAxis = 0x77676874

    /// Maps a `UIFont.Weight` onto the axis. The axis tops out at 800, so `.black` is clamped
    /// here deliberately rather than left for CoreText to clamp silently — an explicit ceiling
    /// is reviewable; a silent one is the class of bug this file already shipped once.
    static func axisValue(for weight: UIFont.Weight) -> Int {
        switch weight {
        case .medium: return 500
        case .semibold: return 600
        case .bold: return 700
        case .heavy, .black: return 800
        default: return 400
        }
    }
}

/// One shared type role. `size`/`lineHeight` are literal points from the locked role map
/// (typography brief §2); scaling comes from `UIFontMetrics`, matching every role to the
/// closest system Dynamic Type category so custom sizes still grow/shrink with the user's
/// accessibility text-size setting (brief §4 iOS — "custom fonts must scale through the
/// system's relative-style mechanism").
struct OmenTypeRoleSpec {
    let family: OmenFontFamily
    let lineHeight: CGFloat
    let design: UIFontDescriptor.SystemDesign
    let size: CGFloat
    let weight: UIFont.Weight
    let relativeTo: UIFont.TextStyle
    /// Letter spacing in points (converted from the registry's em value at this role's size).
    let tracking: CGFloat
    let uppercase: Bool
    let tabularNumbers: Bool

    var font: Font {
        let scaled = UIFontMetrics(forTextStyle: relativeTo).scaledFont(for: resolvedUIFont)
        return Font(scaled)
    }

    /// The unscaled face this role resolves to. Exposed so a test can assert the app is running
    /// on the real family rather than on a system stand-in — the failure that went unnoticed for
    /// the whole life of the three-family seam.
    var resolvedUIFont: UIFont {
        // `UIFont(name:)` is the probe for "did the resource actually register?" — it returns
        // nil when the family is missing, which is the failure this whole seam exists to expose.
        // The font itself is then built from name + `wght` axis, which is the only mechanism that
        // moves a variable font off its default instance. See `OmenFontFamily` above.
        if UIFont(name: family.rawValue, size: size) != nil {
            let descriptor = UIFontDescriptor(fontAttributes: [
                .name: family.rawValue,
                UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String): [
                    OmenFontFamily.weightAxis: OmenFontFamily.axisValue(for: weight),
                ],
            ])
            return UIFont(descriptor: descriptor, size: size)
        }
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        let descriptor = base.fontDescriptor.withDesign(design) ?? base.fontDescriptor
        return UIFont(descriptor: descriptor, size: size)
    }

    /// The **same role at a display size**. Family, tracking, case and tabular-figure rule are
    /// carried over unchanged; only the point size and weight move.
    ///
    /// This exists so a call site that needs a 24pt scoreboard number does not reach for
    /// `.font(.system(size: 28, weight: .medium))` and silently leave the type system — which
    /// is exactly what `OmenMatchupHero` did for two builds. A raw `.system` call resolves to
    /// the platform sans no matter which family the role owns, so the scores rendered in a
    /// different face from every other number in the app, and they would not have followed the
    /// real Alegreya/DM Mono resources in when those land.
    ///
    /// `relativeTo` is kept, so a derived size still scales with Dynamic Type.
    ///
    /// This is not a new role and does not widen the registry §2.4 role map: the ten roles
    /// below are still the only entry points, and a derivation is always traceable to one.
    func at(size: CGFloat, weight: UIFont.Weight? = nil) -> OmenTypeRoleSpec {
        OmenTypeRoleSpec(
            family: family,
            lineHeight: lineHeight * (size / self.size),
            design: design,
            size: size,
            weight: weight ?? self.weight,
            relativeTo: relativeTo,
            // Tracking is expressed in points at the role's own size, so a size change has to
            // carry it proportionally or a 27pt number would wear a 12pt label's letter spacing.
            tracking: self.size == 0 ? tracking : tracking * (size / self.size),
            uppercase: uppercase,
            tabularNumbers: tabularNumbers
        )
    }
}

/// The fifteen roles of registry §2.4, as resolved by C7 on 2026-09-13 ("the canvas wins, and
/// the registry grows to fit it"). Sizes sit on the fourteen-step ramp
/// `10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 27 · 32 · 48`, floor 10.
///
/// **`relativeTo` is chosen per role, by size.** Each role is matched to the system text style
/// closest to its own point size, so the Dynamic Type curve applied to it is the one Apple
/// designed for text at that size — large styles grow proportionally less at accessibility
/// sizes than small ones, which is what keeps a 48pt hero and a 10pt eyebrow in the same
/// relationship after scaling.
///
/// This was briefly collapsed to two styles — every Display role on `.title2`, every Text role
/// on `.body` — which made a 48pt hero scale at the same rate as an 18pt sub-header and a 10pt
/// eyebrow scale like body copy. Restored 2026-09-15. Behaviour at 200% is still unproven and
/// belongs to `F11`; this file's job is to make the curve per-role rather than uniform.
///
/// Tracking is stored in **points at the role's own size**, written as the registry's em value
/// times that size so the derivation stays visible and survives a size change.
enum OmenTypography {
    static let display = OmenTypeRoleSpec(family: .display, lineHeight: 56, design: .default, size: 48, weight: .heavy, relativeTo: .largeTitle, tracking: 0, uppercase: false, tabularNumbers: false)
    static let h1 = OmenTypeRoleSpec(family: .display, lineHeight: 40, design: .default, size: 32, weight: .heavy, relativeTo: .title1, tracking: 0, uppercase: false, tabularNumbers: false)
    static let scoreLead = OmenTypeRoleSpec(family: .display, lineHeight: 28, design: .default, size: 27, weight: .heavy, relativeTo: .title2, tracking: 0, uppercase: false, tabularNumbers: true)
    static let call = OmenTypeRoleSpec(family: .display, lineHeight: 26, design: .default, size: 24, weight: .heavy, relativeTo: .title2, tracking: 0, uppercase: false, tabularNumbers: false)
    static let scoreTrail = OmenTypeRoleSpec(family: .display, lineHeight: 24, design: .default, size: 22, weight: .heavy, relativeTo: .title3, tracking: 0, uppercase: false, tabularNumbers: true)
    static let screenTitle = OmenTypeRoleSpec(family: .display, lineHeight: 26, design: .default, size: 22, weight: .heavy, relativeTo: .title3, tracking: 0, uppercase: false, tabularNumbers: false)
    static let h2 = OmenTypeRoleSpec(family: .display, lineHeight: 26, design: .default, size: 20, weight: .bold, relativeTo: .title3, tracking: 0, uppercase: false, tabularNumbers: false)
    static let h3 = OmenTypeRoleSpec(family: .display, lineHeight: 24, design: .default, size: 18, weight: .bold, relativeTo: .headline, tracking: 0, uppercase: false, tabularNumbers: false)
    static let body = OmenTypeRoleSpec(family: .text, lineHeight: 22, design: .default, size: 15, weight: .regular, relativeTo: .body, tracking: 0, uppercase: false, tabularNumbers: false)
    static let cardLead = OmenTypeRoleSpec(family: .display, lineHeight: 18, design: .default, size: 14, weight: .bold, relativeTo: .subheadline, tracking: 0, uppercase: false, tabularNumbers: false)
    static let name = OmenTypeRoleSpec(family: .text, lineHeight: 16, design: .default, size: 13, weight: .bold, relativeTo: .subheadline, tracking: 0, uppercase: false, tabularNumbers: false)
    static let bodySmall = OmenTypeRoleSpec(family: .text, lineHeight: 17, design: .default, size: 12, weight: .regular, relativeTo: .footnote, tracking: 0, uppercase: false, tabularNumbers: false)
    static let label = OmenTypeRoleSpec(family: .text, lineHeight: 14, design: .default, size: 11, weight: .bold, relativeTo: .caption1, tracking: 11 * 0.12, uppercase: true, tabularNumbers: false)
    static let micro = OmenTypeRoleSpec(family: .text, lineHeight: 13, design: .default, size: 10, weight: .heavy, relativeTo: .caption2, tracking: 10 * 0.16, uppercase: true, tabularNumbers: false)
    static let numeric = OmenTypeRoleSpec(family: .display, lineHeight: 22, design: .default, size: 15, weight: .heavy, relativeTo: .body, tracking: 0, uppercase: false, tabularNumbers: true)
}

extension View {
    /// Applies an Omen type role's font, tracking, case, and tabular-figure treatment together
    /// so a call site can never apply the font while forgetting the role's tracking/case rule.
    func omenTextStyle(_ role: OmenTypeRoleSpec) -> some View {
        let appliedFont = role.tabularNumbers ? role.font.monospacedDigit() : role.font
        return self
            .font(appliedFont)
            .tracking(role.tracking)
            .lineSpacing(max(0, role.lineHeight - role.resolvedUIFont.lineHeight))
            .textCase(role.uppercase ? .uppercase : nil)
    }
}
