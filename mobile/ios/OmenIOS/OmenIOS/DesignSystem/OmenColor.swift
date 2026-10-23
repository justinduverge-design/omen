import SwiftUI
import UIKit

/// Core semantic color roles. Values are the live `index.css` hexes transcribed in
/// `omen-native-design-system-registry-v1.md` §2.2/§2.3 — do not hand-edit a hex here without
/// updating the registry row first (registry markdown is the source of truth).
///
/// **Neutral light ramp, 2026-10-19.** Founder: light mode, not beige. The light values below are
/// the whole-app canvas's (`design/whole-app-canvas-2026-10-19/BUILD.md`); accent is `#8A5E10` (5.3:1
/// on `bg`), the canvas's `#9A6A16` falling just short of 4.5:1 for text. The dark ramp is unchanged.
///
/// **Warm neutral ramp, 2026-09-11** (light values since replaced). The light ramp was Tailwind's cold grey on a
/// brass-and-umber brand; it is now derived from the approved core (Bone White, Weathered
/// Umber). `border` also changed role — it is the sole visible boundary of text fields,
/// pickers, OTP cells and outlined buttons, and shipped at 1.08:1, so it now clears WCAG
/// 1.4.11's 3:1. Ratios and the residual (`surface3`) are in registry §2.2. The ratios are
/// enforced by Android's `OmenColorContrastTest`; this file staying equal to its Kotlin twin
/// is enforced by `scripts/check-token-parity.js`.
///
/// Every token is a trait-aware dynamic `Color` (registry §2.6): feature code reads
/// `OmenColor.xxx` directly and gets the correct dark/light value automatically, with no
/// `@Environment(\.colorScheme)` plumbing required at the call site.
enum OmenColor {
    static let bg = dynamic(dark: 0x1F1F1D, light: 0xF6F6F4)
    static let surface1 = dynamic(dark: 0x2A2A27, light: 0xFFFFFF)
    static let surface2 = dynamic(dark: 0x343431, light: 0xECECE9)
    static let surface3 = dynamic(dark: 0x3F3F3B, light: 0xE2E2DE)
    static let border = dynamic(dark: 0x8A8272, light: 0x85857F)
    static let borderSubtle = dynamic(dark: 0x3A3A36, light: 0xE0E0DC)
    static let textPrimary = dynamic(dark: 0xF5F0E8, light: 0x161614)
    static let textSecondary = dynamic(dark: 0xBDB5A9, light: 0x4A4A46)
    static let textTertiary = dynamic(dark: 0xA79E90, light: 0x6B6B66)
    static let accent = dynamic(dark: 0xC4933B, light: 0x8A5E10)
    static let accentHover = dynamic(dark: 0xD8A648, light: 0x9A6A16)
    static let accentMuted = dynamic(dark: 0x3A2A0A, light: 0xF3E6CC)
    static let textOnAccent = dynamic(dark: 0x14140F, light: 0xFFFFFF)
    static let omen = dynamic(dark: 0x2F7D5B, light: 0x1A5C3E)

    /// Verdigris tuned for **chip typography**, the same way `Data.platformSleeperChip` and
    /// `platformEspnChip` are tuned for theirs.
    ///
    /// `omen`'s dark value `#2F7D5B` is 3.96:1 on `bg` — fine for a glow, a rule, or a fill, and
    /// short of AA for 11pt chip text. `#3A9A70` is the same hue carried to **5.69:1** and is
    /// used only where verdigris has to be *read*. The light value is unchanged at `#1A5C3E`
    /// (7.94:1 on `surface1`), which already cleared AA.
    ///
    /// Founder, 2026-09-06: "add league pill should be verdigris green." Brand/brand-system.md
    /// names Verdigris Green `#2F7D5B` as the intelligence/active-signal colour, so the chip that
    /// *adds* a league now reads in it rather than borrowing brass from the filters beside it.
    static let omenChip = dynamic(dark: 0x4FAE81, light: 0x1A5C3E)
    /// Destructive controls (Delete account). `Data.riskHigh` is a fixed dark red that vanishes on the dark surface.
    static let danger = dynamic(dark: 0xF2766B, light: 0xA51D1D)
    static let umber = dynamic(dark: 0x5A3A25, light: 0x5A3A25)

    /// Favourite / starred marks. Founder-approved 2026-09-05 and recorded in
    /// `Brand/brand-system.md` as Platinum `#C7CBD1`.
    ///
    /// The *cool* metal, deliberately, against `accent`'s warm brass. A starred team has to
    /// read as **marked**, not as a second call to action sitting beside Switch — brass on
    /// brass would have made the star look tappable-for-navigation, which is the one thing it
    /// is not. 7.6:1 on `bg` in dark.
    ///
    /// The light value is not the same hex: `#C7CBD1` is a pale silver that all but vanishes
    /// on a white surface (1.5:1), which is exactly the class of bug
    /// `PrimitiveEnforcementTests` was written after — a dark-only literal that shipped and
    /// went invisible in light mode. `#69707B` is the same cool-metal hue carried to 4.92:1 on
    /// `surface1`.
    static let platinum = dynamic(dark: 0xC7CBD1, light: 0x69707B)

    /// Derived from `accent`; solid stroke color for the focus-ring outline (registry §2.2, §4).
    static let focusRing = accent
    /// Soft halo layered behind `focusRing` — the "accent @ 40%" reading of the registry row.
    static let focusRingHalo = dynamic(dark: 0xC4933B, light: 0x8A5E10, alpha: 0.4)

    enum Data {
        // Data-semantic invariant tokens (registry §2.3) — never theme-overridden, except the
        // documented risk-low/risk-medium light-mode adjustment below.
        static let riskLow = dynamic(dark: 0x34C759, light: 0x13702F)
        static let riskMedium = dynamic(dark: 0xFF9F0A, light: 0x8F4A09)
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
        // Registry §2.3 `-chip` legibility overrides: chip fills tuned so `onPlatform*`
        // white text meets WCAG AA at chip typography. Sleeper base is ~2.5:1 vs white —
        // darken to #0F70B0 for ~5.5:1. Yahoo already ~15:1. ESPN darken to #B21826
        // for ~7:1 safety margin. Invariant across themes.
        static let platformSleeperChip = invariant(0x0F70B0)
        static let platformYahooChip = invariant(0x410093)
        static let platformEspnChip = invariant(0xB21826)
        // Registry §2.3 `on-platform-*` foregrounds: text-on-chip color. Invariant.
        static let onPlatformSleeper = invariant(0xFFFFFF)
        static let onPlatformYahoo = invariant(0xFFFFFF)
        static let onPlatformEspn = invariant(0xFFFFFF)
        // Light value added with light mode: #7DD3FC is ~1.6:1 on the near-white ground.
        static let demoText = dynamic(dark: 0x7DD3FC, light: 0x0369A1)
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


/// The Appearance setting (Account › Appearance). Dark stays the default; Light is the neutral
/// near-white ramp above, never beige (founder, 2026-10-19); Match iPhone follows the system.
enum OmenAppearance: String, CaseIterable {
    case dark, light, system

    static let storageKey = "omen.appearance"

    var title: String {
        switch self {
        case .dark: return "Dark"
        case .light: return "Light"
        case .system: return "Match iPhone"
        }
    }

    /// Nil hands the choice to the system.
    var colorScheme: ColorScheme? {
        switch self {
        case .dark: return .dark
        case .light: return .light
        case .system: return nil
        }
    }
}
