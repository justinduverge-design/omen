#!/usr/bin/env bash
# Local capture for the `ScreenshotScenarios` registry — the on-a-Mac equivalent of
# `.github/workflows/native-visual-evidence.yml`.
#
# Why this exists: that workflow is `workflow_dispatch` only and uploads artifacts to
# Actions, so it cannot produce a committed evidence PNG on the founder's Mac, which is
# where routine native verification moved on 2026-08-11. `scripts/preview-android.sh` is
# the other nearby script and does not fit: it hardcodes Windows `.exe` tool paths and
# knows nothing about scenario keys — it launches the app's normal welcome screen.
#
# Scenario keys are the registry's own, shared across platforms:
#   mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/screenshot/ScreenshotScenarios.kt
#   mobile/ios/OmenIOS/OmenIOS/App/Screenshot/ScreenshotScenarios.swift
#
# Screenshot mode mounts deterministic in-app fixtures: no session, no auth, no network,
# no fabricated provider state. Nothing this script captures can contain a real credential,
# provider cookie, or user league.
#
# Usage:
#   scripts/capture-screenshot-scenario.sh android <scenario-key> <out.png> [font-scale]
#   scripts/capture-screenshot-scenario.sh ios     <scenario-key> <out.png> [device-name] [content-size-category]
#
# Examples:
#   scripts/capture-screenshot-scenario.sh android command-center.demo-connected out.png
#   scripts/capture-screenshot-scenario.sh android help-support.available big.png 1.3
#   scripts/capture-screenshot-scenario.sh ios help-support.available se.png "iPhone SE (3rd generation)"
#
# Prerequisites:
#   android — a booted emulator/device with the debug APK already installed
#             (`cd mobile/android && ./gradlew :app:assembleDebug`, then `adb install -r`).
#   ios     — a built simulator .app already installed on a booted simulator.
#
# Safe to run: local only. Reads nothing from the network and writes only the named PNG.

set -euo pipefail

PLATFORM="${1:?usage: capture-screenshot-scenario.sh <android|ios> <scenario> <out.png> [...]}"
SCENARIO="${2:?missing scenario key}"
OUT="${3:?missing output path}"

ADB="${OMEN_ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PACKAGE="com.slopssaloon.omen"
SETTLE="${OMEN_CAPTURE_SETTLE:-6}"

mkdir -p "$(dirname "$OUT")"

case "$PLATFORM" in
  android)
    FONT_SCALE="${4:-}"
    if [[ -n "$FONT_SCALE" ]]; then
      "$ADB" shell settings put system font_scale "$FONT_SCALE"
      # font_scale is a configuration change; the activity must be relaunched to pick it up.
      sleep 2
    fi
    "$ADB" shell am force-stop "$PACKAGE"
    "$ADB" shell am start -W -n "$PACKAGE/.MainActivity" \
      --es OMEN_SCREENSHOT_SCENARIO "$SCENARIO" >/dev/null
    sleep "$SETTLE"
    # Refuse to capture something other than the app — a stray system dialog (the cold-boot
    # "System UI isn't responding" ANR is the common one) would otherwise be silently
    # committed as screen evidence.
    FOCUS="$("$ADB" shell dumpsys window 2>/dev/null | grep -m1 'mCurrentFocus' || true)"
    if [[ "$FOCUS" != *"$PACKAGE"* ]]; then
      echo "error: $PACKAGE does not hold window focus; refusing to capture." >&2
      echo "  focus was: $FOCUS" >&2
      exit 1
    fi
    "$ADB" exec-out screencap -p > "$OUT"
    ;;

  ios)
    DEVICE="${4:-iPhone 16}"
    CONTENT_SIZE="${5:-}"
    UDID="$(xcrun simctl list devices available \
      | grep -F "    $DEVICE (" \
      | head -n1 \
      | sed -E 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/')"
    if [[ -z "$UDID" ]]; then
      echo "error: no simulator named '$DEVICE'." >&2
      exit 1
    fi
    if [[ -n "$CONTENT_SIZE" ]]; then
      xcrun simctl ui "$UDID" content_size "$CONTENT_SIZE"
    fi
    xcrun simctl terminate "$UDID" "$PACKAGE" >/dev/null 2>&1 || true
    xcrun simctl launch "$UDID" "$PACKAGE" -OMEN_SCREENSHOT_SCENARIO "$SCENARIO" >/dev/null
    sleep "$SETTLE"
    xcrun simctl io "$UDID" screenshot --type=png "$OUT"
    ;;

  *)
    echo "error: platform must be 'android' or 'ios'." >&2
    exit 1
    ;;
esac

test -s "$OUT"
echo "captured $PLATFORM · $SCENARIO -> $OUT"
