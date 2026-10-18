#!/bin/bash
# Runs inside debian. For every scenario: bash check vs Rust binary, compare stdout, exit code, state (minus checked_at).
set -u
echo a459056448eb4cafadb2e4480abea91a > /etc/machine-id
mkdir -p /var/lib/steward/ssh /var/lib/steward/state && touch /var/lib/steward/ssh/omen-backup-status-ed25519 /var/lib/steward/ssh/known_hosts
export PATH=/p/bin:$PATH
pass=0; fail=0
T0=1792325597
scenario() { # name kind script payload-dir now [extra env]
  local name=$1 kind=$2 script=$3 dir=$4 now=$5; shift 5
  local stem; case $kind in supabase-backup) stem=backup-freshness;; football-backup) stem=football-backup-freshness;; restic-check) stem=restic-check-freshness;; esac
  rm -f /var/lib/steward/state/*
  b_out=$(env PAYLOAD_DIR=$dir NOW_EPOCH=$now "$@" bash /p/checks/$script 2>/dev/null); b_rc=$?
  r_out=$(env PAYLOAD_DIR=$dir NOW_EPOCH=$now "$@" /p/bin/steward-freshness $kind --shadow 2>/dev/null); r_rc=$?
  b_state=$(grep -v '^checked_at=' /var/lib/steward/state/$stem.status 2>/dev/null)
  r_state=$(grep -v '^checked_at=' /var/lib/steward/state/$stem.rust.status 2>/dev/null)
  if [ "$b_out" == "$r_out" ] && [ $b_rc -eq $r_rc ] && [ "$b_state" == "$r_state" ]; then pass=$((pass+1)); echo "PASS $name rc=$b_rc $(echo "$b_out" | head -2 | tr '\n' ' ')"
  else fail=$((fail+1)); echo "FAIL $name bash_rc=$b_rc rust_rc=$r_rc"; diff <(echo "$b_out"; echo "$b_state") <(echo "$r_out"; echo "$r_state") | head -8; fi
}
mut() { # dir from-file sed-expr -> new dir with all three payloads, one mutated
  local d; d=$(mktemp -d); cp /p/fixtures/*.txt $d/; sed -i -E "$2" $d/$1; echo $d
}
F=/p/fixtures
D=86400
# Supabase: completed 2026-10-18T12:13:17Z
for a in 0 7200 28800 28801 43200 43201 86400 86401 200000; do scenario "supabase age=$a" supabase-backup backup-freshness.sh $F $((T0+a)); done
scenario "supabase skew -300" supabase-backup backup-freshness.sh $F $((T0-300))
scenario "supabase future -301" supabase-backup backup-freshness.sh $F $((T0-301))
scenario "supabase attempt FAILED" supabase-backup backup-freshness.sh "$(mut status.txt 's/^ATTEMPT_RESULT=.*/ATTEMPT_RESULT=FAILED/')" $T0
for e in 's/^PROTOCOL=.*/PROTOCOL=v9/' 's/^HOST=.*/HOST=kvm2/' 's/^RECOVERY_FORMAT=.*/RECOVERY_FORMAT=1/' 's/^SNAPSHOT_ID=.*/SNAPSHOT_ID=xyz/' 's/^AUTH_USERS=.*/AUTH_USERS=/' 's/^ATTEMPT_RESULT=.*/ATTEMPT_RESULT=MAYBE/' 's/^COMPLETED_UTC=.*/COMPLETED_UTC=2026-02-30T00:00:00Z/' 's/^COMPLETED_UTC=.*/COMPLETED_UTC=soon/' 's/^STATUS_CHANNEL=.*/STATUS_CHANNEL=ERROR/' '/^SUCCESS_RESULT/d'; do
  scenario "supabase mut $e" supabase-backup backup-freshness.sh "$(mut status.txt "$e")" $T0; done
scenario "supabase bad thresholds" supabase-backup backup-freshness.sh $F $T0 HEALTHY_MAX_SECONDS=50000
# Football: completed 2026-10-13T11:50:08Z (= T0 - 433389)
FB=1791892208
for a in 0 $((5*D)) $((8*D)) $((8*D+1)) $((9*D+1)) $((14*D)) $((14*D+1)); do scenario "football age=$a" football-backup football-backup-freshness.sh $F $((FB+a)); done
for e in 's/^PROTOCOL=.*/PROTOCOL=v9/' 's/^SUCCESS_RESULT=.*/SUCCESS_RESULT=FAILED/' 's/^SNAPSHOT_ID=.*/SNAPSHOT_ID=12/' 's/^COMPLETED_UTC=.*/COMPLETED_UTC=2026-13-01T00:00:00Z/'; do
  scenario "football mut $e" football-backup football-backup-freshness.sh "$(mut football-status.txt "$e")" $FB; done
# Restic: completed 2026-10-18T09:34:15Z
RS=1792316055
for a in 0 $((9*D)) $((9*D+1)) $((14*D+1)) $((21*D+1)); do scenario "restic age=$a" restic-check restic-check-freshness.sh $F $((RS+a)); done
for e in 's/^CHECK_RESULT=.*/CHECK_RESULT=FAILED/' 's/^CHECK_RESULT=.*/CHECK_RESULT=WEIRD/' 's/^PROTOCOL=.*/PROTOCOL=v9/' 's/^COMPLETED_UTC=.*/COMPLETED_UTC=x/'; do
  scenario "restic mut $e" restic-check restic-check-freshness.sh "$(mut restic-status.txt "$e")" $RS; done
# Bad local inputs: both refuse before any remote call
scenario "supabase bad NOW_EPOCH" supabase-backup backup-freshness.sh $F abc
scenario "supabase empty threshold = default" supabase-backup backup-freshness.sh $F $T0 HEALTHY_MAX_SECONDS=
# CRLF payload: awk keeps the \r, so the protocol no longer matches
scenario "restic CRLF payload" restic-check restic-check-freshness.sh "$(mut restic-status.txt 's/$/\r/')" $RS
# Dead channel (both retry 4x with 20 s pauses: slow on purpose, one per kind)
scenario "restic channel down" restic-check restic-check-freshness.sh $F $RS CHANNEL_DOWN=1
echo "== $pass passed, $fail failed"
