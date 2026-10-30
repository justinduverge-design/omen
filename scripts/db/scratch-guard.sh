# shellcheck shell=bash
# Refuses any Postgres target that isn't this machine. Sourced by rehearse-redo.sh and rehearse-pending.sh,
# which drop and create databases. An allowlist, because a denylist of production names missed
# PGSERVICE, PGHOSTADDR and raw IPs (card K review).
case "${PGHOST:-}" in
  ""|localhost|127.0.0.1|::1|/*) ;;
  *) echo "refusing: PGHOST=${PGHOST} is not local (localhost, 127.0.0.1, ::1 or a socket path)" >&2; exit 2 ;;
esac
for v in PGSERVICE PGSERVICEFILE PGHOSTADDR; do
  if [ -n "${!v:-}" ]; then echo "refusing: $v is set; a rehearsal only runs against local Postgres" >&2; exit 2; fi
done
