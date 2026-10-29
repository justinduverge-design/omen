#!/usr/bin/env bash
# Close-out gates in one command (was five commands agents had to remember; see AGENTS.md → The loop).
# A P0 or a failure exits non-zero. A gate that cannot run here says NOT RUN; it never reports a pass.
# No set -e on purpose: every gate runs and reports, and rc carries any failure (STANDARDS rule 6).
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
rc=0
run() { echo "== $1"; shift; "$@" || rc=1; }
run "sprint staleness"   node scripts/check-sprint-staleness.js
run "kickoff drift"      node scripts/check-kickoff-drift.js
run "harness cost"       node scripts/harness-cost.js
run "no PII outbound"    node scripts/checks/no-pii-outbound.js
# valor-brain runs Valor-Core's validator (ops/valor-brain, moved there by STANDARDS card I). Valor-Core's
# location lives in one place, VALOR_CORE; unset, walk up from Omen (on the Mac, Omen sits inside it).
# truth-gate was retired 2026-10-29 (card D): its ~270 stale findings were filtered, never fixed (rule 12).
vc=${VALOR_CORE:-}
if [[ -z $vc ]]; then
  d=$PWD
  while [[ $d != / ]]; do d=$(dirname "$d"); [[ -f $d/ops/valor-brain/validate.mjs ]] && { vc=$d; break; }; done
fi
VB=${vc:+$vc/ops/valor-brain/validate.mjs}
if [[ -n $VB && -f $VB ]]; then run "valor-brain" node "$VB" --root=.; else echo "== valor-brain: NOT RUN (no Valor-Core found; set VALOR_CORE)"; fi
exit $rc
