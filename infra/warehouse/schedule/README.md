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
- **When:** 11:15 UTC daily (07:15 ET), after nflverse's nightly publish. Persistent across reboots.
- **Failure:** `OnFailure` posts a payload-free notice to the Slops Discord channel
  (`/etc/slops-alerting/discord-webhook-url`); then read `journalctl -u omen-warehouse-ingest -n 80`.
- **Run now:** `sudo systemctl start omen-warehouse-ingest`. **Stop:** `sudo systemctl disable --now omen-warehouse-ingest.timer`.
- Supabase keeps serving the app whatever this job does (`FOOTBALL_DATA_MODE=shadow`).
