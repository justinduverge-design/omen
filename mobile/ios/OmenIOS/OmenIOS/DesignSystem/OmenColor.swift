import SwiftUI
import UIKit

/// Core semantic color roles. Values are the live `index.css` hexes transcribed in
/// `omen-native-design-system-registry-v1.md` §2.2/§2.3 — do not hand-edit a hex here without
/// updating the registry row first (registry markdown is the source of truth).
///
/// Every token is a trait-aware dynamic `Color` (registry §2.6): feature code reads
/// `OmenColor.xxx` directly and gets the correct dark/light value automatically, with no
/// `@Environment(\.colorScheme)` plumbing required at the call site.
enum OmenColor {
    static let bg = dynamic(dark: 0x0A0A0B, light: 0xFAFAF9)
    static let surface1 = dynamic(dark: 0x1C1C1E, light: 0xFFFFFF)
    static let surface2 = dynamic(dark: 0x2C2C2E, light: 0xF5F5F4)
    static let surface3 = dynamic(dark: 0x3A3A3C, light: 0xEBEBEA)
    static let border = dynamic(dark: 0x3A3A3C, light: 0xE5E5E3)
    static let borderSubtle = dynamic(dark: 0x2C2C2E, light: 0xF0F0EE)
    static let textPrimary = dynamic(dark: 0xF5F0E8, light: 0x1C1C1E)
    static let textSecondary = dynamic(dark: 0xAEAEB2, light: 0x6B7280)
    static let textTertiary = dynamic(dark: 0x6D6D72, light: 0x9CA3AF)
    static let accent = dynamic(dark: 0xA67C2E, light: 0x7A5C1E)
    static let accentHover = dynamic(dark: 0xC49035, light: 0xA67C2E)
    static let accentMuted = dynamic(dark: 0x3A2A0A, light: 0xFEF3C7)
    static let textOnAccent = dynamic(dark: 0x0A0A0B, light: 0xFAFAF9)
    static let omen = dynamic(dark: 0x2F7D5B, light: 0x1A5C3E)
    static let umber = dynamic(dark: 0x5A3A25, light: 0x5A3A25)

    /// Derived from `accent`; solid stroke color for the focus-ring outline (registry §2.2, §4).
    static let focusRing = accent
    /// Soft halo layered behind `focusRing` — the "accent @ 40%" reading of the registry row.
    static let focusRingHalo = dynamic(dark: 0xA67C2E, light: 0x7A5C1E, alpha: 0.4)

    enum Data {
        // Data-semantic invariant tokens (registry §2.3) — never theme-overridden, except the
        // documented risk-low/risk-medium light-mode adjustment below.
        static let riskLow = dynamic(dark: 0x34C759, light: 0x16A34A)
        static let riskMedium = dynamic(dark: 0xFF9F0A, light: 0xD97706)
        static let riskHigh = invariant(0x7E1717)
        static let dataLive = invariant(0x34C759)
        static let dataStub = invariant(0xFF9F0A)
        static let dataMock = invariant(0x636366)
        static let dataUnavailable = invariant(0x3A3A3C)
        static let confidenceFloor = invariant(0x701020)
        static let confidenceCeiling = invariant(0x206F3A)
        static let posRb = invariant(0x34D399)
        static let posWr = invariant(0x60A5FA)
        static let posQb = invariant(0xFB923C)
        static let posTe = invariant(0xC084FC)
        static let posDef = invariant(0xF472B6)
        static let posK = invariant(0xA3A3A3)
        static let platformSleeper = invariant(0x1FA3E8)
        static let platformYahoo = invariant(0x410093)
        static let platformEspn = invariant(0xC81E2C)
        static let demoText = invariant(0x7DD3FC)
        static let demoTextSecondary = invariant(0xBAE6FD, alpha: 0.8)
    }

    /// A color with the same value in both dark and light mode (data-semantic invariant rule).
    private static func invariant(_ hex: UInt32, alpha: CGFloat = 1) -> Color {
        dynamic(dark: hex, light: hex, alpha: alpha)
    }

    private static func dynamic(dark: UInt32, light: UInt32, alpha: CGFloat = 1) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(omenHex: dark, alpha: alpha)
                : UIColor(omenHex: light, alpha: alpha)
        })
    }
}

private extension UIColor {
    convenience init(omenHex hex: UInt32, alpha: CGFloat) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}
