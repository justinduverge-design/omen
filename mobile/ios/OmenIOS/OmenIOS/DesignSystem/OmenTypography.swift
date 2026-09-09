import SwiftUI
import UIKit

/// Native font-family seam (registry §2.4; m1-native-typography-build-brief-v1.md §3).
///
/// **One typeface, founder decision 2026-09-07.** The app previously carried a three-family role
/// split — Alegreya Sans for UI, Alegreya for reading copy, DM Mono for eyebrow/chip/numeric.
/// No font files had ever been committed, so that split rendered as SF Pro / New York / SF Mono
/// on device and was never seen in its intended faces. The founder judged the result and chose to
/// collapse to a single family rather than ship the three. Alegreya Sans is now the only family in
/// the app; hierarchy is carried by size, weight, tracking and case alone.
///
/// This supersedes `W2-Typography`, which retired only DM Mono.
///
/// The files are committed under `OmenIOS/Fonts/` under the SIL Open Font License 1.1 with
/// `OFL.txt` intact, and registered through `UIAppFonts` in `Info.plist`.
///
/// **Alegreya Sans has no 600 weight** (the family ships 100/300/400/500/700/800/900), so the
/// two `.semibold` roles resolve to Bold. That is the same resolution the design canvas produced
/// — CSS font matching promotes 600 to 700 against this family — so the shipped app matches the
/// artboards the founder approved rather than silently synthesising a weight.
///
/// No call site may name a font family directly (registry §2.6); this enum stays the only seam.
private enum OmenFontFamily {
    /// The one family. `nil` from `UIFont(name:size:)` means the resource failed to register,
    /// in which case the role falls back to the system face rather than rendering nothing.
    static func postScriptName(for weight: UIFont.Weight) -> String {
        switch weight {
        case .bold, .heavy, .black, .semibold: return "AlegreyaSans-Bold"
        case .medium: return "AlegreyaSans-Medium"
        default: return "AlegreyaSans-Regular"
        }
    }

    /// Retained as the fallback shape if the bundled resource ever fails to load.
    static let fallbackDesign: UIFontDescriptor.SystemDesign = .default
}

/// One shared type role. `size`/`lineHeight` are literal points from the locked role map
/// (typography brief §2); scaling comes from `UIFontMetrics`, matching every role to the
/// closest system Dynamic Type category so custom sizes still grow/shrink with the user's
/// accessibility text-size setting (brief §4 iOS — "custom fonts must scale through the
/// system's relative-style mechanism").
struct OmenTypeRoleSpec {
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
        if let named = UIFont(name: OmenFontFamily.postScriptName(for: weight), size: size) {
            return named
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

/// The ten locked roles from the registry §2.4 / typography brief §2.
enum OmenTypography {
    static let display = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 48, weight: .bold,
        relativeTo: .largeTitle, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let h1 = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 32, weight: .bold,
        relativeTo: .title1, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let h2 = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 20, weight: .semibold,
        relativeTo: .title2, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let h3 = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 16, weight: .semibold,
        relativeTo: .title3, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let body = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 15, weight: .regular,
        relativeTo: .body, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let bodySmall = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 13, weight: .regular,
        relativeTo: .footnote, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let label = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 12, weight: .medium,
        relativeTo: .caption1, tracking: 12 * 0.05, uppercase: false, tabularNumbers: false
    )
    static let eyebrow = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 12, weight: .medium,
        relativeTo: .caption1, tracking: 12 * 0.12, uppercase: true, tabularNumbers: false
    )
    static let chip = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 11, weight: .medium,
        relativeTo: .caption2, tracking: 11 * 0.10, uppercase: true, tabularNumbers: false
    )
    static let numeric = OmenTypeRoleSpec(
        design: OmenFontFamily.fallbackDesign, size: 15, weight: .medium,
        relativeTo: .body, tracking: 0, uppercase: false, tabularNumbers: true
    )
}

extension View {
    /// Applies an Omen type role's font, tracking, case, and tabular-figure treatment together
    /// so a call site can never apply the font while forgetting the role's tracking/case rule.
    func omenTextStyle(_ role: OmenTypeRoleSpec) -> some View {
        let appliedFont = role.tabularNumbers ? role.font.monospacedDigit() : role.font
        return self
            .font(appliedFont)
            .tracking(role.tracking)
            .textCase(role.uppercase ? .uppercase : nil)
    }
}
