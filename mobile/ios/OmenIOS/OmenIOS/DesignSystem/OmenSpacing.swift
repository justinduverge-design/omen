import CoreGraphics

/// Spacing scale (registry §2.5): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. No ad-hoc values —
/// feature code picks a named step or a documented rhythm alias, never a raw point literal.
enum OmenSpacing {
    static let step4: CGFloat = 4
    static let step8: CGFloat = 8
    static let step12: CGFloat = 12
    static let step16: CGFloat = 16
    static let step24: CGFloat = 24
    static let step32: CGFloat = 32
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
}

enum OmenLayout {
    /// Registry §4: minimum iOS touch target is 44pt.
    static let minTouchTarget: CGFloat = 44
}
