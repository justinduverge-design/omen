# Football warehouse API shadow and first encrypted backup — 2026-10-09

## Outcome

The production API is running in `shadow` mode on `omen-prod`: Supabase still supplies the response while the API has a verified private reader path to the real football warehouse. The first warehouse PostgreSQL custom-format dump was checksummed and stored in the commissioned encrypted Restic repository on KVM2.

PR #577 remains open and unmerged. The warehouse is not primary, Supabase Step 14 is not retired, and historical backfill has not started.

## Selected production releases

- API commit: `7c098f7c63f7075e2ac776cf61e0498640d7e6b2`
- API deploy: `https://github.com/justinduverge-design/omen/actions/runs/37883601131`
- warehouse release: `1042077a3d7dc4bea0978f405f3a00b0f92e1bb1`
- warehouse manifest: `c9654ecebbf62e820c19ae5319f8bd19f6c05fd9744d8ec88b93af520d70867b`
- warehouse bundle: `3c78a1cf66f2eaaba635eb4c38ab077458da699679107d4ca5ba01e2fbff4618`
- worker image: `ghcr.io/justinduverge-design/omen-warehouse-ingest@sha256:a785281df5e84514b81f15987d66e85733340d786eca26cb0b7483b4ff411ce4`

## API shadow evidence

- `omen_api` is healthy, attached to `omen_network` and private `omen_warehouse_net`, with the reader URL mounted `0440 root:10001`.
- Runtime mode is `shadow`. Future ordinary deploys default safely to `supabase` unless shadow is explicitly selected.
- A production-container repository query returned `verified`, one matched player, one row, Week 1.
- Public API health passed and no matched API or warehouse errors appeared after promotion.
- Shadow startup is fail-safe: reader initialization failure cannot take down a Supabase-authoritative route. Warehouse-primary initialization remains fail-closed.

This proves the mounted reader and real database path. It does **not** prove that a real authenticated Start/Sit request produced a matching Supabase-versus-warehouse aggregate comparison event.

## First encrypted backup evidence

Run `warehouse-20261009T045409Z` completed as Restic snapshot `34d65043d7922b65d0f43243bc59dc6dc88c816fe406437e193f9512a0b69a11` with tags `omen-football-warehouse` and `schema-v2`.

- dump bytes: 12,999,419
- dump sha256: `fb065d21697ecf28f88496cc4a64e600d10f56eb64f05dcfa93721f6beea71b8`
- manifest verifier: `checksum_verified`
- receipts: 7 succeeded, 0 started
- row counts: 32 teams; 24,844 players; 272 games; 4,445 player weeks; 128 team weeks; 12,809 weekly rosters; 11,155 plays
- KVM2 repository allocated bytes after backup: 45,191,168
- previous allocated bytes: 32,387,072
- first observed repository allocation growth: 12,804,096 bytes
- KVM2 free bytes after backup: 82,147,565,568

The first attempt failed closed because the backup-only account could not traverse a root-only parent. Release `1042077a` changes only that parent to non-listable execute traversal (`0711`); snapshots remain `0700` and dump/manifest files `0400`. Two exact failed local runs were removed before the successful retry.

## Monitoring and recovery state

The selected release's read-only status export reports `UP`: database running and healthy, restart policy correct, no host PostgreSQL listener, schema verified, no started receipts, latest receipt succeeded and fresh, all required fact tables populated, and zero orphan facts.

Beszel is now directly inspected and sees both warehouse hosts:

- `Omen Production — KVM1`: `up`; about 9.7% memory and 15.9% disk at the witness; `omen_api` healthy; `omen_football_warehouse` healthy and identified by the pinned PostgreSQL image.
- `Private AI — KVM2`: `up`; about 7.7% memory and 20.9% disk at the witness.
- Beszel contains no alert records for omen-prod or any other system. This proves telemetry visibility, not notification delivery.

### Isolated KVM2 restore — completed 2026-10-09

The first encrypted snapshot was restored and independently verified on KVM2 without copying the Restic password, widening the SFTP account, or pulling an image:

- exact PostgreSQL image content ID `sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3` transferred by Docker save/load from omen-prod;
- manifest and dump streamed from Restic on omen-prod over the existing Tailscale SSH paths into a `0700 root:root` KVM2 source directory;
- manifest and dump were `0400 root:root`; checksum verification passed before restore;
- disposable PostgreSQL ran with `--network none`, no published port, read-only root filesystem, bounded CPU/memory/PIDs, fresh volume, and the exact image ID;
- restored schema version 2, 7 succeeded/0 started receipts, all seven table counts, zero representative receipt-chain violations, and dump SHA-256 all matched the manifest;
- retained proof: `/var/lib/omen/warehouse-restore-proofs/warehouse-20261009T045409Z.restore-proof.json`, `0400 root:root`;
- proof state: `restored_verified`, verifier run `restore-20261009T130040Z`;
- disposable container and volume removed automatically after success; decrypted restore source removed after independent proof verification;
- encrypted Restic snapshot retained.

The first restore attempt exposed and preserved two fail-closed defects before proof: Docker save/load retains the exact image content ID but not the registry `RepoDigest` reference, and the evidence SQL missed one closing parenthesis. Commits `3553fa61` and `cdfd3d1f` correct those boundaries and add regression assertions. The failed disposable container/volume were inspected and then removed before the unchanged source was retried.

## Verification

- full repository suite: 2,057/2,057 passed
- production dependency audit: 0 vulnerabilities
- immutable release verifier: passed
- production read-only warehouse verifier: passed
- local manifest/dump checksum verifier: passed
- Restic snapshot identity/path/tag query: exactly one match
- isolated KVM2 restore proof: `restored_verified`
- post-restore disposable containers/volumes: zero
- full repository suite after restore corrections: 2,057/2,057 passed
- `git diff --check`: passed before checkpoint
- kickoff drift: passed
- Valor Brain: 5/5 passed
- sprint staleness: failed on 8 pre-existing Direction findings unrelated to this batch
- Truth Gate: failed on 3 pre-existing P0s in the live Layer 0 tree (one broken historical path and two non-authoritative files still in the live tree); this blocks formal close-out but did not invalidate the production proofs above

## Next batch, in order

1. Produce one authenticated real Start/Sit shadow comparison and prove parity or record the exact bounded delta.
2. Turn the proven manual no-secret-copy restore path into a narrow scheduled dispatcher and retain a recurring restore proof.
3. Add a warehouse-specific alert to the already-proven Beszel telemetry path and exercise one controlled DOWN-to-UP transition.
4. Start the chronological backfill at 1999; the one-time current-season recovery gate now passes.
5. Promote warehouse-primary only when comparison and monitoring proofs pass; keep Supabase as rollback.
6. Rehearse and separately approve Supabase Step 14 retirement only after warehouse-primary operation is proven.

No protected decision-engine file changed.
