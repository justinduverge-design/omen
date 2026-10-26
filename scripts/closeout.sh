#!/usr/bin/env bash
# Close-out gates in one command (was five commands agents had to remember; see AGENTS.md → The loop).
# A P0 or a failure exits non-zero. A gate that cannot run here says NOT RUN; it never reports a pass.
cd "$(dirname "$0")/.." || exit 1
rc=0
run() { echo "== $1"; shift; "$@" || rc=1; }
run "sprint staleness"   node scripts/check-sprint-staleness.js
run "kickoff drift"      node scripts/check-kickoff-drift.js
run "harness cost"       node scripts/harness-cost.js
run "no PII outbound"    node scripts/checks/no-pii-outbound.js
L0=${SLOPS_OS:-../..}
[[ -d $L0/Blueprints/tools ]] || L0=$HOME/Documents/GitHub/Valor-Core/Slops-OS
TG=$L0/Blueprints/tools/truth-gate/truth-gate.mjs
if [[ -f $TG ]]; then
  # Omen no longer sits inside the Slops-OS tree, so the gate reports ~270 old cross-layer P0s.
  # Block only on P0s in files this branch changed; print the total for the record.
  echo "== truth-gate (P0s in files this branch changed)"
  changed=$( { git diff --name-only origin/main...HEAD; git diff --name-only; git ls-files --others --exclude-standard; } | sort -u)
  out=$(node "$TG" --quiet 2>&1 || true)
  echo "   repo-wide P0 lines: $(grep -c '^P0' <<<"$out")"
  mine=$(grep '^P0' <<<"$out" | awk '{print $2}' | grep -Fxf <(printf '%s\n' "$changed") || true)
  if [[ -n $mine ]]; then grep -A1 '^P0' <<<"$out" | grep -A1 -Ff <(printf '%s\n' $mine); rc=1; else echo "   none"; fi
else
  echo "== truth-gate: NOT RUN (no Slops-OS tree; set SLOPS_OS)"
fi
VB=$L0/Blueprints/tools/valor-brain/validate.mjs
if [[ -f $VB ]]; then run "valor-brain" node "$VB"; else echo "== valor-brain: NOT RUN"; fi
exit $rc
