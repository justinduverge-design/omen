#import <Foundation/Foundation.h>

#if __has_attribute(swift_private)
#define AC_SWIFT_PRIVATE __attribute__((swift_private))
#else
#define AC_SWIFT_PRIVATE
#endif

/// The "AuthApple" asset catalog image resource.
static NSString * const ACImageNameAuthApple AC_SWIFT_PRIVATE = @"AuthApple";

/// The "AuthDiscord" asset catalog image resource.
static NSString * const ACImageNameAuthDiscord AC_SWIFT_PRIVATE = @"AuthDiscord";

/// The "AuthEmail" asset catalog image resource.
static NSString * const ACImageNameAuthEmail AC_SWIFT_PRIVATE = @"AuthEmail";

/// The "AuthGoogle" asset catalog image resource.
static NSString * const ACImageNameAuthGoogle AC_SWIFT_PRIVATE = @"AuthGoogle";

/// The "CanvasChevronLeft" asset catalog image resource.
static NSString * const ACImageNameCanvasChevronLeft AC_SWIFT_PRIVATE = @"CanvasChevronLeft";

/// The "CanvasChevronRight" asset catalog image resource.
static NSString * const ACImageNameCanvasChevronRight AC_SWIFT_PRIVATE = @"CanvasChevronRight";

/// The "CanvasShield" asset catalog image resource.
static NSString * const ACImageNameCanvasShield AC_SWIFT_PRIVATE = @"CanvasShield";

/// The "OmenLockupStacked" asset catalog image resource.
static NSString * const ACImageNameOmenLockupStacked AC_SWIFT_PRIVATE = @"OmenLockupStacked";

#undef AC_SWIFT_PRIVATE
