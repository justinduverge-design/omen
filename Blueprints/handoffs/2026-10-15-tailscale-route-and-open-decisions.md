# Handoff — Tailscale route for the Claude session, and what is open (2026-10-15)

Work continues in another session (the founder is on a phone; the Tailscale setup waits for a laptop).
PR: #671 (draft, one big PR, not to be merged until the whole data-layer task is done).

## Why

This session cannot reach `omen-prod` (KVM1) or the warehouse. Without that, the warehouse state, the
data-quality checks (task 4) and any warehouse work cannot be verified, and three documents currently
disagree about the warehouse (see `Direction/reviews/2026-10-15-data-layer-gap-review.md`).

## Steps (founder, on a laptop)

1. **Tailscale admin, Settings, Keys.** A tagged, ephemeral, reusable, pre-approved auth key already exists
   (created 2026-10-15). Confirm it lists a tag. If it lists none, revoke it and make a new one with a tag.
   Never paste the key into chat.
2. **Access controls.** Copy the policy text (it holds no secrets) into the session. Claude writes the edit that
   limits the tag to `omen-prod` on port 22 only. The default Tailscale policy lets every device reach every
   other device, and a tagged key would inherit that.
3. **Claude environment settings** (cloud environment menu in the session title bar, then Edit):
   - environment variable `TS_AUTHKEY` = the key;
   - Network access, allowed domains: `login.tailscale.com`, `controlplane.tailscale.com`,
     `pkgs.tailscale.com`, `*.tailscale.com`;
   - Setup script (not yet run anywhere):
     ```
     curl -fsSL https://tailscale.com/install.sh | sh
     nohup tailscaled --tun=userspace-networking --socks5-server=localhost:1055 --state=mem: >/tmp/tailscaled.log 2>&1 &
     sleep 3
     tailscale up --auth-key="$TS_AUTHKEY" --hostname=claude-session --shields-up
     ```
   - Start a new session; settings apply only to new sessions.
4. **On omen-prod**, a read-only way in (a production change, needs the founder's yes first): a key restricted by
   a forced command to the existing read-only warehouse verifier (`infra/warehouse/verify-production-readonly.sh`),
   in the pattern of the `omen-football-status` account in `infra/schedule/ACCESS.md`. Not the founder's login.

Unproven: whether Tailscale registers through this sandbox's HTTPS proxy (it should relay over HTTPS; direct
UDP is blocked). Try it before relying on it. `api.sleeper.app` is also denied by the network policy; add it
under allowed domains if live Sleeper probing is wanted.

## Open decisions for the founder

1. Supabase branch cost: approve, or treat the Postgres 17 CI job (`redo-rehearsal`) as the pre-production gate.
   `create_branch` timed out once and created nothing.
2. Where the warehouse-side data-quality checks (task 4) run: this tailnet route, or founder-run read-only commands.
3. Next build: the scoring-rules writer (redo spec section 7, ticket 6), which blocks grading calls.
4. Step 16 (`sql/2026-10-01-redo/16_projection_fk_indexes.*`) is not applied anywhere; production apply needs the
   founder's explicit yes and an `@codex review` first.
