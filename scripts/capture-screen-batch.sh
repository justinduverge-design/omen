#!/usr/bin/env bash
# Batch screen capture — the end-of-batch visual gate.
#
# The loop this serves (founder, 2026-09-10): assertions are the inner loop while you build,
# and screenshots are the check on the finished batch, not a per-change debugging tool. A
# screenshot costs real tokens to look at; an assertion costs almost nothing. So you work
# against the tests, then capture ONCE across everything you touched, then hand it over.
#
# This orchestrates `capture-screenshot-scenario.sh` rather than reimplementing it — that
# script already knows the launch protocol and already refuses to capture a stray system
# dialog instead of the app. Everything here is the part it does not do: both platforms, both
# themes, a set of scenarios, and a manifest of what was taken.
#
# Usage:
#   scripts/capture-screen-batch.sh                      # both platforms, both themes, default set
#   scripts/capture-screen-batch.sh --platform ios       # one platform
#   scripts/capture-screen-batch.sh --theme dark         # one theme
#   scripts/capture-screen-batch.sh --build              # build + install first (slow)
#   scripts/capture-screen-batch.sh --scenarios "a b c"  # explicit scenario keys
#   scripts/capture-screen-batch.sh --out some/dir       # default: output/screens/<timestamp>
#
# Prerequisites without --build: a booted emulator with the debug APK installed, and a booted
# simulator with the .app installed. With --build, this does both for you.
#
# Safe to run: local only. Screenshot mode mounts deterministic in-app fixtures — no session,
# no auth, no network, no real league — so nothing captured here can contain a credential, a
# provider cookie, or a real user's data. Theme and font-scale changes are made on the
# emulator/simulator and restored on exit.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CAPTURE="$REPO_ROOT/scripts/capture-screenshot-scenario.sh"
ADB="${OMEN_ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PACKAGE="com.slopssaloon.omen"
IOS_DEVICE="${OMEN_IOS_DEVICE:-iPhone 16}"

# The surfaces worth a look after a Command Center or design change. `carousel` first: it is
# the `carousel != null` branch a real multi-league account runs, and the one that had no
# coverage at all until 2026-09-10 — three clipping bugs shipped through it.
DEFAULT_SCENARIOS=(
  command-center.carousel
  command-center.carousel-provider-down
  command-center.demo-connected
  command-center.disconnected
  onboarding.email-code
  omen.demo
)

PLATFORMS="both"
THEMES="both"
DO_BUILD=0
OUT_DIR=""
SCENARIOS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORMS="${2:?}"; shift 2 ;;
    --theme)    THEMES="${2:?}";    shift 2 ;;
    --scenarios) read -r -a SCENARIOS <<< "${2:?}"; shift 2 ;;
    --out)      OUT_DIR="${2:?}";   shift 2 ;;
    --build)    DO_BUILD=1;         shift ;;
    -h|--help)  sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "error: unknown option '$1'" >&2; exit 2 ;;
  esac
done

[[ ${#SCENARIOS[@]} -eq 0 ]] && SCENARIOS=("${DEFAULT_SCENARIOS[@]}")
[[ -z "$OUT_DIR" ]] && OUT_DIR="$REPO_ROOT/output/screens/$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$OUT_DIR"

want() { [[ "$1" == "both" || "$1" == "$2" ]]; }

ios_udid() {
  xcrun simctl list devices booted \
    | grep -F "$IOS_DEVICE (" | head -n1 \
    | sed -E 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/'
}

# Restore whatever we changed, however we exit. A batch that leaves the emulator in light
# mode silently changes what the NEXT person's capture means.
restore() {
  if [[ "${ANDROID_READY:-0}" == 1 ]]; then
    "$ADB" shell cmd uimode night yes >/dev/null 2>&1 || true
  fi
  if [[ -n "${IOS_UDID:-}" ]]; then
    xcrun simctl ui "$IOS_UDID" appearance dark >/dev/null 2>&1 || true
  fi
}
trap restore EXIT

FAILED=()
MANIFEST="$OUT_DIR/manifest.txt"
: > "$MANIFEST"

# ---------- Android ----------
if want "$PLATFORMS" android; then
  if "$ADB" shell true >/dev/null 2>&1; then
    ANDROID_READY=1
    if [[ "$DO_BUILD" == 1 ]]; then
      echo "building android…"
      (cd "$REPO_ROOT/mobile/android" && ./gradlew :app:assembleDebug -q)
      "$ADB" install -r "$REPO_ROOT/mobile/android/app/build/outputs/apk/debug/app-debug.apk" >/dev/null
    fi
    for theme in dark light; do
      want "$THEMES" "$theme" || continue
      [[ "$theme" == dark ]] && night=yes || night=no
      "$ADB" shell cmd uimode night "$night" >/dev/null
      sleep 2
      for s in "${SCENARIOS[@]}"; do
        out="$OUT_DIR/android/$theme/$s.png"
        if "$CAPTURE" android "$s" "$out" >/dev/null 2>&1; then
          echo "android  $theme  $s" >> "$MANIFEST"
        else
          FAILED+=("android/$theme/$s")
        fi
      done
    done
  else
    echo "note: no Android device attached — skipping android." >&2
  fi
fi

# ---------- iOS ----------
if want "$PLATFORMS" ios; then
  IOS_UDID="$(ios_udid)"
  if [[ -n "$IOS_UDID" ]]; then
    if [[ "$DO_BUILD" == 1 ]]; then
      echo "building ios…"
      DD="${OMEN_IOS_DERIVED_DATA:-$REPO_ROOT/output/ios-dd}"
      (cd "$REPO_ROOT/mobile/ios/OmenIOS" && xcodebuild -project OmenIOS.xcodeproj \
        -scheme OmenIOS -configuration Debug \
        -destination "platform=iOS Simulator,id=$IOS_UDID" \
        -derivedDataPath "$DD" CODE_SIGNING_ALLOWED=NO build >/dev/null)
      xcrun simctl install "$IOS_UDID" "$DD/Build/Products/Debug-iphonesimulator/Omen.app"
    fi
    for theme in dark light; do
      want "$THEMES" "$theme" || continue
      xcrun simctl ui "$IOS_UDID" appearance "$theme" >/dev/null
      sleep 1
      for s in "${SCENARIOS[@]}"; do
        out="$OUT_DIR/ios/$theme/$s.png"
        if "$CAPTURE" ios "$s" "$out" "$IOS_DEVICE" >/dev/null 2>&1; then
          echo "ios      $theme  $s" >> "$MANIFEST"
        else
          FAILED+=("ios/$theme/$s")
        fi
      done
    done
  else
    echo "note: no booted simulator named '$IOS_DEVICE' — skipping ios." >&2
  fi
fi

echo
echo "captured $(wc -l < "$MANIFEST" | tr -d ' ') screens -> $OUT_DIR"

# A scenario that did not capture is reported, never silently skipped: a missing PNG in a
# batch reads as "nothing to see there", which is exactly wrong when the reason it is missing
# is that the screen crashed or a scenario key was renamed.
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo
  echo "FAILED (${#FAILED[@]}):" >&2
  printf '  %s\n' "${FAILED[@]}" >&2
  exit 1
fi
