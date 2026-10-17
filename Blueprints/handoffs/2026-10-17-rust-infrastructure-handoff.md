# Rust infrastructure programme — handoff

Date: 2026-10-17
Owner: Claude (cloud session) → next: Claude Code on the founder's Mac
Status: plan approved, prep done, three changes shipped in PR #716. Phases 1–4 are ready to build. Phase 5 waits for
the off-season.

## Read first

1. `Blueprints/specs/infrastructure/omen-rust-infrastructure-plan-v1.md`: the plan, the founder's decisions and the
   switchboard.
2. `Blueprints/specs/infrastructure/rust-prep/`:
   - `harness-and-ci-prep.md`: the map row, the draft `slops-rust-tdd` skill, and CI job drafts. Nothing is applied.
   - `phase3-parquet-column-map.md`: every nflverse source, its columns, and the parity risks.
   - `phase2-kvm2-batch-slot.md`: the 08:30 ET slot and its guards (Sunday stop is 13:45 UTC).
   - `phase5-decision-core-baseline.md`: only the trade search is CPU-heavy.

## Shipped in PR #716

- The trade search runs on `worker_threads` (`src/services/tradeSearchPool.js`). `TRADE_SEARCH_MODE=inline` is the
  rollback.
- OpenTelemetry is wired and off by default (`src/services/telemetry.js`). The collector config is in
  `infra/telemetry/` and is **not deployed**.
- The legacy `client/` app is retired.

## Founder decisions already made (do not re-ask)

- The programme is approved. Build everything behind switches set to off or shadow. Each production flip needs a
  one-line approval ("flip Phase N").
- The model is Ministral 3 3B, with `gemma3:4b` as the fallback. The grounding pass rate decides.
- Actions are pinned by full commit SHA with a version comment, and Dependabot proposes updates.
- Phase 5 (the shared Rust core) starts after the season.

## Why the Mac

This cloud container has no Docker daemon and no SSH or Tailscale access to KVM1, KVM2 or the Pi fleet, so the Docker
image and the hosts were never touched from here. The Mac needs: Docker, Tailscale, SSH to the hosts, Rust (`rustup`),
`cargo-zigbuild` and Zig, `uv`, and Xcode for Phase 5 later.

## Next, in order

1. **Production steps from #716, each with its own founder approval:**
   - Deploy the collector on Command Center: verify the image tag, then pin it by digest.
   - Set `OTEL_EXPORTER_OTLP_ENDPOINT` on KVM1.
   - Watch the trade worker in production.
2. **Phase 1, tooling:**
   - Apply the CI drafts and pin every action by SHA.
   - Add uv and ruff for `infra/warehouse`, `warehouse/test` and `ops`; Biome; typos; and shellcheck (no CI runs it
     today).
   - Move `frontend/` to Tailwind 4 and Rolldown.
   - Add the Rust row to the map and the `slops-rust-tdd` skill in Slops-OS.
3. **Phase 2, model jobs:**
   - Pull Ministral 3 3B on KVM2 and confirm Ollama runs it.
   - Build player notes behind `PLAYER_NOTES_ENABLED`, in shadow.
   - Run the first full batch manually on a weekday night.
4. **Phase 3, warehouse:**
   - Read the Parquet schemas first (pyarrow or polars). This could not be done from the cloud.
   - Build the Polars writer into a shadow schema and diff row for row against 1999 and 2026.
   - Check the live `nfl_games.kickoff_at` column.
5. **Phase 4, ops:** Vector, the Rust Pi watchdog (`aarch64-unknown-linux-musl`), and the restore-proof heartbeat
   monitor.
6. Add the trade spans (`omen.decision.trade`, `trade.find.scan`) once OpenTelemetry is live.

## Known state

- `npm test`: 2512 pass, 1 fail, 2 cancelled. The same three also fail on `main`, in
  `footballWarehouseReleaseArtifact` and `footballWarehouseUsageShadow`. Not caused by this work.
- `truth-gate.mjs` reports 273 P0 findings, both with and without this work.
