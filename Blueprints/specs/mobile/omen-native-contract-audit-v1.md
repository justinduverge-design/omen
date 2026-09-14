# Omen native — contract audit against the designed screens

**Date:** 2026-09-13
**Scope:** every contract the eight designed screens touch — what exists, what needs amending, what has to be created.
**Method:** each screen read against `Blueprints/api-routes.md`, the mobile specs, and the switcher/pages/trade workshops. Route names and contract versions below are quoted from `api-routes.md`, not assumed.

> Unofficial Cowork session: no active trust assignment, no L0 tree, no repo writes, no gate run. A proposal to route into claimed sprint items.

---

## 0. Headline

**Nothing needs to be created from scratch on the API side.** Every screen has a payload behind it already. The work splits into three amendments that are genuinely breaking, four that are additive, and four documents — not endpoints — that do not exist yet.

I was wrong about one thing in the earlier plan: **`GET /api/moves → moves-history.v1` exists.** The Ledger index is not a new route. It is a one-line contract that needs fields.

---

## 1. What exists — route by route, screen by screen

| Screen | Route(s) | Contract | State |
|---|---|---|---|
| Command Center | `GET /api/dashboard/summary` | `dashboard-summary.v1` | Exists. Carries `game_week {season, week, phase, day, is_off_season}` — this is what drives the headline rotation and the quiet-week state. |
| Command Center · matchup | `GET /api/league/overview` | `league-overview.v1` | Exists. `matchup` block with per-section `status`, `projected` on all three providers since 2026-09-06. |
| Command Center · waiver seat | `GET /api/waivers/analysis` | `waiver-analysis.v1` | Exists, and richer than the seat needs: best move, displaced starter, recommended drop **with stated cost**, three alternatives with a tradeoff sentence each. |
| Command Center · ledger rows | `GET /api/moves` | `moves-history.v1` | Exists. **Documented in five words.** See §2.3. |
| Omen | `POST /api/omen/mvp-move` | `2026-05-18.omen-live.v1` | Exists. Fail-closed scoring, persistence-before-issue, `off_season` state. See §2.1 — this is the breaking one. |
| Omen · detail | `GET /api/start-sit/detail` | `start-sit-detail.v1` | Exists. Evidence already categorised with per-entry `kind` (`verified` / `projection` / `model` / `inference` / `limitation`). The Evidence Disclosure component maps onto this directly. |
| League | `GET /api/league/overview` | `league-overview.v1` | Exists. `matchup` / `standings` / `activity`, independent `status` per section. Missing the Trade-targets block — §2.4. |
| League · standings | `GET /api/league/standings` | `league-standings.v1` | Exists, unchanged, provider order preserved. |
| Trade | `POST /api/trade/compare` | `trade-compare.v2` | Exists. Four verdict states, personalization via `league_context`, player identity gate. |
| Trade · share | `POST /api/trade/share` | `trade-share.v1` | Exists. |
| Ledger detail | `GET /api/moves/:id` | `move-detail.v1` | Exists and is strong: immutable snapshot, evidence-at-the-time in five categories, action only when safely known, `issued_at_timezone`. |
| Switcher | `GET /api/leagues`, `POST /api/leagues/active` | `league-directory.v1`, `league-active-selection.v1` | Exists. `active` returns `refresh: ["command_center","omen","league","waiver_watch","ledger"]` — exactly the global-context behaviour the one-line switcher needs. |
| Account | `user-export.v1`, `user-consent.v1`, `user-delete.v1`, `platform-provider-state.v1`, `DELETE /api/platforms/:platform` | — | All exist. |

---

## 2. Amendments needed

### 2.1 `2026-05-18.omen-live.v1` → confidence bands. **BREAKING. Blocking.**

The pages workshop locks confidence to **bands, not percentages** — `Confident / Leaning / Coin flip` — and flags it itself as "a breaking change to shipped surfaces" against `OmenDecisionBriefPayload.confidence`.

- Version it. The current name is a date-stamped one-off (`2026-05-18.omen-live.v1`); take the opportunity to rename to `omen-decision-brief.v2` and record the alias.
- `confidence: { band, drivers[] }`. The band never travels without drivers — that pairing is the locked rule.
- **Delete the numeric field.** Not "keep for internal use."
- Band computed **server-side**. A client-side threshold is a model calibration living in the UI layer, which is the exact failure the ban exists to prevent.
- Add `scope: { team_id, week }` and `issued_at` so *one call per team per week* is enforceable in the payload rather than by convention.
- Add `superseded_by: move_id | null`. A revised call is a new row that names the one it replaced; never an edit.

**Also needs:** the factor families the design shows — weather, travel and rest, surface — as evidence entries carrying `kind` plus a new `family` and `source`. `start-sit-detail.v1` already has `kind`; this extends the same vocabulary rather than inventing one.

### 2.2 `league-overview.v1` → Trade targets block. **Additive.**

The League redesign's differentiating section reads the other eleven rosters for holes and surpluses.

- New optional `trade_targets: { status, teams[] }` with `status: available | no_rosters | unavailable`.
- Each team: `team_id`, `team_name`, `hole` (position + one sentence), `surplus`, `source`.
- **`no_rosters` is a first-class state**, matching the existing "no rosters, no trade call" rule. If a provider will not return other teams' rosters, the section does not render and says why.
- `activity` already ships `status: "empty"` with `unavailable_families: ["transactions"]` and is explicitly described as "the seam the waiver/trade work fills without a contract change" — worth checking whether targets belong there instead of a new block.

### 2.3 `moves-history.v1` → fields for a real Ledger. **Additive, but it is currently five words.**

`api-routes.md` documents it as "Move History / Hall of Records." That is not a contract. The Ledger screen needs, per row:

- `provenance: "verified" | "self_reported"` — **required**, never inferred, rendered as a visible distinction. Verified and self-reported never merge.
- `followed: true | false | null` — `null` means not safely known, matching `move-detail.v1`'s "user action only when safely known."
- `outcome: "worked" | "didnt_work" | "pending"` — translated, never the raw `win`/`loss` column `move-detail.v1` warns about.
- `move_type`, `week`, `issued_at` + `issued_at_timezone`, `headline`.
- **No aggregate hit-rate.** A percentage across mixed-provenance rows is a fabricated statistic. The "9 closed · 6 worked" line on Command Center is a count, and counts are honest.

### 2.4 `waiver-analysis.v1` → copy contract, not schema. **Additive.**

The data is all there. What is not pinned is **who writes the sentence**. D5 locks reason → drop → outcome in the second person.

- Recommend **server-authored**. The reason must name the evidence it used; a client assembling it from fields will eventually assemble one the evidence does not support.
- The honest-negative states `no_credible_move` and `no_low_cost_drop` already exist in the contract and are the most under-used thing in it. The quiet-week screen depends on them.

### 2.5 `trade-compare.v2` → three-team execution. **Additive, gated on a probe.**

- `submission: supported | handoff_only | unavailable` already exists. Add `multi_team_submission` per provider — **currently unverified for all three.** Probe before the third partner slot ships.
- Add `execution_steps[]` per provider and per trade shape. The three-team ESPN steps in the design are content, not schema, but they need a home and an owner.

### 2.6 `omen-league-switcher-contract-v1.md` → one switcher. **Doc amendment.**

§1 specifies a carousel on Command Center and a bar elsewhere. The design collapses both to one line on all four tabs. Amend §1; everything else in that document holds unchanged — pinned controls, favourites in star order, sheet ordering, Platinum stars, prefetch, no-teardown switch. Also close its own out-of-scope item on light-vs-dark: D1 and D6 settle it.

### 2.7 `omen-native-design-system-registry-v1.md` → the D7 amendment. **Blocking, governance.**

Unchanged from the visual lock: split the §2.1 data-semantic row so `platform` stays invariant and risk / data-source / confidence / position move to "invariant in meaning, not in colour"; replace the §2.3 colour table with the form table; mark the §2.2 light column withdrawn.

### 2.8 `omen-app-pages-workshop-v1.md` → League order. **Founder decision.**

Locked order is Matchup → Standings → Waiver → Activity. Proposed: strip → Table → Trade targets → Waiver → Activity. This is the change that stops League reading as a second Command Center.

---

## 3. What does not exist and has to be created

All four are **documents, not endpoints.**

| # | Create | Why |
|---|---|---|
| N1 | One screen contract per destination, in `Blueprints/specs/design/screen-contracts/` — Omen, League, Trade, Ledger and Account, named to match the existing file's pattern | That directory holds exactly one file today, for Command Center. Five of the six destinations have no screen contract at all, which is why the page work keeps being redone from screenshots. |
| N2 | Component entries in `component-lock-v1.md` for **Matchup Spine**, **Context Strip**, **Evidence Disclosure** | All three are approved Figma *proposals* (`25:26`, `25:2`, `25:50`) and the registry says a proposal stays a proposal until founder approval and registry update. They are being built against; they should be locked. |
| N3 | A data-source form-treatment spec | Safety-gated. `AGENT.md` requires mock data to be clearly labelled; D7 removes the colour that did it. The hatch / dashed / struck treatments need fixed anatomy before `data-stub` colour is deleted from `OmenColor.kt`. |
| N4 | A quiet-state copy spec, both variants | The workshop locks a voiced quiet state *and* a voice fence. The neutral variant is drawn. **The straight variant — after a loss, an injury, a breakage — is not written**, and it is the half that matters most. |

---

## 4. Order

```
2.7 registry amendment      governance, no code, unblocks everything visual
2.1 confidence bands        breaking — longest runway
N3  data-source treatments  safety gate on D7
2.6 switcher §1             one-line doc change
──────────────────────────  then build
N2  component lock          lock the three before they are built against
N1  screen contracts        one per destination, as each is built
2.3 moves-history fields    Ledger
2.2 trade targets           League
2.4 waiver copy owner       rides with League
2.5 multi-team probe        gates the third partner slot
2.8 League order            founder call, needed before League is built
```

---

## 5. Founder calls still open

1. **League section order** (2.8).
2. **Registry amendment** for literal brass-only (2.7).
3. **Platinum** as the one named exception for the favourite star.
4. **Wix Madefor as two optical cuts** — an amendment to the 2026-09-07 one-family decision.

---

## 6. Gates

All four close-out gates are **NOT RUN** for this session — no L0 tree, no write authority. `node scripts/check-kickoff-drift.js` was run in a standalone clone and passed at 13 entries.
