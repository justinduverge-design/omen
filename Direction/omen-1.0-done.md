# Omen 1.0 is done when…

**Draft, 2026-10-26; founder answers recorded the same day.** Replaces the "Definition of done" in
`omen-1.0-plan.md` (2026-08-05), whose dates and Phase 0 to 7 sequence passed with the season. Each line is
checkable: a test, a recorded run, or a store state. Agents told to "finish Omen" work toward this list and
nothing else; anything not on it is 1.1.

## What changed since the August plan

- The beta happened: 12 TestFlight builds, 7 of 8 friends-beta leagues, every iOS screen rebuilt (#770).
- Every beta build has been iOS TestFlight. 1.0 now means iOS, Android and the web app/website together
  (founder, 2026-10-26), so Android and web are real work, not maintenance.
- Sight exists but forecasts points only; Omen's purpose is forecasting, so the stat line is the 1.0 core.
- Error tracking needs restoring (Build 13 direction); the August plan made crash visibility a hard gate.
- Draft Assistant stays cut (2027).

## The checklist

### Product: Omen's own read
1. Sight forecasts the stat line (targets, catches, yards, carries, TDs by kind) for QB/RB/WR/TE for the
   coming weeks, scored with each league's own rules on Sleeper, ESPN and Yahoo.
2. **The Sight bar is coverage, not beating the provider** (founder, 2026-10-26): every decision and every
   prediction is reasoned as fantasy football from Sight, shown next to the league's projection and labelled
   honestly. A held-out scorecard per stat is kept so the edge is proven over time; it is not a 1.0 gate.
3. Every decision screen (trade, start/sit, waivers) shows season so far / Omen expects / league projection.
4. Win probability on the Desk from Omen's forecast.
5. No unlabeled provider or mock number reads as Omen's own (truth gate: zero P0).

### Providers
6. Sleeper, ESPN and Yahoo, all three. Each: a fresh-account connect and full ingestion is recorded (ESPN's
   has never been run), and a provider failure degrades with a clear state. More providers are 1.1+; the
   adapters must not block adding them.

### App and platforms
7. iOS, Android and the web app/website. Each: every screen passes a walk with unfiltered accessibility
   (VoiceOver/TalkBack, Dynamic Type/font scale) on a small and a large phone, and the web on desktop and
   mobile widths; the same Sight read on all three.
8. Forced-update gate works (a bad build can be pushed off phones).
9. Build Trade from your own roster.

### Trust and operations
10. Crashes and server errors are visible within minutes (error tracking restored), with no paid spend.
11. In-app support reaches the founder and can be closed.
12. One clean Tuesday scoring run on real data and two stable weeks with no P0.
13. Rollback owner and tested rollback; backups verified restorable; rate limits on hot routes (#777 done).

### Store
14. Public release: App Store and Google Play approval, and the website live: privacy labels, gambling/age
    questionnaire, metadata with no Draft Assistant claims, support URL.

### Date
15. No date yet: the launch date is designed together with the marketing plan, so 1.0 lands when the
    product can stick in the market (founder, 2026-10-26). Writing that launch plan is a 1.0 item.

### Still to flesh out
16. Small-model background workers are a 1.0 must-have (founder): define which jobs, with shadow receipts.
17. **Fast enough to feel finished.** Load time is not good enough today (founder, 2026-10-26). Set a budget
    per screen for cold and warm loads (first league read, Desk, decision screens), measure it on a real
    phone and the web, and meet it on all three providers.
18. **No half-built app goes out** (founder, 2026-10-26). Every must-have above is required; "and a few other
    things" the founder has noticed still need writing down. The next planning pass collects them with the
    founder before a launch date is set.

## Not 1.0 (unless the founder moves it)
Draft Assistant; Discord OAuth;
IDP; theme packs.
