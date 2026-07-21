import SwiftUI
import UIKit

/// Native font-family seam (registry §2.4; m1-native-typography-build-brief-v1.md §3).
/// Alegreya Sans / Alegreya / DM Mono are the locked families, but font-file acquisition is a
/// separately approved asset/license decision not yet made (brief §7). Until then this resolves
/// to `UIFontDescriptor.SystemDesign` fallbacks chosen to preserve the *shape* of the role split
/// — default (sans) for UI/headings, serif for long-form reading, monospaced for numeric/
/// code-adjacent values — so the hierarchy degrades gracefully rather than collapsing to one
/// face. Swapping in the real font resources is a one-line change here; no call site may
/// reference a font family directly (registry §2.6).
private enum OmenFontDesign {
    static let alegreyaSans: UIFontDescriptor.SystemDesign = .default
    static let alegreya: UIFontDescriptor.SystemDesign = .serif
    static let dmMono: UIFontDescriptor.SystemDesign = .monospaced
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
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        let descriptor = base.fontDescriptor.withDesign(design) ?? base.fontDescriptor
        let designed = UIFont(descriptor: descriptor, size: size)
        let scaled = UIFontMetrics(forTextStyle: relativeTo).scaledFont(for: designed)
        return Font(scaled)
    }
}

/// The ten locked roles from the registry §2.4 / typography brief §2.
enum OmenTypography {
    static let display = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreyaSans, size: 48, weight: .bold,
        relativeTo: .largeTitle, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let h1 = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreyaSans, size: 32, weight: .bold,
        relativeTo: .title1, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let h2 = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreyaSans, size: 20, weight: .semibold,
        relativeTo: .title2, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let h3 = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreyaSans, size: 16, weight: .semibold,
        relativeTo: .title3, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let body = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreya, size: 15, weight: .regular,
        relativeTo: .body, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let bodySmall = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreya, size: 13, weight: .regular,
        relativeTo: .footnote, tracking: 0, uppercase: false, tabularNumbers: false
    )
    static let label = OmenTypeRoleSpec(
        design: OmenFontDesign.alegreyaSans, size: 12, weight: .medium,
        relativeTo: .caption1, tracking: 12 * 0.05, uppercase: false, tabularNumbers: false
    )
    static let eyebrow = OmenTypeRoleSpec(
        design: OmenFontDesign.dmMono, size: 12, weight: .medium,
        relativeTo: .caption1, tracking: 12 * 0.12, uppercase: true, tabularNumbers: false
    )
    static let chip = OmenTypeRoleSpec(
        design: OmenFontDesign.dmMono, size: 11, weight: .medium,
        relativeTo: .caption2, tracking: 11 * 0.10, uppercase: true, tabularNumbers: false
    )
    static let numeric = OmenTypeRoleSpec(
        design: OmenFontDesign.dmMono, size: 15, weight: .medium,
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
