import XCTest
import SwiftUI
import UIKit
@testable import Omen

/// `OmenTypeRoleSpec.at(size:weight:)` — the seam added 2026-09-06 so a call site needing a
/// display-size number stops reaching for `.font(.system(size:))`.
///
/// Two raw `.system` literals were live in `OmenMatchupHero` (the 28pt score and the 20pt
/// projection). A raw `.system` call resolves to the platform sans no matter which family the
/// role owns, so the two biggest numbers in the Command Center rendered in a different face
/// from every other number in the app — and they would not have followed DM Mono in when the
/// real font resources land. These assertions are what stop a derivation from quietly becoming
/// a new role with different rules.
final class TypographyDerivationTests: XCTestCase {

    func testADerivationKeepsTheRolesFamilyCaseAndFigureRule() {
        let base = OmenTypography.numeric
        let derived = base.at(size: 24, weight: .semibold)

        XCTAssertEqual(derived.design, base.design)
        XCTAssertEqual(derived.uppercase, base.uppercase)
        XCTAssertEqual(derived.tabularNumbers, base.tabularNumbers)
        // Kept, so a derived size still scales with Dynamic Type.
        XCTAssertEqual(derived.relativeTo, base.relativeTo)
    }

    func testADerivationMovesOnlySizeAndWeight() {
        let derived = OmenTypography.numeric.at(size: 24, weight: .semibold)
        XCTAssertEqual(derived.size, 24)
        XCTAssertEqual(derived.weight, .semibold)
    }

    func testOmittingTheWeightKeepsTheRolesOwn() {
        let base = OmenTypography.numeric
        XCTAssertEqual(base.at(size: 12).weight, base.weight)
    }

    /// Tracking is stored in POINTS at the role's own size, so a size change has to carry it
    /// proportionally — otherwise a 27pt number would wear a 12pt label's letter spacing.
    func testTrackingScalesWithTheSizeRatherThanCarryingOverLiterally() {
        let eyebrow = OmenTypography.eyebrow   // 12pt, tracking 12 * 0.12
        let doubled = eyebrow.at(size: 24)
        XCTAssertEqual(doubled.tracking, eyebrow.tracking * 2, accuracy: 0.0001)
    }

    /// The `numeric` role is tabular, which is the whole reason the scoreboard derives from it:
    /// `100.7` and `95.8` have to sit in a column without the digits drifting.
    ///
    /// **Amended 2026-09-07.** This used to also assert `design == .monospaced`. The app moved to
    /// a single typeface, so no role carries a mono family any more — but column alignment must
    /// not move with it. Alignment comes from `.monospacedDigit()` applied at the modifier, not
    /// from the family, so the property that actually matters is `tabularNumbers`. Reintroducing
    /// a mono family to hold a column straight is prohibited (facts-of-record #21).
    func testTheScoreboardDerivesFromATabularRole() {
        XCTAssertTrue(OmenTypography.numeric.tabularNumbers)
    }

    /// The whole three-family seam shipped for months resolving to SF Pro / New York / SF Mono
    /// because no font file was ever committed, and nothing failed. This is the assertion that
    /// would have caught it: every role must resolve to the real family, not a system stand-in.
    func testEveryRoleResolvesToTheRealAlegreyaSansFamily() {
        let roles: [(String, OmenTypeRoleSpec)] = [
            ("display", OmenTypography.display), ("h1", OmenTypography.h1),
            ("h2", OmenTypography.h2), ("h3", OmenTypography.h3),
            ("body", OmenTypography.body), ("bodySmall", OmenTypography.bodySmall),
            ("label", OmenTypography.label), ("eyebrow", OmenTypography.eyebrow),
            ("chip", OmenTypography.chip), ("numeric", OmenTypography.numeric)
        ]
        for (name, role) in roles {
            XCTAssertEqual(
                role.resolvedUIFont.familyName, "Alegreya Sans",
                "role \(name) resolved to \(role.resolvedUIFont.familyName), not the bundled family"
            )
        }
    }

    /// Alegreya Sans ships no 600 weight, so the two semibold roles resolve to Bold. Asserted
    /// rather than left to chance: a silently synthesised weight is how a type scale rots.
    func testSemiboldRolesResolveToBoldBecauseTheFamilyHasNo600() {
        XCTAssertEqual(OmenTypography.h2.resolvedUIFont.fontName, "AlegreyaSans-Bold")
        XCTAssertEqual(OmenTypography.h3.resolvedUIFont.fontName, "AlegreyaSans-Bold")
    }
}

/// The Add League chip's verdigris, 2026-09-06. `omenChip` is a legibility override on `omen`
/// and belongs to the same family as `Data.platformSleeperChip` / `platformEspnChip`.
///
/// The values are load-bearing, not decorative: `omen`'s dark `#2F7D5B` is **3.96:1** on `bg`
/// and chip type is 11pt, so the base verdigris fails AA at chip size. `#3A9A70` is the same hue
/// at **5.69:1**. Light mode needs no lift — `#1A5C3E` is already 7.94:1 on `surface1` — so the
/// two are equal there. This pins that asymmetry so a future "make them consistent" tidy-up has
/// to argue with the contrast numbers first. Android mirror: `OmenColorTest`.
final class VerdigrisChipTokenTests: XCTestCase {

    func testTheChipOverrideLiftsDarkModeOnly() {
        let dark = UITraitCollection(userInterfaceStyle: .dark)
        let light = UITraitCollection(userInterfaceStyle: .light)

        XCTAssertEqual(hex(OmenColor.omenChip, dark), 0x3A9A70)
        XCTAssertEqual(hex(OmenColor.omenChip, light), 0x1A5C3E)

        // Dark is a real lift off the base; light is deliberately identical to it.
        XCTAssertNotEqual(hex(OmenColor.omen, dark), hex(OmenColor.omenChip, dark))
        XCTAssertEqual(hex(OmenColor.omen, light), hex(OmenColor.omenChip, light))
    }

    /// The chip tone must resolve to `omenChip`, not `omen` — the whole point of the split is
    /// that the readable value is the one a chip gets.
    func testTheVerdigrisChipToneIsDistinctFromTheBrassOne() {
        XCTAssertNotEqual(
            hex(OmenColor.accent, UITraitCollection(userInterfaceStyle: .dark)),
            hex(OmenColor.omenChip, UITraitCollection(userInterfaceStyle: .dark))
        )
    }

    private func hex(_ color: Color, _ traits: UITraitCollection) -> UInt32 {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).resolvedColor(with: traits).getRed(&r, green: &g, blue: &b, alpha: &a)
        return (UInt32((r * 255).rounded()) << 16)
            | (UInt32((g * 255).rounded()) << 8)
            | UInt32((b * 255).rounded())
    }
}
