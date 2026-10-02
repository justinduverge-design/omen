# DECISIONS & LEDGER Schema Blueprint — Omen Rebuild (Gate 1)

- **Date:** 2026-09-29
- **Status:** Proposed — architecture review, then frozen before implementation work orders.
- **Derives from:** `decision-envelope.md` (envelope fields), `domain-invariants.md` (I1–I11), screen contracts (OmenCall, TradeVerdict, TradeShare, Ledger, LedgerDetail), current `moves` table evidence (`src/routes/moves.js`).
- **Target:** Postgres 17 on Supabase. Plain Postgres features + RLS only. One migration file per table (see §8).

## Design principles

1. **The envelope is the schema.** Every field in `decision-envelope.md` has a column. If the envelope gains a field, the schema gains a column — never the reverse.
2. **Immutability is enforced twice.** RLS governs *who* (no UPDATE/DELETE policies for immutable tables); a `BEFORE UPDATE OR DELETE` trigger governs *what can ever happen*, because `service_role` bypasses RLS. The trigger is the real backstop.
3. **Absence means unknown.** No row = no information. This is never read as a negative (per the `moves.js` rule: a null `followed` must never be read as "did not follow").
4. **Owner on every row.** `user_id uuid NOT NULL` everywhere (I1). It references the canonical identity landing in WO-06; the FK is added then.
5. **Canonical naming.** `week` not `week_num`; `provider`/`provider_league_id` not `platform`/`league_id` (I9). Provider ids map to the canonical player id, never stored as join keys (I2).

---

## 1. `decisions` — one immutable row per decision instance

Stores the decision envelope. Replaces the recommendation-content and metadata concerns of `moves` (`id, week_num→week, season, move_type, headline, reasoning, confidence, created_at, platform→provider, league_id→provider_league_id`).

```sql
CREATE TABLE public.decisions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),  -- decision_id
  user_id            uuid        NOT NULL,  -- canonical identity (WO-06); FK added then
  provider           text        NOT NULL CHECK (provider IN ('sleeper','espn','yahoo')),  -- I7
  provider_league_id text        NOT NULL,  -- I3: league = (provider, provider_league_id)
  contract           text        NOT NULL,  -- e.g. 'omen-decision-brief.v3'
  envelope_version   smallint    NOT NULL DEFAULT 1 CHECK (envelope_version >= 1),
  decision_kind      text        NOT NULL CHECK (decision_kind IN ('mvp_move','start_sit','trade','waiver','all_clear')),
  season             integer     NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  week               smallint    NOT NULL CHECK (week BETWEEN 0 AND 22),  -- 0 = offseason; I4
  as_of              timestamptz NOT NULL,
  expires_at         timestamptz NOT NULL,
  snapshot_ref       text        NOT NULL,  -- nflverse content hash; I8
  model_id           text        NOT NULL,
  model_route        text        NOT NULL CHECK (model_route IN ('local','frontier')),
  model_version      text        NOT NULL,
  call_index_n       smallint    NULL,      -- backend-computed "1 of 3"; never client-derived
  call_index_of      smallint    NULL,
  lock_time          timestamptz NULL,      -- backend-computed; never client-derived
  verdict_summary    text        NOT NULL,
  verdict_detail     text        NOT NULL,  -- the "why", with premises cited
  confidence_pct     smallint    NOT NULL CHECK (confidence_pct BETWEEN 0 AND 100),  -- I10: the raw number, stored
  degraded           boolean     NOT NULL DEFAULT false,
  degraded_reason    text        NULL,
  limitations        text[]      NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_call_index_pair CHECK (
    (call_index_n IS NULL AND call_index_of IS NULL) OR
    (call_index_n IS NOT NULL AND call_index_of IS NOT NULL
     AND call_index_n >= 1 AND call_index_n <= call_index_of)
  ),
  CONSTRAINT chk_expires_after_asof CHECK (expires_at > as_of),          -- I10: no stale all-clear
  CONSTRAINT chk_degraded_reason  CHECK (NOT degraded OR degraded_reason IS NOT NULL)
);
CREATE INDEX idx_decisions_owner_league_week ON public.decisions (user_id, provider, provider_league_id, season, week);
CREATE INDEX idx_decisions_owner_created     ON public.decisions (user_id, created_at DESC);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decisions_select_own ON public.decisions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies: writes are service-role only (bypasses RLS).
-- Mutation is blocked for everyone by trg_decisions_immutable (below).

CREATE OR REPLACE FUNCTION public.prevent_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'table % is immutable (insert-only)', TG_TABLE_NAME;
END $$;

CREATE TRIGGER trg_decisions_immutable
  BEFORE UPDATE OR DELETE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();
```

**Contracts:** `omen-decision-brief.v3` (OmenCall, OmenEvidence), `start-sit-detail.v1`, `trade-compare.v2` (TradeVerdict), `waiver-analysis.v1` (LeagueWaiver), `quiet-week.v1` (CommandQuiet/Straight), `dashboard-summary.v1` (all-clear).
**Confidence band (derived, not stored).** CONFIDENT/LEAN/NO_CALL is derived from `confidence_pct` at read time (API/view), never stored — so history stays honest if thresholds ever change. PROPOSED thresholds, founder to confirm: CONFIDENT ≥ 75, LEAN ≥ 50, else NO_CALL. WO-07 implements the derivation.
**Note:** "no unsourced CONFIDENT" (I10) is cross-table (premises) and cannot be a CHECK — it is enforced at write time by the service job that inserts the decision and its premises atomically.

---

## 2. `premises` — every factual claim names its source

`(decision_id, claim, source, source_as_of)`. No new table replaces this; the current schema has no premise storage at all (the gap the J2/J3 intelligence pass flagged: "a decision with an unsourced premise cannot honestly carry CONFIDENT").

```sql
CREATE TABLE public.premises (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id  uuid        NOT NULL REFERENCES public.decisions(id) ON DELETE RESTRICT,
  user_id      uuid        NOT NULL,  -- denormalized owner for join-free RLS; always = decisions.user_id (service-enforced)
  position     smallint    NOT NULL CHECK (position >= 0),  -- presentation order
  claim        text        NOT NULL,
  source       text        NOT NULL,  -- e.g. 'injury-report','nflverse','openweather','provider'
  source_as_of timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_premises_order UNIQUE (decision_id, position)
);
CREATE INDEX idx_premises_decision ON public.premises (decision_id);

ALTER TABLE public.premises ENABLE ROW LEVEL SECURITY;
CREATE POLICY premises_select_own ON public.premises
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_premises_immutable
  BEFORE UPDATE OR DELETE ON public.premises
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();
```

**Contracts:** `omen-decision-brief.v3` (evidence rows), `trade-compare.v2` (four-part evidence chain: record, your need, their need, risk).

---

## 3. `decision_inputs` — what the model consumed

Replaces `moves.target_player` (now `input_kind='player'` with the canonical player id, I2) and records scoring/roster provenance the current schema never kept.

```sql
CREATE TABLE public.decision_inputs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid        NOT NULL REFERENCES public.decisions(id) ON DELETE RESTRICT,
  user_id     uuid        NOT NULL,
  input_kind  text        NOT NULL CHECK (input_kind IN
                ('player','scoring_config','roster_snapshot','nflverse_dataset','provider_read','other')),
  input_ref   text        NOT NULL,  -- canonical player id (I2), scoring config id, roster snapshot id, dataset id
  input_as_of timestamptz NULL,
  meta        jsonb       NOT NULL DEFAULT '{}',  -- kind extras, e.g. {"freshness":"live"} for roster_snapshot (I6)
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_decision_input UNIQUE (decision_id, input_kind, input_ref),
  CONSTRAINT chk_roster_asof CHECK (input_kind <> 'roster_snapshot' OR input_as_of IS NOT NULL)  -- I6
);
CREATE INDEX idx_decision_inputs_decision ON public.decision_inputs (decision_id);

ALTER TABLE public.decision_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_inputs_select_own ON public.decision_inputs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_decision_inputs_immutable
  BEFORE UPDATE OR DELETE ON public.decision_inputs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();
```

**Contracts:** `omen-decision-brief.v3` (capability expression / facts row), `trade-compare.v2` (input citation), `start-sit-detail.v1`.
**Note:** waiver bid "null, never 0" (I10): recommended bids live in `verdict_detail` today. If a structured bid is ever stored, the column must be NULL-able with no DEFAULT — never default 0.

---

## 4. `user_actions` — what the user did / said (MUTABLE)

Replaces `moves.followed, moves.user_stars, moves.user_note`. This is the one mutable table in the set: it is the user's own feedback, and users may change their minds. Absence of a row = unknown (never "did not follow").

- `followed=true` → `('followed')`; `followed=false` → `('declined')` ("Not this week", OmenCall E056)
- `user_stars` → `('starred', stars)`
- `user_note` → `('noted', note)`

```sql
CREATE TABLE public.user_actions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id       uuid        NOT NULL REFERENCES public.decisions(id) ON DELETE RESTRICT,
  user_id           uuid        NOT NULL,
  action_kind       text        NOT NULL CHECK (action_kind IN ('followed','declined','starred','noted')),
  stars             smallint    NULL CHECK (stars BETWEEN 1 AND 5),
  note              text        NULL,
  action_provenance text        NOT NULL DEFAULT 'self_reported'
                                CHECK (action_provenance IN ('self_reported','provider_verified')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()  -- the app/service bumps this on every change; this is the one mutable table
  CONSTRAINT chk_action_fields CHECK (
    (action_kind = 'starred'  AND stars IS NOT NULL AND note IS NULL) OR
    (action_kind = 'noted'    AND note  IS NOT NULL AND stars IS NULL) OR
    (action_kind IN ('followed','declined') AND stars IS NULL AND note IS NULL)
  )
);
-- One current state per decision for followed/declined; stars/notes may repeat.
CREATE UNIQUE INDEX uq_user_action_state ON public.user_actions (decision_id, action_kind)
  WHERE action_kind IN ('followed','declined');
CREATE INDEX idx_user_actions_decision ON public.user_actions (decision_id);
CREATE INDEX idx_user_actions_owner    ON public.user_actions (user_id, created_at DESC);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_actions_owner_all ON public.user_actions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- Mutable by design: no immutability trigger. Service role bypasses as usual.
```

**Contracts:** `move-detail.v1` (LedgerDetail §7.3 user-action section), `moves-history.v2`.

---

## 5. `decision_outcomes` — what happened (single-transition state machine)

Replaces `moves.outcome, moves.eff, moves.result, moves.scored_at, moves.scoring, moves.scoring_contract_version, moves.scoring_coverage_state, moves.reconciliation_state`. Raw `win`/`loss` is stored; the `worked`/`did_not_work`/`not_verified` render mapping stays in API code (LedgerDetail: "raw win/loss translates before render").

Lifecycle: the scoring job inserts the row as `pending` when the decision is written; exactly one transition to `win`/`loss` is legal, enforced by trigger. `scored_at` set without a result = `data_incomplete` (preserves the current `detailState` logic).

```sql
CREATE TABLE public.decision_outcomes (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id              uuid        NOT NULL UNIQUE REFERENCES public.decisions(id) ON DELETE RESTRICT,
  user_id                  uuid        NOT NULL,
  outcome                  text        NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','win','loss')),
  effectiveness_pct        numeric(5,2) NULL CHECK (effectiveness_pct BETWEEN 0 AND 100),  -- was moves.eff
  result_summary           text        NULL,   -- was moves.result
  scored_at                timestamptz NULL,
  resolved_at              timestamptz NULL,
  scoring                  text        NULL,   -- e.g. 'half-ppr'; I5: confirmed, never assumed
  scoring_contract_version text        NULL,
  scoring_coverage_state   text        NULL CHECK (scoring_coverage_state IN ('supported','unsupported','not_recorded')),
  reconciliation_state     text        NULL CHECK (reconciliation_state IN ('exact','estimate','not_recorded')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_outcome_resolved CHECK (
    outcome = 'pending' OR (resolved_at IS NOT NULL AND reconciliation_state IS NOT NULL)
  )
);
CREATE INDEX idx_decision_outcomes_owner ON public.decision_outcomes (user_id, created_at DESC);

ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_outcomes_select_own ON public.decision_outcomes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No user INSERT/UPDATE/DELETE policies: the scoring job (service role) writes.

CREATE OR REPLACE FUNCTION public.enforce_outcome_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.decision_id IS DISTINCT FROM NEW.decision_id
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'decision_outcomes: identity columns are immutable';
  END IF;
  IF OLD.outcome <> 'pending' THEN
    RAISE EXCEPTION 'decision_outcomes: outcome already resolved (%)', OLD.outcome;
  END IF;
  IF NEW.outcome NOT IN ('win','loss') THEN
    RAISE EXCEPTION 'decision_outcomes: illegal transition pending -> %', NEW.outcome;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_decision_outcome_transition
  BEFORE UPDATE ON public.decision_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_outcome_transition();
CREATE TRIGGER trg_decision_outcomes_no_delete
  BEFORE DELETE ON public.decision_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();
```

**Resolution rigidity (design intent).** The trigger permits exactly one UPDATE per row: `pending` → `win`/`loss`. All scoring fields (`effectiveness_pct`, `scored_at`, `reconciliation_state`, …) must be final at that moment — a `scored_at`-without-result (`data_incomplete`) state can only be established at INSERT time. Post-resolution revision is impossible by design; if the product ever needs corrections, that is a new work item (correction ledger), not a trigger loosening.

**Contracts:** `moves-history.v2` (outcome mapping), `move-detail.v1` (§7 scoring reconciliation).

---

## 6. `ledger_entries` — the immutable published receipt

The Ledger (J6) is "the record of what Omen recommended and what the user did" — and "every call lands in the Ledger whether you take it or not" (OmenCall E059). A ledger entry is the *published* receipt for a decision: what the user saw, the evidence as it stood then, and the named blind spots. The index (Ledger screen) reads from this table, so every index entry carries receipt linkage (`id` + `as_of` + `snapshot_ref`) by construction — not just the detail view (per the J5/J6 intelligence pass proposal).

`as_of` and `snapshot_ref` are denormalized from `decisions` deliberately: the receipt must render from the index row alone, and it stays self-contained even if `decisions` ever gains mutable columns. The service job writes both copies atomically.

```sql
CREATE TABLE public.ledger_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),  -- the receipt id
  decision_id   uuid        NOT NULL UNIQUE REFERENCES public.decisions(id) ON DELETE RESTRICT,
  user_id       uuid        NOT NULL,
  as_of         timestamptz NOT NULL,  -- denormalized receipt field; = decisions.as_of
  snapshot_ref  text        NOT NULL,  -- denormalized receipt field; = decisions.snapshot_ref
  contract      text        NOT NULL,  -- rendering contract, e.g. 'moves-history.v2'
  blind_spots   text[]      NOT NULL DEFAULT '{}',  -- named blind spots, e.g. 'unmodelled game script'
  presented_at  timestamptz NOT NULL DEFAULT now(), -- when it landed in the Ledger
  superseded_by uuid        NULL REFERENCES public.ledger_entries(id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_supersede CHECK (superseded_by IS DISTINCT FROM id)
);
CREATE INDEX idx_ledger_owner_presented ON public.ledger_entries (user_id, presented_at DESC);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_entries_select_own ON public.ledger_entries
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();
```

**Contracts:** `moves-history.v2` (Ledger index — requires explicit league scope, satisfied via join to `decisions`), `move-detail.v1` (LedgerDetail — "immutable snapshot").

---

## 7. `trade_shares` — the 30-day public share link

`trade-share.v1` governing rule: "30-day hash, no auth, no provider data, names off by default" (I11). This is the one table with a public (anon) read policy — the share link must work for recipients with no Omen account. The security property is hash unguessability (256-bit URL-safe); the privacy property is payload construction (no provider data, no auth — enforced in app code, documented here).

```sql
CREATE TABLE public.trade_shares (
  share_hash     text        PRIMARY KEY,  -- 256-bit URL-safe hash; unguessable by construction
  decision_id    uuid        NOT NULL REFERENCES public.decisions(id) ON DELETE RESTRICT,  -- the shared verdict
  user_id        uuid        NOT NULL,
  payload        jsonb       NOT NULL,  -- share rendering; MUST contain no provider data and no auth (I11)
  names_included boolean     NOT NULL DEFAULT false,  -- names off by default
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT chk_share_expiry CHECK (expires_at > created_at)
);
CREATE INDEX idx_trade_shares_decision ON public.trade_shares (decision_id);

ALTER TABLE public.trade_shares ENABLE ROW LEVEL SECURITY;
-- Public share link: no auth per trade-share.v1. Readable by hash while unexpired.
CREATE POLICY trade_shares_public_read ON public.trade_shares
  FOR SELECT TO anon USING (expires_at > now());
CREATE POLICY trade_shares_owner_read ON public.trade_shares
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies: service-role only; immutable via trigger.

CREATE TRIGGER trg_trade_shares_immutable
  BEFORE UPDATE OR DELETE ON public.trade_shares
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

-- I11 backstop (PROPOSED — WO-13/14 finalizes with a pgTAP test):
-- "no provider data, no auth in the payload" is enforced in the database,
-- not only in app code, because this table is anon-readable.
CREATE OR REPLACE FUNCTION public.validate_share_payload() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload ?| array['espn_s2','swid','token','secret','email','provider_user_id'] THEN
    RAISE EXCEPTION 'trade_shares: payload contains forbidden keys';
  END IF;
  IF NEW.names_included = false AND NEW.payload ?| array['full_name','first_name','last_name','team_name'] THEN
    RAISE EXCEPTION 'trade_shares: payload contains names while names_included=false';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_trade_shares_validate_payload
  BEFORE INSERT ON public.trade_shares
  FOR EACH ROW EXECUTE FUNCTION public.validate_share_payload();
```

**Contracts:** `trade-share.v1` (TradeShare). Data-as-of dating is a render rule on the payload (every share shows its age), not a column.

---

## Deliberate non-tables

- **Waiver claims.** `waiver-analysis.v1` produces recommendations, not claim objects; claims happen in the provider app and Omen cannot verify them. Waiver recommendations are `decisions` (`decision_kind='waiver'`); user follow reports are `user_actions`; results are `decision_outcomes`. No `waiver_claims` table.
- **Proposed (unshared, undecided) trades.** Ephemeral client state. A verdict creates a `decisions` row; sharing creates a `trade_shares` row. Nothing in between needs persistence.
- **A `leagues` table.** League identity is `(provider, provider_league_id)` text columns for now (I3). A proper leagues/connections table belongs to the WO-06 identity+connections design; these columns migrate cleanly when it lands.

---

## `moves` column disposition (all ~25 columns accounted for)

| Old `moves` column | New home |
|---|---|
| `id` | `decisions.id` (new ids; WO-07 maps old→new) |
| `user_id` | `user_id` on every table |
| `week_num` | `decisions.week` (renamed, I9) |
| `season` | `decisions.season` |
| `move_type` | `decisions.decision_kind` |
| `headline` | `decisions.verdict_summary` |
| `reasoning` | `decisions.verdict_detail` |
| `confidence` (numeric %) | `decisions.confidence_pct` (kept numeric per founder lock 2026-09-29 — no mapping needed; band derived at read time, thresholds proposed in §1) |
| `target_player` | `decision_inputs` (`input_kind='player'`, canonical id, I2) |
| `followed` | `user_actions` (`followed`/`declined`; NULL → no row) |
| `user_stars` | `user_actions` (`starred`) |
| `user_note` | `user_actions` (`noted`) |
| `outcome` | `decision_outcomes.outcome` |
| `eff` | `decision_outcomes.effectiveness_pct` |
| `result` | `decision_outcomes.result_summary` |
| `created_at` | `decisions.created_at` |
| `scored_at` | `decision_outcomes.scored_at` |
| `platform` | `decisions.provider` (renamed, I9) |
| `league_id` | `decisions.provider_league_id` (renamed, I9) |
| `scoring` | `decision_outcomes.scoring` |
| `scoring_contract_version` | `decision_outcomes.scoring_contract_version` |
| `scoring_coverage_state` | `decision_outcomes.scoring_coverage_state` |
| `reconciliation_state` | `decision_outcomes.reconciliation_state` |

---

## 8. Migration files (one per table, in dependency order)

1. `sql/2026-09-29_gate1_01_decisions.sql` — table + indexes + RLS + `prevent_mutation()` + immutable trigger
2. `sql/2026-09-29_gate1_02_premises.sql`
3. `sql/2026-09-29_gate1_03_decision_inputs.sql`
4. `sql/2026-09-29_gate1_04_user_actions.sql`
5. `sql/2026-09-29_gate1_05_decision_outcomes.sql` — includes `enforce_outcome_transition()`
6. `sql/2026-09-29_gate1_06_ledger_entries.sql`
7. `sql/2026-09-29_gate1_07_trade_shares.sql`

(WO-02's migration framework may relocate/rename these; the ordering and one-table-per-file rule stands regardless. Data migration from `moves` is WO-07.)

---

## Open questions

1. **Canonical identity FK (WO-06).** `user_id` is `uuid NOT NULL` with no FK until the canonical identity table lands; the FK (and the `auth.uid()` basis of the RLS policies) is added then.
2. **League table.** `(provider, provider_league_id)` text columns are the interim; a `leagues`/`platform_connections` redesign in WO-06 may replace them.
3. **Premise `source` vocabulary.** Open text proposed; enumerate it if analytics ever need to group by source.
4. **Numeric→band confidence — RESOLVED 2026-09-29 (founder lock).** `confidence_pct` (0–100) is stored; no historical mapping needed since old `moves.confidence` is already a percentage. Band derived at read time; thresholds PROPOSED (CONFIDENT ≥ 75, LEAN ≥ 50) — founder to confirm; WO-07 implements.
5. **Outcome transition mechanism — RESOLVED 2026-09-29 (architecture review).** Single-transition trigger kept; resolution rigidity documented as design intent in §5 (post-resolution revision impossible; corrections would be a new work item).
6. **Ledger denormalization.** `as_of`/`snapshot_ref` copied into `ledger_entries`; consistency enforced at write time by the service job. Alternative is a pure join — rejected because the receipt must render from the index row alone.
7. **Share payload validation — RESOLVED as PROPOSED 2026-09-29 (architecture review).** `validate_share_payload()` trigger sketched in §7 (denylist on forbidden keys + names rule); WO-13/14 finalizes it with a pgTAP test.
8. **`superseded_by` semantics.** The J5/J6 pass noted `superseded` isn't derivable from a single row; the linkage column exists, but the product rule for when an entry is superseded needs a contract line (WO-13).
