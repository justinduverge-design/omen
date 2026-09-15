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

    /// Reads the weight CoreText actually resolved, rather than the weight we asked for.
    /// A variable font reports its instance's own trait value (400 -> 0.0, 700 -> 0.4,
    /// 800 -> 0.6), which does NOT equal Apple's `UIFont.Weight` constants — so this is
    /// asserted for ordering and distinctness, never for equality with `.heavy`/`.bold`.
    private func resolvedWeight(_ role: OmenTypeRoleSpec) -> Double {
        let traits = role.resolvedUIFont.fontDescriptor.object(forKey: .traits)
            as? [UIFontDescriptor.TraitKey: Any]
        guard let n = traits?[.weight] as? NSNumber else { return .nan }
        return n.doubleValue
    }

    func testADerivationKeepsTheRolesFamilyCaseAndFigureRule() {
        let base = OmenTypography.numeric
        let derived = base.at(size: 24, weight: .semibold)

        XCTAssertEqual(derived.family, base.family)
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
    /// proportionally — otherwise a 27pt number would wear a 10pt eyebrow's letter spacing.
    func testTrackingScalesWithTheSizeRatherThanCarryingOverLiterally() {
        let micro = OmenTypography.micro          // 10pt, tracking 10 * 0.16
        let doubled = micro.at(size: micro.size * 2)
        XCTAssertEqual(doubled.tracking, micro.tracking * 2, accuracy: 0.0001)
    }

    /// Column alignment must survive having no mono family. It comes from the tabular-figure
    /// feature, not from the typeface. Reintroducing a mono family to hold a column straight
    /// is prohibited (facts-of-record #21).
    func testTheScoreboardDerivesFromATabularRole() {
        XCTAssertTrue(OmenTypography.numeric.tabularNumbers)
        XCTAssertTrue(OmenTypography.scoreLead.tabularNumbers)
        XCTAssertTrue(OmenTypography.scoreTrail.tabularNumbers)
    }

    /// The three-family seam shipped for months resolving to SF Pro / New York / SF Mono
    /// because no font file was ever committed, and nothing failed. This is the assertion that
    /// would have caught it: every role must resolve to the real family, not a system stand-in.
    func testEveryRoleResolvesToItsBundledWixOpticalCut() {
        for (name, role) in Self.allRoles {
            XCTAssertEqual(
                role.resolvedUIFont.familyName,
                role.family == .display ? "Wix Madefor Display" : "Wix Madefor Text",
                "role \(name) resolved to \(role.resolvedUIFont.familyName), not the bundled family"
            )
        }
    }

    /// **The guard that matters.** A family-name assertion passes whether or not a weight was
    /// ever applied, because both weights of a variable font share one family name. On
    /// 2026-09-15 this app shipped a resolver that set a weight *trait* on an already-named
    /// face, which does not move a variable font off its default instance: every role rendered
    /// at 400 and the entire ramp was flat. The test in place at the time asserted
    /// `OmenTypography.scoreLead.weight == .heavy` — a struct field read back out of a literal
    /// twenty lines above it — and passed throughout.
    ///
    /// This asserts the resolved *output* instead, and cannot pass on a flat ramp.
    func testWeightIsActuallyAppliedSoTheRampIsNotFlat() {
        for family in [OmenFontFamily.display, .text] {
            let regular = OmenTypeRoleSpec(family: family, lineHeight: 20, design: .default,
                                           size: 16, weight: .regular, relativeTo: .body,
                                           tracking: 0, uppercase: false, tabularNumbers: false)
            let bold = regular.at(size: 16, weight: .bold)
            let heavy = regular.at(size: 16, weight: .heavy)

            XCTAssertLessThan(resolvedWeight(regular), resolvedWeight(bold),
                              "\(family): bold did not resolve heavier than regular — the wght axis is not being applied")
            XCTAssertLessThan(resolvedWeight(bold), resolvedWeight(heavy),
                              "\(family): heavy did not resolve heavier than bold — the wght axis is not being applied")
        }
    }

    /// Registry §2.4 asks that 600 resolve as a real 600 rather than the SemiBold-against-Bold
    /// workaround Alegreya Sans forced. No role uses 600 after C7 moved `h3` to 700, so this
    /// keeps the claim honest and testable: the cut carries it, and the seam can reach it.
    func testTheRegistrysRealSixHundredIsReachable() {
        XCTAssertEqual(OmenFontFamily.axisValue(for: .semibold), 600)

        let base = OmenTypeRoleSpec(family: .display, lineHeight: 20, design: .default, size: 16,
                                    weight: .regular, relativeTo: .body, tracking: 0,
                                    uppercase: false, tabularNumbers: false)
        let semibold = resolvedWeight(base.at(size: 16, weight: .semibold))
        XCTAssertGreaterThan(semibold, resolvedWeight(base.at(size: 16, weight: .regular)))
        XCTAssertLessThan(semibold, resolvedWeight(base.at(size: 16, weight: .bold)))
    }

    /// The axis tops out at 800; `.black` must clamp there rather than silently overshoot.
    func testTheWeightAxisCeilingIsExplicit() {
        XCTAssertEqual(OmenFontFamily.axisValue(for: .black), 800)
        XCTAssertEqual(OmenFontFamily.axisValue(for: .heavy), 800)
    }

    /// Locks the C7 ramp. Sizes only — the weights are proven by resolution above, not here.
    func testTheRolesSitOnTheC7Ramp() {
        let ramp: Set<CGFloat> = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 27, 32, 48]
        for (name, role) in Self.allRoles {
            XCTAssertTrue(ramp.contains(role.size), "role \(name) is \(role.size)pt, off the C7 ramp")
        }
        XCTAssertEqual(OmenTypography.call.size, 24)
        XCTAssertEqual(OmenTypography.screenTitle.size, 22)
        XCTAssertEqual(OmenTypography.micro.size, 10)
        XCTAssertEqual(OmenTypography.body.lineHeight, 22)
        XCTAssertEqual(OmenTypography.label.tracking, 11 * 0.12, accuracy: 0.0001)
    }

    /// Dynamic Type must be per-role, not one style for every heading and one for every label.
    /// Collapsing it makes a 48pt hero scale at the same rate as an 18pt sub-header.
    func testDynamicTypeIsMappedPerRoleRatherThanCollapsed() {
        let styles = Set(Self.allRoles.map { $0.1.relativeTo })
        XCTAssertGreaterThanOrEqual(styles.count, 6,
            "type roles collapsed onto \(styles.count) Dynamic Type styles; the ramp needs its own curve per size band")
        XCTAssertEqual(OmenTypography.display.relativeTo, .largeTitle)
        XCTAssertEqual(OmenTypography.micro.relativeTo, .caption2)
    }

    static let allRoles: [(String, OmenTypeRoleSpec)] = [
        ("display", OmenTypography.display), ("h1", OmenTypography.h1),
        ("scoreLead", OmenTypography.scoreLead), ("call", OmenTypography.call),
        ("scoreTrail", OmenTypography.scoreTrail), ("screenTitle", OmenTypography.screenTitle),
        ("h2", OmenTypography.h2), ("h3", OmenTypography.h3),
        ("body", OmenTypography.body), ("cardLead", OmenTypography.cardLead),
        ("name", OmenTypography.name), ("bodySmall", OmenTypography.bodySmall),
        ("label", OmenTypography.label), ("micro", OmenTypography.micro),
        ("numeric", OmenTypography.numeric),
    ]
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

        XCTAssertEqual(hex(OmenColor.omenChip, dark), 0x4FAE81)
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
