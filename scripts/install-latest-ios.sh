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
# Requirements: the iPhone paired and unlocked, Xcode signed in to team 6RWR5G9894.
# This installs a DEVELOPMENT build directly. It is not TestFlight and does not reach any
# other tester — see the note at the bottom.
set -euo pipefail

DEVICE="${OMEN_IOS_DEVICE_ID:-}"
PROJECT="mobile/ios/OmenIOS/OmenIOS.xcodeproj"
DERIVED="${TMPDIR:-/tmp}/omen-device-install"
BUNDLE="com.slopssaloon.omen"

cd "$(git rev-parse --show-toplevel)/slops-saloon/omen" 2>/dev/null || cd "$(dirname "$0")/.."

if [ -z "$DEVICE" ]; then
  DEVICE=$(xcrun devicectl list devices 2>/dev/null \
    | awk '/available \(paired\)/ {print $3; exit}')
fi

if [ -z "$DEVICE" ]; then
  echo "No paired iPhone found. Connect and unlock it, then retry." >&2
  echo "If it is paired over Wi-Fi, open Xcode > Devices once to wake the connection." >&2
  exit 1
fi

echo "==> Device:  $DEVICE"
echo "==> Commit:  $(git rev-parse --short HEAD)  ($(git rev-parse --abbrev-ref HEAD))"

# Refuse to install something that is not what the repo says it is. A build from a dirty tree
# is not "the latest version" — it is one nobody can reproduce or point a finding at.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: working tree is dirty. This build will not match any commit." >&2
  echo "         Findings raised against it cannot be reproduced from git." >&2
fi

echo "==> Building…"
xcodebuild -project "$PROJECT" -scheme OmenIOS \
  -destination 'generic/platform=iOS' -configuration Debug \
  -derivedDataPath "$DERIVED" build \
  | grep -E "error:|warning: .*(deprecated|signing)|\*\* BUILD" || true

APP=$(find "$DERIVED" -name "Omen.app" -path "*iphoneos*" -type d | head -1)
[ -n "$APP" ] || { echo "Build produced no app bundle." >&2; exit 1; }

echo "==> Installing…"
xcrun devicectl device install app --device "$DEVICE" "$APP" >/dev/null
xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE" >/dev/null

echo "==> Installed and launched: $(git rev-parse --short HEAD)"
echo
echo "This is a DEVELOPMENT build on one device. It is NOT TestFlight:"
echo "  - no other tester receives it"
echo "  - R6 invitations still point at whatever build is in App Store Connect"
echo "  - shipping to testers still needs an archive + upload (founder-gated)"
