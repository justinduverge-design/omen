# Omen / MVP Move Frontend Implementation Prompt

Use this prompt for the next frontend development pass.

```text
You are Claude, the frontend engineer for the Slops Saloon `ssffmvp` repo.

Implement the Omen of the Week / MVP Move frontend screen.

Scope:
- Frontend only.
- Do not touch src/, routes, services, adapters, or any backend files.
- Do not change deployment, secrets, SQL, payments, tests, or infrastructure.
- Do not invent backend behavior. Wire only to the contract defined in the handoff/spec.

Read first — do not skip any:
- DBS_INDEX.md
- Blueprints/handoffs/backend-to-frontend.md
- Corvus/Blueprints/specs/omen-mvp-move.md
- frontend/src/pages/TradeAnalyzer.jsx  (visual pattern reference)
- frontend/src/pages/StartSit.jsx       (visual pattern reference)
- frontend/src/pages/Football.jsx       (tab structure reference)
- frontend/src/lib/api.js               (fetch helper reference)

---

Goal:
Create frontend/src/pages/Omen.jsx and add an "Omen of the Week" tab to
frontend/src/pages/Football.jsx.

---

Files to create:
- frontend/src/pages/Omen.jsx

Files to modify:
- frontend/src/pages/Football.jsx

---

Form inputs required:
The screen needs a team configuration form with these fields:
- platform: select — yahoo | sleeper | espn
- league_id: text input — label "League ID"
- team_id: text input — label "Team ID", marked optional
- week: number input — min 1, max 18
- scoring_format: select — ppr | half_ppr | standard

Submit button label: "Get my MVP Move"
Loading state label: "Reading your roster…"

---

Request shape:
POST /api/omen/mvp-move

Send only fields that have values. Do not send empty strings.
Always include: platform, season (current year), week, scoring_format.
Include league_id and team_id only when the user has entered a value.
Include use_mock_data and mock_state only when mock mode is active.

---

State machine:
Branch on data.state before rendering any recommendation content.

success
- Show the recommendation card.
- Required fields: title, move, confidence (score + label + rationale),
  risk (level + reasons), explanation (summary, why_it_matters, risk, confidence,
  data_used), primary_player, comparison_player, expected_value_delta.
- Show the signals panel below the recommendation.
- Label each signal with its status badge: live | stub | mock | unavailable.

empty
- Show a "Stand pat" card.
- Show explanation.summary, explanation.why_it_matters, explanation.risk,
  explanation.confidence from the response.
- Do not show a recommendation.

platform_disconnected
- Show a recovery panel.
- Show platform.name and platform.recovery.message.
- Show a CTA button using platform.recovery.cta, linking to /account.

espn_reauth_required
- Show a recovery panel, ESPN-labeled.
- Show platform.recovery.message.
- Show platform.recovery.fields_needed if present.
- Show a CTA button using platform.recovery.cta, linking to /account.

espn_league_context_missing
espn_import_blocked
espn_recovery_needed
- Same recovery panel structure as espn_reauth_required.
- Use the message and cta from the response. Do not hard-code ESPN error copy.

error
- Show an error card with error.message.
- If error.retryable is not false, show a "Try again" button that re-fires the request.

---

Signals panel:
Show a signal row for each key in data.signals.
Each row: signal name (replace underscores with spaces, capitalize) + status badge.
Show signal.message as secondary text if present.
Badge color guide:
- live: emerald
- stub: amber
- mock: sky/blue
- unavailable: slate muted

---

Confidence display:
Show score as a large number with /100 label.
Show label (replace underscores with space).
Show a progress bar filled to score%.
Show rationale as small secondary text.
Confidence label to color guide:
- low: red
- medium: amber
- medium_high: amber lighter
- high: emerald

---

Risk display:
Show as a pill badge using risk.level.
Show risk.reasons as a small bulleted list.
Risk level to color guide:
- low: emerald
- medium: amber
- high: red

---

Mock / preview toggle:
Add a collapsed <details> element below the form.
Summary label: "Preview / mock mode"
Inside: a checkbox for "Use mock data" and, when checked, a select for mock_state.
Supported mock_state values:
- success
- empty
- platform_disconnected
- espn_reauth_required
- espn_league_context_missing
- espn_import_blocked
- espn_recovery_needed
- error
Add a note: "Mock mode is for local preview only. Production results are always live."
Keep this section visually subdued — it is a dev tool, not a feature.

---

Visual conventions:
Match the existing page style exactly. Reference TradeAnalyzer.jsx and StartSit.jsx.
- Page background: bg-slate-950
- Card borders: border-slate-800
- Card backgrounds: bg-slate-900 or bg-slate-950
- Primary accent: amber-400 (buttons, active states, section labels)
- Muted labels: text-slate-400 or text-slate-500
- Section label pattern: text-xs font-semibold uppercase tracking-widest text-amber-400
- Primary button: bg-amber-400 text-amber-950 hover:bg-amber-300
- Secondary / outline button: border-slate-700 text-white hover:border-amber-400 hover:text-amber-300
- Input style: border border-slate-700 bg-slate-950 text-white focus:border-amber-400
- Error banner: border-red-400/30 bg-red-400/10 text-red-200
- Success tint: border-emerald-400/30 bg-emerald-400/10
- Amber tint: border-amber-400/20 bg-amber-400/5
- Loading spinner: h-4 w-4 animate-spin rounded-full border-2 border-amber-950/30 border-t-amber-950

---

Football.jsx tab update:
Add one tab entry to the TABS array:
  { id: 'omen', label: 'Omen of the Week', disabled: false }

Import Omen from './Omen'.
Add: {activeTab === 'omen' ? <Omen /> : null} inside the section.

---

What NOT to build:
- Do not add a Matchup DvP UI block. The signal will appear in the signals panel
  as stub — that is sufficient. Do not invent a DvP display section.
- Do not add live projections UI. Projections appear in the signals panel as stub.
- Do not wire to any endpoint other than POST /api/omen/mvp-move.
- Do not add authentication guards. Auth is handled at the API layer.
- Do not add a league/team selector that fetches from the platform API.
  Simple text inputs are correct for this pass.

---

Acceptance criteria:
- "Omen of the Week" tab appears in Football.jsx and renders Omen.jsx when active.
- Form submits POST /api/omen/mvp-move via apiFetch with the correct body shape.
- All eight states render without crashing and show the correct content per state.
- Signals panel appears on success with a badge per signal.
- Confidence meter shows score, label, progress bar, and rationale.
- Risk pill and reasons list appear on success.
- Plain-English explanation fields (summary, why_it_matters, risk, confidence,
  data_used chips) appear on success.
- Recovery panels for platform_disconnected and all espn_* states link to /account.
- Error state shows message and a working "Try again" button when retryable.
- Mock toggle is present, collapsed by default, and wires use_mock_data and
  mock_state into the request.
- Visual style matches TradeAnalyzer.jsx and StartSit.jsx — no new design patterns.

---

Completion report:
When finished, report:
- Files created
- Files modified
- States implemented
- Whether mock toggle is functional
- Any contract fields missing from the backend response that the UI had to guard against
```
