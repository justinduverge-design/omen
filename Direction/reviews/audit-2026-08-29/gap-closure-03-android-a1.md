# Gap closure 03 — Android A1 swept; and the pattern across both platforms

| | |
|---|---|
| **Closes** | "Android A1 coverage remains partial", recorded in gap closure 01 |
| **Commit** | `ea1fb0f` |
| **Date** | 2026-08-30 |
| **Method** | 11 Kotlin sealed state machines parsed by brace-matching; every candidate then verified by opening the file. |

## F-VET-07 — Almost every "something is wrong, here is what" state is unreachable, on both platforms

- **Claim:** Omen has a complete, designed vocabulary for degraded and recovery states. **Eleven
  of those states have no production producer on either platform.** They are declared, styled,
  rendered by a `when`/`switch`, covered by component tests, drawn in the design gallery — and
  nothing can ever set them.
- **Evidence:** verified case by case, both platforms.

| State | What it would tell the user | Producers outside rendering/tests/gallery |
|---|---|---|
| `OmenContextStripState.needsRecovery` | *your league connection is broken, and why* | **none** |
| `OmenContextStripState.multiTeamHint` | you have more than one team here | **none** |
| `OmenHelpSupportState.providerRecovery` | help for a broken provider connection | **none** |
| `OmenHelpSupportState.offline` | you are offline | **none** |
| `OmenHelpSupportState.noAccount` | you are not signed in | **none** |
| `OmenDecisionBriefState.stale` | this recommendation is old | **none** |
| `OmenWaiverWatchState.urgent` | a waiver deadline is close | **none** |
| `OmenWaiverWatchState.calm` | opportunities, no rush | **none** |
| `OmenWaiverWatchState.pending` | your claim is in | **none** |
| `OmenWaiverWatchState.processed` | your claim resolved | **none** |
| `OmenWaiverWatchState.noCredibleMove` | Omen looked and found nothing | **none** |

- **Failure scenario:** A tester's ESPN session expires. The context strip **has a state for
  exactly that** — `needsRecovery(platform:leagueName:teamName:reason:)`, carrying the reason —
  and it cannot be shown. They open Help, which **has a `providerRecovery` state**, and it cannot
  be shown either. They are offline; Help **has an `offline` state**, unreachable. At every point
  the app has the right words written and no way to say them.
- **The pattern, which is worth more than the eleven items:** these are not scattered. **They are
  almost exclusively the degraded, recovery, and in-flight states.** The happy paths are wired.
  What is missing is everything that would tell a user something is wrong and what to do — the
  exact vocabulary a beta tester needs most and a developer exercises least.
- **Criterion:** A1 — honest state at the screen level.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon each, but eleven of them
- **Abort class:** none — nothing false is displayed. The app is silent where it should speak.

**F-VET-02 and F-VET-05 are subsets of this** and stay in the register for traceability rather
than being merged away.

## The sweep lied three more times, and each was caught by opening the file

Recorded because the next person will write the same script:

1. **Zero findings on the first run.** The member regex could not cross newlines, so every
   multi-line `data class` was invisible. **A sweep that finds nothing reads exactly like a
   pass** — the most dangerous failure this technique has.
2. **`OmenMatchupHeroState.Final` flagged unreachable.** It is produced by code written earlier
   the same day. The `when`-branch filter skipped
   `Matchup.Status.Final -> OmenMatchupHeroState.Final(` because the line contains both a branch
   label and a construction.
3. **`OmenDecisionBriefState.Loading` flagged unreachable** with 24 real references, same cause.

Combined with gap closure 01's three, **six false results across two sweeps.** Every one was
caught by opening the file, and none by re-reading the script.

## A1 status

**Complete on both platforms.** iOS: 18 state enums. Android: 11 sealed machines. Every flagged
case verified by hand before being recorded or discarded.
