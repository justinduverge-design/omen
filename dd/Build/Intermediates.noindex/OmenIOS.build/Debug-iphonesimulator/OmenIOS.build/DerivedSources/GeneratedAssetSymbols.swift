import Foundation
#if canImport(DeveloperToolsSupport)
import DeveloperToolsSupport
#endif

#if SWIFT_PACKAGE
private let resourceBundle = Foundation.Bundle.module
#else
private class ResourceBundleClass {}
private let resourceBundle = Foundation.Bundle(for: ResourceBundleClass.self)
#endif

// MARK: - Color Symbols -

@available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *)
extension DeveloperToolsSupport.ColorResource {

}

// MARK: - Image Symbols -

@available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *)
extension DeveloperToolsSupport.ImageResource {

    /// The "AuthApple" asset catalog image resource.
    static let authApple = DeveloperToolsSupport.ImageResource(name: "AuthApple", bundle: resourceBundle)

    /// The "AuthDiscord" asset catalog image resource.
    static let authDiscord = DeveloperToolsSupport.ImageResource(name: "AuthDiscord", bundle: resourceBundle)

    /// The "AuthEmail" asset catalog image resource.
    static let authEmail = DeveloperToolsSupport.ImageResource(name: "AuthEmail", bundle: resourceBundle)

    /// The "AuthGoogle" asset catalog image resource.
    static let authGoogle = DeveloperToolsSupport.ImageResource(name: "AuthGoogle", bundle: resourceBundle)

    /// The "CanvasChevronLeft" asset catalog image resource.
    static let canvasChevronLeft = DeveloperToolsSupport.ImageResource(name: "CanvasChevronLeft", bundle: resourceBundle)

    /// The "CanvasChevronRight" asset catalog image resource.
    static let canvasChevronRight = DeveloperToolsSupport.ImageResource(name: "CanvasChevronRight", bundle: resourceBundle)

    /// The "CanvasShield" asset catalog image resource.
    static let canvasShield = DeveloperToolsSupport.ImageResource(name: "CanvasShield", bundle: resourceBundle)

    /// The "OmenLockupStacked" asset catalog image resource.
    static let omenLockupStacked = DeveloperToolsSupport.ImageResource(name: "OmenLockupStacked", bundle: resourceBundle)

}

