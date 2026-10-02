# Tuesday 2026-10-06 release prep — checklist (started 2026-10-01)

**Status:** PLANNING. Nothing here is done unless it says so. Founder decides what ships; the database and contract redo (separate session) is NOT touched by this lane.
Sources: `Direction/2026-10-01-device-walk-1.md`, `Direction/2026-09-29-tuesday-readiness.md`, PRs #501/#502/#504/#507 (merged 2026-10-01).

## Must fix before the archive (all iOS, none touch the database or the contracts)
1. **Build guard.** A build with empty `OMEN_SUPABASE_URL` / `OMEN_SUPABASE_ANON_KEY` or the `example.invalid` API host must FAIL, not ship (it shipped silently on 2026-10-01: no sign-in providers, no email code). Applies to the archive path too (`Config/Local.xcconfig` is git-ignored).
2. **Version bump.** `CURRENT_PROJECT_VERSION` is still 7 (carried from the 2026-09-24 notes).
3. **Connect confirmation** names only the first league and says "Only the first league will stick for now". Wording must match what the redone connections table will actually do; fix after the DB redesign decides it.
4. **Command vs League waivers disagree** (Command shows a pick; League says unavailable).
5. **Smaller:** Trade-tab helper line hidden by the tab bar; truncated passkey copy.
6. **Founder design notes** (full system sheets, remove "See how Omen decides", explain chip check marks, smaller report card, long-press carousel).
7. **Find-a-trade entry point** — founder decision needed; the screen is built and unreachable.

## Verify on the phone (founder walk, 35 screens)
Round 1 done (21 screenshots, 2026-10-01). Round 2: after the fixes above, repeat; also walk TradeBuild with a partner, the Add-team chip, partner picker, three-team verdict, Ledger row, Account, report pill.

## Known and accepted for Tuesday (say so in release notes)
- Only one league per platform is saved server-side (duplicate rows). Other leagues in the switcher cannot get a call until the connections redesign lands.
- Tuesday scoring is held (`OMEN_CRON_SCORING_ENABLED=false`): Ledger rows read Pending.
- Waiver and trade-target data say "unavailable" where the provider cannot confirm free agents or rosters.

## Speed (measured, iPhone, 2026-10-01)
Switch ~2 s after #507 (was ~6-8 s). Remaining: waivers/analysis ~1 s, mvp-move ~1.6 s, /leagues ~1 s, recomputed per request; a short server cache is proposed, not approved.

## Release gate
Per `Blueprints/definition-of-done.md`: device evidence for every native screen claimed; backend `npm test` green; contract drift check green; no "VERIFIED" without the phone. Archive and upload are founder-executed.
