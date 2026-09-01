# Omen app pages workshop v1

**Date:** 2026-08-31
**State:** founder workshop in progress; not implementation authority
**Companion:** `omen-trade-page-workshop-v1.md` (the Trade page's own record — this file does not restate it)

The page-by-page product loop, continued across the rest of the app. Same rules as the Trade
record: founder-locked outcomes only, with unresolved data and design questions left visibly
unresolved rather than smoothed over.

## Why this pass exists

Beta feedback, 2026-08-31. Two data points, and they point in opposite directions:

- **Sleeper connect worked.** Rudy connected without a single question.
- **ESPN on iPhone failed.** Abby, on iOS, had a hard time. This is not a copy defect. The native
  ESPN path routes to `/espn-connect`, whose honest instruction is: find a desktop computer,
  install Chrome or Edge, sideload an unpacked extension from `extension/README.md`, then return.
  There was no phone path. She was not confused by a flow — there was no flow.

## The organizing idea — the Small Council

Command Center is a **council table**, not a dashboard. Omen's advisors each give a short read on
the thing they watch; the user picks which one to go deeper on, and the rest of the app is the
depth. The advisors are **Omen speaking in different capacities** — not separate features, not
separate personalities. This is the frame the rest of this document hangs on.

## Locked decisions

### Shell

- Four destinations stay: **Command / Omen / Trade / League**. They are not wrong, they are
  underbuilt.
- No screen shows the same data twice. The matchup hero and the standings currently render on
  both Command Center and League; exactly one owner each, the other links.
- **Demo mode is cut.** "Try Demo" leaves the Welcome screen and every `.demo` state branch
  (League, Trade, Decision Brief, League Switcher) goes with it. Demo data was a permanent
  "is this real?" surface and a second set of states to keep honest.
- A signed-in user with no league lands on **Command Center**, not a forced Connect wall. The
  council has exactly one thing to say to her, and it is to connect a league.

### Command Center — the Small Council

- Seats are **labelled by subject** — "Your week", "Waiver watch", "The Ledger". One Omen voice
  across all of them. No named in-world titles: every named seat is a voice to maintain for the
  life of the product, and GoT-adjacent naming carries a trademark question nobody needs.
- Council seats for build: **the week / your matchup**, **waiver watch**, **the Ledger**.
- **Omen's call gets no separate seat.** The advisors *are* Omen. The Omen destination is where it
  argues one case in full; the council is where it orients you.
- **Only advisors with something to say appear.** A quiet week produces a shorter page, not a
  stack of empty cards. This replaces today's behavior, where a disconnected user reads five
  near-identical "connect a league" surfaces down one scroll.
- The quiet state is **voiced, and playful** — an in-season dead week and the offseason each get
  their own line, with character, not a flat "no move clears the threshold."
- **The voice fence:** playful is allowed only in genuinely neutral quiet — offseason, bye week,
  calm week. When the user has just lost, a starter is hurt, or something is broken, Omen goes
  straight. A joke on a bad day reads as an app that is not paying attention.

### Omen destination

- Omen returns **one call** for the week, and that call may be a **start/sit, a pickup, a drop, or
  a trade**. The earlier reading — that Start/Sit and Waiver were sub-pages living "inside" Omen —
  was a misunderstanding carried over from backend work. Omen is one feature whose recommendation
  is move-type-agnostic.
- **Confidence is expressed in bands, not percentages.** A number implies a model calibration the
  product would have to defend, which is the same failure the Trade record already ruled out for
  point deltas and value gaps. The band always travels with what drove it.
- When Omen's call is a trade, it **names the athlete and the fantasy team name**, and opens the
  Trade builder prefilled.
- **No rosters, no trade call.** If a provider will not give Omen the other teams' rosters, Omen
  falls back to a lineup or waiver call for that provider. It never names a team it has not read —
  the same rule as Trade's prohibition on fabricating roster ownership.

### League destination

- League is **the state of your league**, in this order: **Matchup → Standings → Waiver → Activity**.
- **The Waiver section lives here**, not as a fifth tab and not inside Omen. Command Center's
  waiver advisor creates the urgency; League is where the work happens.
- Waiver is **ranked pickups with reasons**, tied to the user's actual roster holes — an opinion,
  not a browsable directory. Providers already ship the directory.
- **Every pickup names its drop.** A claim with no corresponding cut is not an actionable move on
  a full roster.
- Sections keep rendering independently, as today. A dead matchup read must never blank the page.

### The Ledger

- **The Ledger gets a real screen**, pushed from its council seat. Today "See all" switches to the
  Omen tab, which has no ledger surface at all.
- It is the trust surface: every call Omen made, whether the user followed it, whether it worked.
  It is the reason anyone believes the next call.
- Follow-through is **read from the provider where possible, with a self-report fallback**. Omen
  said start McCaffrey; the lineup at lock says whether he started. Where a provider will not give
  lineups, the user is asked — and that row is **marked as self-reported**, never blended silently
  with verified rows.

### Connect

- **ESPN gets an in-app login sheet.** The user signs in to ESPN normally inside a native web
  sheet; Omen takes the session it needs from that sheet and never displays or stores it in the
  clear. One flow, on the phone, no computer, no extension. This is the direct answer to the only
  hard beta failure on record.
- Provider order is **by market share, no editorializing** — the order the fantasy world expects.
- Existing honest-state behavior is preserved: no provider may advertise a path it cannot honor.

### Account, Help, Support

- **In-app problem reporting replaces the mail-app handoff.** A short form that posts to Omen with
  device and version attached automatically — and still never league data, rosters, credentials,
  tokens, cookies, or raw provider errors. Most reports die at the mail-app switch, and a beta
  that loses its reports is not running a beta.
- **Team theming is postponed.** The 32-team palette exists on web and has no native screen. The
  founder's position is that the prior build was not right and the infrastructure to do it the
  intended way may not exist yet. Native ships in Omen's own colors. Postponed, not cancelled —
  and not to be quietly reintroduced as a partial version.

### Surface split

Backend is shared. Frontend work splits into **two separate implementation sessions**: one web,
one mobile — and the mobile session covers **both iOS and Android**. Nothing in this record is
web-only or native-only unless it says so.

## Risk gates — stated, not assumed away

- **The ESPN in-app sheet is a decision with a gate on it.** Reading a provider session out of a
  web sheet is what comparable tools do and is technically achievable, but it needs an ESPN terms
  read and a prepared App Review answer **before** implementation starts. Do not open this as a
  routine build item.
- **Confidence bands are a breaking change to shipped surfaces.** `OmenDecisionBriefPayload.confidence`
  is an `Int`, `OmenConfidenceBar` renders it, and `page-system.md` specifies confidence gradient
  endpoints for `/omen`. Band-vs-number has to be resolved in the payload contract, not patched at
  the view layer, or the two surfaces will disagree on screen.
- **Cutting demo mode touches auth, four view models, and the Welcome screen.** It is a deletion,
  which makes it safe in kind — but `demoModeEnabled` is read from `AppEnvironment`, so the
  environment flag and the screenshot scenarios come out with it.
- **Provider-read follow-through and cross-roster reads are unproven per provider.** The Ledger's
  "read it from the provider" rule and Omen's trade-call rule both depend on capability that has
  not been evidenced provider by provider. Both already fail closed by design; neither may ship as
  a claim before that proof exists.

## Still open

- Which advisor leads when several have something to say — urgency ordering is undefined.
- The exact band vocabulary for confidence, and whether Trade's `lean_*` / scored-verdict split
  maps onto it one-to-one.
- Waiver ranking inputs, and how a drop candidate is chosen defensibly rather than by lowest
  projection.
- The quiet-week and offseason copy itself. The voice is locked; the lines are not written.
- Whether the Ledger's self-reported rows count toward any accuracy figure Omen shows about itself.
- Per-provider capability proof for lineup reads, cross-team rosters, and waiver pools.
- Android parity behavior for every decision above.

---

# Part 2 — Feedback, the Founder Digest, and knowing what is happening

Added 2026-08-31, same session. The in-app reporting decision in Part 1 opened a larger gap, and
the founder chose to open it rather than paper over it.

## What actually exists today (verified, not assumed)

- **Errors:** GlitchTip via the Sentry SDK. Working — it was silently dead until 2026-08-21.
- **Health:** one endpoint, `GET /api/system/health`. **Nothing watches it.** If Redis or Supabase
  failed overnight, no system would say so; the founder would learn it from a user.
- **Product analytics: none.** No PostHog, no Amplitude, no event pipeline. The only repo hits for
  "analytics" are `demoMode.js` and privacy copy. There is no answer to "how many people opened the
  app yesterday", "which screen do people quit on", or "has anyone ever finished connecting a
  league."
- **Local LLM:** `src/services/llm.js` wraps Ollama and already backs Omen prose
  (`source: "ollama_gemma"`). It is fail-closed twice over: `AI_PROVIDER=cloud` returns
  `cloud_disabled_zero_budget`, and any public hostname returns `misconfigured_public`. Both blank
  the base URL.

## Locked decisions

### The in-app report

- Replaces the mail-app handoff entirely.
- Entry point is a **small floating pill on every screen, in beta builds only.** It sits clear of
  the tab bar and does not ship in the App Store build. It is a beta instrument, not furniture.
- The report carries: **screen, app version, device and OS**; **a screenshot the user reviews first**
  and may redact or drop; **connection state as provider plus status only** (`Sleeper, connected`)
  — never league names, rosters, tokens, or cookies; and **recent scrubbed error codes**.
- The screenshot is never sent without the user having seen it.

### The Founder Digest

One plain-English email. Written for a non-technical reader by explicit instruction — no stack
traces, no jargon, no dashboards to interpret. Four sections, all four wanted:

1. **What users said** — reports grouped into themes, with every raw report underneath so
   summarization can never lose or distort what someone actually wrote.
2. **What's broken or shaky** — "Sleeper connections failed 4 times today." "The database was slow
   this morning." "Everything is fine." Plain sentences.
3. **What needs money or attention soon** — quota and expiry pressure before it becomes an
   emergency: Supabase tier usage, Redis plan runway, Yahoo token expiry.
4. **How many people used it** — opened the app, connected a league, got a recommendation, built a
   trade.

- **The digest is summarized by the local Ollama box.** Rough output is accepted. Clustering a
  couple dozen reports a week is a small job for a 4B model, it costs nothing, and no user-written
  text leaves the founder's own infrastructure. The `$0` cloud cap and the public-host guard both
  stay exactly as they are. Revisit only if volume makes local summarization inadequate — and that
  revisit is a budget decision *and* an egress decision about other people's words, not a config
  flip.

### Analytics

- **Built in-house. Nothing leaves our infrastructure.** Events count into Supabase and the digest
  reads them. The founder accepts having no clickable dashboard in exchange for third parties
  holding none of the users' behavior.
- This is a deliberate trade: PostHog would have given real funnels free at this size. The founder
  chose privacy over convenience. Do not quietly reintroduce a third-party analytics SDK later
  because a dashboard would be handy.

### Alerts — what may interrupt the founder

Two things only:

1. **The app is down.** API unreachable, or the database is.
2. **User data is at risk.**

**Honesty bound on the second one.** General breach detection is not achievable and must not be
claimed or built as though it were. What ships instead is a named list of genuinely detectable
signals:

- Row-level-security denials spiking — something probing where it should not be
- Failed-authentication floods, or a single account reading an anomalous row volume
- The service-role database key used from an unexpected origin
- **Backup failure** — the real, fully detectable "we could lose data" alarm
- Credentials appearing in logs. The shared scrubber has been found holed in three consecutive
  sessions, every time by provoking a real failure and searching the emitted bytes, never by
  review. Treat "we have a scrubber" as a claim needing evidence.

Everything else waits for the digest. An alert the founder can ignore is an alert the founder
will ignore.

## Still open — Part 2

- Which events the in-house analytics actually records, and the retention period for each.
- What the digest says on a day with zero reports and zero incidents — silence, or one line.
- Where the report lands: a Supabase table, its RLS policy, and who besides the founder may read it.
- Whether beta users are told their reports are summarized by a model before sending.
- The alert delivery channel. Email is not a paging mechanism, and "the app is down" needs to reach
  the founder when he is not reading email.

---

# Part 3 — The rest of the app, and how it gets built

## Locked decisions

### Notifications

- Ship, and only for **deadlines that can cost the user something**: waiver claim deadline, lineup
  lock with a bad starter, an active player ruled out. Roughly two or three a week.
- Everything else is silent. The notification that annoys someone is the one that gets the whole
  category turned off.
- Requires a notification settings section in Account (below).

### Welcome / first run

- **The separate Welcome screen is cut.** With Demo gone it held one button, and a screen that
  holds one button is a tax.
- The app opens on **sign-in**, and the **animated SVG lockup lives there**. The logo is vector for
  exactly this reason. It must hold still under `prefers-reduced-motion` / Reduce Motion, and it
  must never delay the sign-in controls becoming usable.

### Post-connect

- After a successful connection the user gets a **short tour of the four destinations**, then lands
  on Command Center.
- Founder call, against the recommendation to let the first real briefing be the tutorial. Recorded
  as chosen, with the known risk stated: **most people skip tours.** Mitigations that are therefore
  not optional — at most four cards, skippable from card one, shown exactly once, never re-shown on
  reinstall of context, and every card must describe something the user can see on their own team
  rather than a generic feature pitch.

### Global context

- The **context strip is on every screen** — a thin persistent bar naming the team and league the
  user is operating as, tappable anywhere to switch. This carries the Trade workshop's rule that
  changing team or league changes Omen's context app-wide until changed again.

### Account

Account gains, beyond today's email / passkeys / support / sign out / delete:

- **Manage connected leagues** — see, reconnect, disconnect. There is currently *nowhere* to repair
  a stale connection, and stale connections are the most common failure mode in the ledger.
- **Notification settings** — required by the notification decision above.
- **Data export and delete** — the backend already exposes both behind the `DELETE MY OMEN DATA`
  confirmation phrase; native has delete and no export.

### Omen brief depth

- Above the fold: **the call, the reason in one sentence, the confidence band, and the risk.**
  Metrics, signals, and alternatives expand on tap. Five seconds to read, thirty seconds to defend.

### Trade

- **Trade is rebuilt in this pass**, to the Trade workshop contract — roster-based building,
  two- and three-team shapes, share output, counters. Today's native screen is two text fields and
  a Compare button; shipping the rest of the app around that stub would waste the workshop.

### Accessibility

- **All three open issues are fixed in this pass:** color contrast (#340), Dynamic Type / system
  font scaling (#338), and the Android light-mode status bar (#341).
- Font scaling is the load-bearing one. Text that ignores the system size locks out anyone who
  enlarges it, and older managers are a real share of fantasy football.

### Platforms

- **iOS and Android move together, screen by screen.** Neither platform is allowed to drift and
  accumulate catch-up debt.

### Design path

- **Amend `omen-native-delivery-governance-v1.md`:** an approved Claude Design canvas is a valid
  screen artifact of record for native feature code. Figma remains authoritative for **vector
  assets** — logo, lockup, icon set, team marks — which is what it is genuinely best at and what AI
  tooling authors poorly.
- The point of the amendment is to stop paying a translation tax on every layout revision and to
  stop the founder being the bottleneck twice per screen.

## Still open — Part 3

- The tour's four cards: exact content, and how "shown once" is persisted across reinstalls.
- Notification copy and quiet hours.
- Whether the context strip collapses or hides on scroll, and what it says when nothing is connected.
- Which Account items are reachable from the context strip versus only from the Account screen.

---

# Part 4 — Reference pulls (binding on the contracts)

Founder-assigned reference gathering, 2026-08-31. Each pull below is tied to a specific screen
contract; a contract that names one of these must state what it took from the reference and what it
deliberately did not. **References inform; they do not override** the component lock, the design
house, or any honest-state rule in this repo.

| # | Pull | Feeds | What we are looking for |
|---|---|---|---|
| 1 | **Plaid Link; Copilot Money bank connect** | ESPN in-app connect sheet | The highest-stakes pattern in the app: signing into a third party inside our sheet without it reading as credential theft. Consent framing, what the sheet says before it opens, how it reports success and failure. |
| 2 | **Sleeper; ESPN Fantasy — waiver claim + lineup** | Waiver section (League); Omen brief | The gestures our users already own. What to match so nothing feels foreign, and what to beat. |
| 3 | **Copilot Money; Monarch — home** | Command Center / Small Council | Prioritized daily-briefing cards where the app decides what matters today, and how a quiet day is handled without the page looking broken. |
| 4 | **Robinhood; Public — rating + confidence + expandable why** | Omen decision brief | Showing a call with a confidence band and evidence on tap. Directly informs the "call, reason, risk, rest on tap" decision. |
| 5 | **Coinbase (or comparable) swap screen** | Trade rebuild | Two-sided "you give / you get" commit patterns. Trade UIs barely exist to study; swaps are the nearest relative. |
| 6 | **Strava; Duolingo — history / record** | The Ledger screen | "Here is what you did and whether it worked," made worth returning to. |
| 7 | **Linear; Height — floating action pill** | Beta feedback pill | Placement above a tab bar without colliding with content or the context strip. |

**Contract rule:** every screen contract in the build waves must cite its reference row (or state
that none applies) and record the deviation. A reference that conflicts with `component-lock-v1`,
the native design house, or an honest-state rule loses.

# Part 5 — Build order and work split

Founder deferred the sequencing question and raised the parallel-agent question instead. Both are
answered here.

## Wave order

1. **ESPN in-app connect sheet · feedback pill · digest skeleton.** Repairs the only confirmed beta
   failure and creates the instrument that makes the next beta round informative.
2. **Accessibility (#340, #338, #341) · honest-state consolidation · demo-mode deletion.**
   Mechanical, no design dependency, safely parallel.
3. **Command Center as the Small Council · the Ledger screen · the context strip.**
4. **League, with the Waiver section inside it.**
5. **Trade rebuild** to the Trade workshop contract.

Analytics events land **with each wave**, never as a separate project.

## Agent split

- **Codex owns backend:** analytics events into Supabase, the digest job, the alert signals, waiver
  ranking, Ledger follow-through reads, the ESPN session endpoint.
- **Claude owns native UI**, iOS and Android, screen by screen.
- **Backend contracts are written before either starts.** The two must not be editing the same
  Swift files in the same week.
- **`main` is the proof.** `Direction/agent_inbox.md` records handoffs repeatedly claiming work as
  unmerged that was already on `main`; a handoff is a pointer, never evidence.
