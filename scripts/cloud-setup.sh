#!/usr/bin/env bash
# Setup for cloud runtimes (Codex cloud, Claude Code on the web, Jules). Linux, no Xcode:
# backend and web build and test here; iOS work stays on the Mac.
set -euo pipefail
umask 022   # warehouse release tests check file modes; some cloud images default to a stricter umask
cd "$(dirname "$0")/.."
node --version
# Codex cloud: npm's default cache (~/.npm) is not writable; keep it in the workspace (Codex setup run 2026-10-26: 2,630 tests pass with these three settings).
export npm_config_cache="${npm_config_cache:-$PWD/.npm-cache}"
# Node fetch ignores the sandbox proxy unless asked; without this, tests wait out retries to unreachable hosts.
export NODE_USE_ENV_PROXY=1
log="$PWD/.cloud-setup-test.log"
npm ci --no-audit --no-fund
(cd frontend && npm ci --no-audit --no-fund)
# Smoke-prove the environment so a task starts from a known-good state.
npm test --silent >"$log" 2>&1 && echo "backend tests: pass" || { tail -40 "$log"; echo "backend tests: FAIL (see above)"; }
