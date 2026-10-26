#!/usr/bin/env bash
# Setup for cloud runtimes (Codex cloud, Claude Code on the web, Jules). Linux, no Xcode:
# backend and web build and test here; iOS work stays on the Mac.
set -euo pipefail
cd "$(dirname "$0")/.."
node --version
npm ci --no-audit --no-fund
(cd frontend && npm ci --no-audit --no-fund)
# Smoke-prove the environment so a task starts from a known-good state.
npm test --silent >/tmp/omen-setup-test.log 2>&1 && echo "backend tests: pass" || { tail -40 /tmp/omen-setup-test.log; echo "backend tests: FAIL (see above)"; }
