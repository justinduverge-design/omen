#!/usr/bin/env bash
set -euo pipefail
umask 077

# Applies the founder-approved keep counts after a successful warehouse backup.
# The policy is deliberately external to the release because its values must be
# derived from measured KVM2 growth. Missing or unsafe policy fails closed.

EXPECTED_HOST="omen-prod"
BACKUP_USER="omen-backup-client"
BACKUP_HOME="/var/lib/omen-backup-client"
RESTIC_PASSWORD_FILE="$BACKUP_HOME/restic-password"
COMMISSIONED_BACKUP="/opt/omen-backup/bin/backup-supabase.sh"
POLICY_FILE="/etc/omen-warehouse/warehouse-restic-retention"

[[ $# -eq 0 || ( $# -eq 1 && "$1" == "--check" ) ]] || { echo "usage: apply-retention.sh [--check]" >&2; exit 64; }

[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse retention refused: wrong host" >&2; exit 69; }
[[ "$(id -u)" -eq 0 ]] || { echo "warehouse retention requires root orchestration" >&2; exit 77; }
for command in restic runuser; do command -v "$command" >/dev/null || { echo "warehouse retention requires $command" >&2; exit 69; }; done
[[ -f "$POLICY_FILE" && ! -L "$POLICY_FILE" && "$(stat -c '%a:%U:%G' "$POLICY_FILE")" == "600:root:root" ]] || {
  echo "warehouse retention refused: measured policy is unavailable or unsafe" >&2; exit 78;
}
[[ -f "$RESTIC_PASSWORD_FILE" && ! -L "$RESTIC_PASSWORD_FILE" ]] || { echo "warehouse retention refused: Restic credential is unavailable" >&2; exit 78; }
[[ -r "$COMMISSIONED_BACKUP" ]] || { echo "warehouse retention refused: repository configuration is unavailable" >&2; exit 78; }

mapfile -t policy_lines < "$POLICY_FILE"
[[ "${#policy_lines[@]}" -eq 1 ]] || { echo "warehouse retention refused: policy must be exactly one line" >&2; exit 78; }
read -r keep_daily keep_weekly keep_monthly extra <<< "${policy_lines[0]}"
[[ -z "${extra:-}" && "$keep_daily" =~ ^[1-9][0-9]?$ && "$keep_weekly" =~ ^[1-9][0-9]?$ && "$keep_monthly" =~ ^[1-9][0-9]?$ ]] || {
  echo "warehouse retention refused: policy must contain three bounded positive counts" >&2; exit 78;
}
[[ "${1:-}" == "--check" ]] && { echo "warehouse retention policy is ready"; exit 0; }
repository="$(sed -n 's/^RESTIC_REPOSITORY="\([^"]*\)"$/\1/p' "$COMMISSIONED_BACKUP")"
[[ "$(printf '%s\n' "$repository" | wc -l)" -eq 1 && "$repository" == sftp:* ]] || {
  echo "warehouse retention refused: commissioned repository assignment is invalid" >&2; exit 78;
}

runuser -u "$BACKUP_USER" -- env HOME="$BACKUP_HOME" RESTIC_REPOSITORY="$repository" RESTIC_PASSWORD_FILE="$RESTIC_PASSWORD_FILE" \
  restic forget --no-cache --tag omen-football-warehouse --keep-daily "$keep_daily" \
    --keep-weekly "$keep_weekly" --keep-monthly "$keep_monthly" --prune
echo "warehouse retention completed"
