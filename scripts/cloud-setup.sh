#!/usr/bin/env bash
# Setup for cloud runtimes (Codex cloud, Claude Code on the web, Jules). Linux, no Xcode:
# backend and web build and test here; iOS work stays on the Mac.
set -euo pipefail
umask 022   # warehouse release tests check file modes; some cloud images default to a stricter umask
cd "$(dirname "$0")/.."
# CI and the Mac run Node 24 (.nvmrc). Jules' default Node 22 left 7 tests cancelled (2026-10-27).
if [[ $(node -p 'process.versions.node.split(".")[0]') -lt 24 ]]; then
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    set +u; . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"; nvm install 24 >/dev/null && nvm use 24 >/dev/null; set -u
  else
    echo "WARN: Node $(node --version) is older than the Node 24 CI uses; pick Node 24 in this environment's settings"
  fi
fi
node --version
# Codex cloud: npm's default cache (~/.npm) is not writable; keep it in the workspace (Codex setup run 2026-10-26: 2,630 tests pass with these three settings).
export npm_config_cache="${npm_config_cache:-$PWD/.npm-cache}"
# Node fetch ignores the sandbox proxy unless asked; without this, tests wait out retries to unreachable hosts.
export NODE_USE_ENV_PROXY=1
log="$PWD/.cloud-setup-test.log"
npm ci --no-audit --no-fund
(cd frontend && npm ci --no-audit --no-fund)
# Smoke-prove the environment so a task starts from a known-good state.
# A cancel (a test still running when its file ended) is not a failure; say which one it was.
npm test --silent >"$log" 2>&1 || true
count() { sed -En "s/^(ℹ|#) $1 //p" "$log" | tail -1; }   # spec (ℹ) or TAP (#), which Node 22 prints to a file
pass=$(count pass); fail=$(count fail); cancelled=$(count cancelled)
if [[ -z $pass ]]; then
  tail -40 "$log"; echo "backend tests: FAIL (the runner did not finish; see above)"
elif [[ ${fail:-0} -gt 0 ]]; then
  { grep -E '^\s*(✖|not ok)' "$log" || true; } | head -40; echo "backend tests: FAIL ($fail failed, $cancelled cancelled, $pass passed)"
elif [[ ${cancelled:-0} -gt 0 ]]; then
  { grep -E '^\s*(✖|not ok)' "$log" || true; } | head -40; echo "backend tests: CANCELLED ($cancelled cancelled, 0 failed, $pass passed; not a failure, see above)"
else
  echo "backend tests: pass ($pass passed, 0 failed, 0 cancelled)"
fi
