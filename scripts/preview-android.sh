#!/usr/bin/env bash
# Local Android preview loop for Omen.
#
# Boots the Medium_Phone AVD cold, builds the debug APK, installs, and launches.
# Full doctrine + gotchas: Blueprints/playbooks/android-preview-loop.md
#
# Usage:
#   bash scripts/preview-android.sh              # boot + build + install + launch
#   SKIP_BOOT=1 bash scripts/preview-android.sh  # emulator already running

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME_DIR="${JAVA_HOME:-C:/Program Files/Android/Android Studio/jbr}"
SDK_DIR="${ANDROID_SDK_ROOT:-C:/Users/JDuve/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/Android/Sdk}"
AVD_NAME="${OMEN_AVD:-Medium_Phone}"
PACKAGE="com.slopssaloon.omen"
ACTIVITY="$PACKAGE/.MainActivity"

EMULATOR="$SDK_DIR/emulator/emulator.exe"
ADB="$SDK_DIR/platform-tools/adb.exe"

export JAVA_HOME="$JAVA_HOME_DIR"
export PATH="$JAVA_HOME/bin:$PATH"

if [[ ! -x "$EMULATOR" ]]; then
  echo "error: emulator not found at $EMULATOR" >&2
  echo "set ANDROID_SDK_ROOT to your SDK path and re-run." >&2
  exit 1
fi

if [[ "${SKIP_BOOT:-0}" != "1" ]]; then
  # Refuse to double-boot the same AVD (qemu errors and the second boot silently exits).
  if pgrep -f "qemu-system-x86_64" >/dev/null 2>&1; then
    echo "note: an emulator is already running; skipping boot. Set SKIP_BOOT=1 to silence."
  else
    echo "→ cold-booting $AVD_NAME (no snapshot — required, see playbook gotchas)"
    "$EMULATOR" -avd "$AVD_NAME" -no-snapshot -no-boot-anim -no-audio \
      > "$REPO_ROOT/.preview-emulator.log" 2>&1 &
    disown || true
  fi
fi

echo "→ waiting for device"
"$ADB" wait-for-device
until [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
  sleep 2
done
echo "  device booted"

echo "→ building :app:assembleDebug"
( cd "$REPO_ROOT/mobile/android" && ./gradlew :app:assembleDebug --console=plain )

APK="$REPO_ROOT/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$APK" ]]; then
  echo "error: apk not produced at $APK" >&2
  exit 1
fi

echo "→ installing"
"$ADB" install -r "$APK" >/dev/null

echo "→ launching $ACTIVITY"
"$ADB" shell am start -n "$ACTIVITY" >/dev/null

echo
echo "  device: $("$ADB" get-serialno)"
echo "  logs:   \"$ADB\" logcat --pid=\$(\"$ADB\" shell pidof $PACKAGE)"
echo "  shot:   \"$ADB\" exec-out screencap -p > screen.png"
echo
echo "Tap 'Try Demo' at the welcome screen to reach the Command Center."
