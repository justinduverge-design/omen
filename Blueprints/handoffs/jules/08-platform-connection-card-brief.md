# Jules brief — 08 · PlatformConnectionCard

**Queue position:** 08 of 13
**Depends on:** **01 Button, 03 Badge/Chip, 12 PlatformBadge — all hard, all blocking.**
**Status:** BLOCKED. Do not start Phase A until 01, 03, and 12 have all merged. This brief was originally drafted assuming only 01+03 as dependencies; **12 (PlatformBadge) was added afterward specifically because this brief cannot cleanly separate platform brand color from card chrome without it.** Jules must not implement PlatformConnectionCard before PlatformBadge exists — this is a hard gate, not a preference.
**⚠ Page-touching brief:** Phase B touches `ConnectLeague.jsx` only (one of five hot files, but the file with the most cumulative prior touches by this point in the sequence — briefs 01, 02, 04, 06 all touch it before this one does). **Do not run Phase B in parallel with any other brief's Phase B against ConnectLeague.jsx.**

---

## Objective

Build the `PlatformConnectionCard` Level-2 composition per `ui-component-system.md` P1.2, wrapping ConnectLeague's per-platform connection UI (currently strong behavior, weak/local chrome) into a reusable card. This is a composition, not a primitive — it consumes `Card`, `Button`, `Badge`, and `PlatformBadge`, it does not reimplement any of them.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §1 (deprecated pattern: three per-brand colored connect buttons → one `Button variant="primary"` + platform icon token), §4 (`Card` variants, especially `error`)
5. `Blueprints/backlog/ui-component-system.md` P1.2
6. `Blueprints/handoffs/jules/jules-01-button.md`, `jules-03-badge-chip.md`, `12-platform-badge-brief.md` — all three must be merged; read their final shipped APIs, not the draft APIs in these brief files.
7. Current `frontend/src/pages/ConnectLeague.jsx` in full — this file has real OAuth/session logic (Yahoo OAuth redirect, Sleeper username lookup, ESPN cookie form) that must be preserved exactly; only the presentational wrapper changes.
8. `frontend/src/components/platforms/PlatformConnections.jsx` — existing related component, read to understand current patterns and avoid duplicating logic that already lives there.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/PlatformConnectionCard.jsx` (new — lives in `ui/` since it's a Level-2 composition built from primitives, per the existing `components/ui/` convention for Card/Alert/EmptyState etc.)
- `frontend/src/components/ui/index.js` (extend barrel)

**Phase B:**
- `frontend/src/pages/ConnectLeague.jsx` — wrap existing per-platform sections in `PlatformConnectionCard`; replace the local `CTAButton`/`GhostButton` remnants if brief 01's migration didn't already remove them from this file (check first — 01 should have already handled these); replace raw platform-colored buttons with `PlatformBadge` + neutral `Button`.

**Both:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- **OAuth/session/API logic** — anything under `frontend/src/lib/`, `frontend/src/providers/`, or backend platform-auth code. This brief is presentational only. If wrapping the card requires touching how the Yahoo OAuth redirect or ESPN cookie submission actually works, stop — that's out of scope and a much higher-risk change than a UI composition PR.
- `frontend/src/components/ui/Button.jsx`, `Badge.jsx`, `Chip.jsx`, `PlatformBadge.jsx`, `Card.jsx` — consume, do not modify.
- `frontend/src/components/platforms/PlatformConnections.jsx` unless the overlap with the new card is genuinely redundant — if so, flag it in the PR description rather than merging/deleting silently.
- `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/package.json` / lockfile.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page other than `ConnectLeague.jsx`.

## Implementation requirements

```jsx
<PlatformConnectionCard
  platform="yahoo|sleeper|espn"
  status="connected|disconnected|error|pending"
  title="…"
  description="…"
  primaryAction={<Button variant="primary">Connect</Button>}
  secondaryActions={[...]}
  stepGuide={<StepGuideSlot />}   {/* optional, ESPN cookie flow */}
/>
```

- **platform badge slot** — uses `PlatformBadge` (12) for identity, not raw brand color on the card chrome itself.
- **status badge slot** — uses `Badge` (03) with `tone="success"` (connected) / `tone="risk"` (error) / `tone="neutral"` (disconnected/pending) — do not invent new status colors.
- **primary action** — uses `Button` (01) `variant="primary"`.
- **secondary actions** — uses `Button` (01) `variant="tertiary"` or `variant="link"` as appropriate (e.g. "Disconnect", "Switch account").
- **recovery/error state** — when `status="error"`, the card should be able to show inline error messaging; if brief 07 (EmptyState/ErrorState/LoadingState) has merged by the time this is built, reuse its `ErrorState` pattern rather than inventing a new one — if not yet merged, use a minimal inline message and flag the missed reuse opportunity.
- **step guide slot** — a `ReactNode` slot for the ESPN cookie-instructions flow (`EspnConnectGuide.jsx` content stays where it is; this slot just hosts a link/expander to it, not a duplicate of its content).

## Allowed variants

`status`: `connected` | `disconnected` | `error` | `pending`. No other statuses. No size variants — one card shape.

## Token usage

Reads tokens only through its child primitives (`Badge`, `PlatformBadge`, `Button`, `Card`) — the composition itself should not need to reference raw `--color-*` variables directly except for its own layout chrome (`--color-surface-1`, `--color-border`, standard card interior spacing per `component-lock-v1.md` §6: 24px top/bottom/sides). No raw hex anywhere.

## Accessibility requirements

- Status must be conveyed by text/badge label, not color alone (Badge already enforces this per brief 03).
- Card region should have an accessible name (e.g. `aria-label` derived from `title`, or a proper heading inside).
- All interactive elements (primary/secondary actions) inherit their accessibility from `Button` — confirm nothing wraps them in a way that breaks focus order or the `Button` component's own `focus-visible` handling.
- Preserve any existing ARIA live-region behavior in `ConnectLeague.jsx` for connection-state changes (e.g. announcing "Connected" after a successful OAuth round-trip) — do not regress this while restyling.

## Testing / build commands

- `npm --prefix frontend run build` — must succeed.
- **Manual end-to-end test of all three real connection flows** (Yahoo OAuth, Sleeper username, ESPN cookie) — this is not optional given the auth-adjacent nature; a build-success check alone is insufficient. Document exact steps taken in the PR.
- No automated test framework exists in `frontend/`; the backend has `node --test` (`npm test` at repo root) — confirm this PR doesn't touch anything that suite covers, and that it still passes untouched.
- Manual light/dark screenshots of all four status states across all three platforms (up to 12 combinations — a representative subset is acceptable if some combinations are rare/hard to reach manually, but state which were actually tested vs. visually inferred).

## Done criteria

1. `PlatformConnectionCard.jsx` implements the API above, composed entirely from existing primitives (01, 03, 12), zero raw hex.
2. All three ConnectLeague platform sections migrated to the new card.
3. All three real OAuth/connection flows manually verified end-to-end and still function identically to before.
4. Status badges use `Badge` tones correctly, not invented colors.
5. Platform identity uses `PlatformBadge`, not raw brand color on card/button chrome.
6. Accessibility live-region behavior for connection-state changes preserved.
7. Light/dark screenshots attached.
8. Ledger row + dated handoff exist; any redundancy with `PlatformConnections.jsx` flagged if found.

## PR title/body template

**Title:** `[UI composition] PlatformConnectionCard — ConnectLeague chrome consolidation`

**Body:**
```
## What
Adds PlatformConnectionCard per ui-component-system.md P1.2, composed from Button (01),
Badge/Chip (03), and PlatformBadge (12). Migrates ConnectLeague.jsx's three platform sections.

## Depends on (all merged before this PR started)
- Button (01): [commit/PR link]
- Badge/Chip (03): [commit/PR link]
- PlatformBadge (12): [commit/PR link]

## What did NOT change
OAuth/session/API logic for Yahoo, Sleeper, and ESPN connections — presentation only.
Manually verified all three flows end-to-end: [steps taken]

## Redundancy check
PlatformConnections.jsx overlap: [none found | flagged, see note]

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[status × platform matrix, noting which were live-tested vs. visually inferred]

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No OAuth/session/auth logic changes.
- No new platform support.
- No merging with `PlatformConnections.jsx` without an explicit flag.
- No new status colors beyond `Badge`'s existing tone set.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

None of the later briefs in this queue depend on `PlatformConnectionCard`. It's a terminal composition for the connection flow.

## Risk level

**High relative to other composition PRs in this queue** — not because the UI work itself is complex, but because it touches auth-adjacent flows (OAuth redirects, credential-adjacent forms) where a presentation-layer mistake (e.g. breaking a live-region announcement, or a status badge showing "connected" when the underlying state is actually "error") has real user-trust consequences. Treat the manual end-to-end verification step as non-negotiable, not a formality.

## Claude/Codex review checklist after Jules opens the PR

1. Confirm 01, 03, and 12 were actually merged before this PR's base commit — check the branch point, not just the stated dependency.
2. Confirm zero OAuth/session/API code changed — diff should be presentational only.
3. Manually re-verify at least one of the three connection flows yourself if at all possible, don't rely solely on Jules's self-report.
4. Confirm platform identity uses `PlatformBadge`, not raw brand hex reintroduced on card/button chrome.
5. Confirm status badges map correctly (`connected`→success tone, `error`→risk tone, etc.) and that a real error state actually renders the error tone, not just the happy path.
6. Confirm live-region/announcement behavior for state changes wasn't regressed.
7. Confirm no concurrent Phase-B collision on `ConnectLeague.jsx`.
8. Confirm ledger + handoff entries exist.
