import CoreGraphics

/// Spacing scale (registry §2.5): `2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 ·
/// 64 · 96`. No ad-hoc values — feature code picks a named step or a documented rhythm alias,
/// never a raw point literal.
///
/// **Base-2 modular, replaced 2026-09-13 (founder).** The previous scale stopped at
/// `4 · 8 · 12 · 16 · …`, and its steps below 16 were too coarse for a 390pt phone on which two
/// screens must render with nothing below the fold. The density that buys the D11 no-scroll
/// constraint lives in the **6–14 range**, and a scale that skips 6, 10 and 14 forces every card
/// to round up and costs the fold. The approved canvas runs on 6, 10 and 14 throughout, so under
/// the old scale every screen built from it was a spec violation by default.
///
/// Every value is `2 × n`, it doubles cleanly along `2 → 4 → 8 → 16 → 32 → 64`, and every value at
/// or above 16 is unchanged — nothing built to the previous scale moves.
///
/// The amendment landed in the registry on 2026-09-13 and in this file on **2026-09-15**; for two
/// days the token file and its own specification disagreed, and the screens could not be built to
/// contract because the vocabulary they needed did not exist.
enum OmenSpacing {
    static let step2: CGFloat = 2
    static let step4: CGFloat = 4
    static let step6: CGFloat = 6
    static let step8: CGFloat = 8
    static let step10: CGFloat = 10
    static let step12: CGFloat = 12
    static let step14: CGFloat = 14
    static let step16: CGFloat = 16
    static let step20: CGFloat = 20
    static let step24: CGFloat = 24
    static let step32: CGFloat = 32
    static let step40: CGFloat = 40
    static let step48: CGFloat = 48
    static let step64: CGFloat = 64
    static let step96: CGFloat = 96

    /// card interior padding
    static let cardInterior = step24
    /// header → body gap
    static let headerToBody = step16
    /// body → footer gap
    static let bodyToFooter = step24
    /// section stack gap
    static let sectionStack = step48
    /// hero → first section gap
    static let heroToFirstSection = step32
    /// field → field gap
    static let fieldToField = step16
    /// label → input gap
    static let labelToInput = step8
    /// input → hint gap
    static let inputToHint = step4
    /// chip interior padding — vertical / horizontal
    static let chipInteriorVertical = step6
    static let chipInteriorHorizontal = step10
    /// inline gap between sibling chips or facts
    static let inlineGap = step10
}

enum OmenLayout {
    /// Registry §4: minimum iOS touch target is 44pt.
    static let minTouchTarget: CGFloat = 44
}
