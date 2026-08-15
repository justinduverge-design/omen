# Handoff — 2026-08-15 — session close

**State of `main`:** clean and green. Backend **537/537**, iOS **174/0**, both post-merge CI runs successful.

## Merged today

| PR | What |
|---|---|
| [#309](https://github.com/justinduverge-design/omen/pull/309) `02857e7` | nflverse retired-path repair + M5 API layer slices A+B+C (iOS + Android) |
| [#311](https://github.com/justinduverge-design/omen/pull/311) `e3038d2` | ESPN mobile feasibility memo, M7 descoped, connect page fixed for phones |
| [#310](https://github.com/justinduverge-design/omen/pull/310) `e18b896` | M5-NativeConnect — native connect flow, both platforms |

**Net effect:** a signed-in user on iPhone or Android can now connect a Sleeper league and see their real league name, gates, and matchup state. None of that existed this morning. And Tuesday scoring no longer defers silently forever on a dead URL.

## Open decisions — none blocking

1. **`A6-MovesScoringFormat`** — every move is graded as PPR regardless of league scoring, because `moves.scoring` is not persisted. Needs founder approval for a schema column. Recommended: approve.
2. **`A5`** — approve the `ScoreSource` ordered fallback (nflverse primary, Sleeper secondary), or accept nflverse-only risk. Memo: `Direction/reviews/2026-08-15-a5-scoring-source-options.md`. Trigger date 2026-09-01.
3. **`M8-EspnAndroidHelper`** — Firefox exposes HttpOnly cookies, so Android may be the only mobile ESPN path. **Verify on a real device before any code.**

## Recommended next pull

**`M6-ContextualHelp`** (P1, READY, no gates). The `m4-help-support-v1` contract §1 already specifies Contextual Help as distinct from the Help + Support destination; only the destination was built. Content inventory is the web `HelpButton.jsx` `PAGE_HELP` map — but the spec is explicit it is "content inventory only and is not a mobile layout source", and two traps must be avoided on port: it still contains **Draft Assistant** entries (cut from 1.0) and tells users to connect **ESPN**, which native cannot do.

After that: M5 slices **D** (Omen destination) and **E** (Ledger) are wiring against shipped routes. **F/G** need their M1 screen-contract slices first.

## Standing cautions earned this session

- **A green build is not a working feature.** The Safari extension compiled, embedded, and installed — and could never have worked. Verify the capability, not the presence.
- **Check a queue item's premise before researching its question.** `A5` was written against a file that never existed under that name; three inbox items described merged work as pullable.
- **Absence in one code-split chunk is not absence from production.** I wrongly called production a month stale after grepping a single bundle file.
- Android `:app` has no JVM unit-test source set, so slice A–C tests live in `androidTest` and need an emulator. If a future item adds one, move them.
- No Android primitive-enforcement scanner appears to exist despite prior handoffs citing it as evidence. Do not cite it until someone finds or builds it.
