# Warehouse schedule (KVM1)

The warehouse refreshes itself daily. Installed on KVM1 (`omen-prod`) as root:

| File | Installed to |
|---|---|
| `omen-warehouse-run-current-season` | `/usr/local/sbin/` (0755) |
| `omen-warehouse-alert` | `/usr/local/sbin/` (0755) |
| `omen-warehouse-ingest.service`, `omen-warehouse-ingest.timer`, `omen-warehouse-alert@.service` | `/etc/systemd/system/` (0644) |

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now omen-warehouse-ingest.timer
```

- **What runs:** the selected release's digest-pinned worker (`/opt/omen/warehouse/current/RELEASE-CONTRACT`),
  `ingest --season YYYY`, through the release's Compose file with `--no-deps`. Unchanged sources are skipped.
- **When:** 07:15 America/New_York daily (11:15 UTC in summer, 12:15 UTC in winter), after nflverse's nightly publish. Persistent across reboots.
- **Chain:** `OnSuccess=omen-warehouse-backup.service` starts the encrypted backup when the ingest succeeds. The standalone
  backup timer is disabled (`systemctl disable --now omen-warehouse-backup.timer`); its unit file stays in the release.
  Full schedule and rules: `infra/schedule/TIMERS.md`.
- **Alerting (Uptime Kuma on the Pi, monitor "Omen warehouse daily ingest", push type, 26 h window):**
  a successful run pushes `up`; a failed run pushes `down` through `OnFailure`; no push for 26 h means
  the job did not run. Kuma alerts through its Discord notification. The push URL is the root-only file
  `/etc/omen-warehouse/kuma-push-url` (0600), written by the founder; it is never printed.
  (KVM1 has no Discord webhook; the webhook lives only on the Pi.) Then read
  `journalctl -u omen-warehouse-ingest -n 80`.
- **Run now:** `sudo systemctl start omen-warehouse-ingest`. **Stop:** `sudo systemctl disable --now omen-warehouse-ingest.timer`.
- Supabase keeps serving the app whatever this job does (`FOOTBALL_DATA_MODE=shadow`).
