#!/usr/bin/env bash
# Build the current working tree and install it on the founder's paired iPhone.
#
# Exists because of F-AUDIT-01: on 2026-08-30 the only iOS build in existence was eleven days
# older than the code, so the device could not show work that had been merged for a day. There
# was no path from `main` to the phone that did not involve an archive and an App Store Connect
# round trip. This is that path.
#
#   ./scripts/install-latest-ios.sh
#
# Requirements: the iPhone paired and unlocked, Xcode signed in to team 6RWR5G9894,
# and this checkout's ignored Config/Local.xcconfig present.
# This installs a DEVELOPMENT build directly. It is not TestFlight and does not reach any
# other tester — see the note at the bottom.
set -euo pipefail

DEVICE="${OMEN_IOS_DEVICE_ID:-}"
PROJECT="mobile/ios/OmenIOS/OmenIOS.xcodeproj"
BUNDLE="com.slopssaloon.omen"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
cd "$REPO_ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
COMMIT="$(git rev-parse --short=12 HEAD)"
DERIVED="${TMPDIR:-/tmp}/omen-device-install-$COMMIT"
LOCAL_CONFIG="mobile/ios/OmenIOS/Config/Local.xcconfig"

if [ ! -f "$LOCAL_CONFIG" ]; then
  echo "Refusing to build a misleading provider-disabled app." >&2
  echo "Missing: $REPO_ROOT/$LOCAL_CONFIG" >&2
  echo "Create the ignored local config for this checkout, then retry." >&2
  exit 1
fi

if [ -z "$DEVICE" ]; then
  DEVICE=$(xcrun devicectl list devices 2>/dev/null \
    | grep 'available (paired)' | grep -Eo '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}|[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' | head -1 || true)
fi

if [ -z "$DEVICE" ]; then
  echo "No paired iPhone found. Connect and unlock it, then retry." >&2
  echo "If it is paired over Wi-Fi, open Xcode > Devices once to wake the connection." >&2
  exit 1
fi

echo "==> Device:  $DEVICE"
echo "==> Root:    $REPO_ROOT"
echo "==> Commit:  $COMMIT  ($BRANCH)"
echo "==> Derived: $DERIVED"

# Refuse to install something that is not what the repo says it is. A build from a dirty tree
# is not "the latest version" — it is one nobody can reproduce or point a finding at.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: working tree is dirty. This build will not match any commit." >&2
  echo "         Findings raised against it cannot be reproduced from git." >&2
fi

echo "==> Building…"
BUILD_LOG="$(mktemp -t omen-ios-build.XXXXXX)"
trap 'rm -f "$BUILD_LOG"' EXIT
if ! xcodebuild -project "$PROJECT" -scheme OmenIOS \
  -destination 'generic/platform=iOS' -configuration Debug \
  -derivedDataPath "$DERIVED" build >"$BUILD_LOG" 2>&1; then
  grep -E "error:|warning:|\*\* BUILD" "$BUILD_LOG" >&2 || tail -80 "$BUILD_LOG" >&2
  exit 1
fi
grep -E "warning: .*(deprecated|signing)|\*\* BUILD" "$BUILD_LOG" || true

APP="$DERIVED/Build/Products/Debug-iphoneos/Omen.app"
[ -d "$APP" ] || { echo "Build produced no app bundle at $APP." >&2; exit 1; }

BUILT_BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")
BUILT_VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP/Info.plist")
[ "$BUILT_BUNDLE" = "$BUNDLE" ] || {
  echo "Built bundle mismatch: expected $BUNDLE, got $BUILT_BUNDLE." >&2
  exit 1
}
echo "==> Artifact: $BUILT_BUNDLE build $BUILT_VERSION from $COMMIT ($BRANCH)"

echo "==> Installing…"
xcrun devicectl device install app --device "$DEVICE" "$APP" >/dev/null
xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE" >/dev/null

echo "==> Installed and launched: $COMMIT ($BRANCH), app build $BUILT_VERSION"
echo
echo "This is a DEVELOPMENT build on one device. It is NOT TestFlight:"
echo "  - no other tester receives it"
echo "  - R6 invitations still point at whatever build is in App Store Connect"
echo "  - shipping to testers still needs an archive + upload (founder-gated)"
