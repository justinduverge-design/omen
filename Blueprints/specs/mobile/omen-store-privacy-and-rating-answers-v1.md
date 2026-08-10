# Omen — Store Privacy Labels & Age Rating Answers v1

**Status:** Draft for founder review. **Not submitted.** Store submission is founder-gated.
**Date:** 2026-08-05
**Covers:** sprint items **R4** (Apple privacy nutrition labels + Google Data Safety) and **R5** (age rating / gambling questionnaires)
**Applies to:** iOS App Store Connect → App Privacy / App Information, and Google Play Console → App content
**Bundle / application id:** `com.slopssaloon.omen`
**Companion:** `omen-store-review-notes-v1.md` (reviewer notes, already paste-ready)

Every answer below is derived from the **shipped** Privacy Notice
(`frontend/src/pages/Privacy.jsx`, effective 2026-08-02) and verified route
behaviour. **Store answers that contradict the published policy are a rejection
and a legal exposure** — if the policy changes, this file changes with it.

---

## ⚠ Resolve these two before answering anything

### 1. "No user-generated content" is not accurate

`omen-store-review-notes-v1.md` line 94 answers **"Is user-generated content shown? No."**

That is wrong as written. `Blueprints/api-routes.md:28-30` documents:

- `POST /api/trade/share` — creates a **30-day public share hash**, no auth
- `GET /api/trade/share/:hash` — **public read** by anyone holding the URL
- `GET /api/trade/share/:hash/og.svg` — public OG image for crawler cards

A user creates content and publishes it at a public URL. That is user-generated
content by every store's definition, even though the input is bounded by
`validateTradeSharePayload` and carries no free text, no media upload, and no
account identity.

**Recommended honest answer:** *"Users can generate a bounded trade-comparison
summary and share it via a public link that expires after 30 days. Input is
constrained to trade selections — no free text, no image upload, no profile, no
comments, and no user-to-user messaging."*

That framing is accurate and still lands in the lowest-risk UGC tier. Claiming
none at all is the risk.

The free-text `user_note` on Omen feedback is **not** UGC for store purposes —
it is private product feedback, never shown to another user.

### 2. Reviewer notes are stale on sign-in providers

Line 91 lists Discord as **"(pending)"**. Discord OAuth **merged** on both
platforms in PR #198 (`73c5a1d`). Line 100's checklist item "Actions billing
restored" is also stale — that was a misdiagnosis, fixed in #250.

Update `omen-store-review-notes-v1.md` before pasting it anywhere.

---

## R4 — Apple Privacy Nutrition Labels

App Store Connect → App Privacy. Apple asks, per data type: **collected?**,
**linked to the user?**, **used for tracking?**, and **purposes**.

**Global answers:**

| Question | Answer | Basis |
|---|---|---|
| Used for tracking (ATT)? | **No** — for every type | Policy: no sale, no cross-context behavioural advertising, no targeted advertising |
| Third-party advertising? | **No** | No ad SDK in either client |
| Data collected in Demo Mode? | **No** | `demo-local` session, no stored credentials, no real user data (M0c §6) |

**Declare collected:**

| Apple data type | Linked | Purposes | What it actually is |
|---|---|---|---|
| **Contact Info → Email Address** | Yes | App Functionality; Product Personalization | Account email; waitlist email + platform preference |
| **Identifiers → User ID** | Yes | App Functionality | Supabase auth identifier; connected-platform identifiers and usernames |
| **User Content → Other User Content** | Yes | App Functionality | Display name; `user_note` feedback; trade-share snapshot payload |
| **Usage Data → Product Interaction** | Yes | App Functionality; Analytics | Recommendations, saved moves, consent records, connection status, feature interactions |
| **Diagnostics → Crash Data** | No | App Functionality | Sentry, **when configured** |
| **Diagnostics → Performance Data** | No | App Functionality | Sentry, when configured |
| **Diagnostics → Other Diagnostic Data** | No | App Functionality | IP address, user agent, request details, security events |
| **Other Data** | Yes | App Functionality | **Fantasy-platform data** — leagues, teams, rosters, standings, matchups, drafts, transactions, players. Apple has no category for this; `Other Data` is the correct home. |
| **Other Data** | Yes | App Functionality | **Connection credentials** — OAuth tokens and ESPN session-cookie values. Stored via Supabase Vault, never displayed back, never in analytics. |

**Do NOT declare** (verify each before submitting): Health & Fitness,
Financial Info, Location, Contacts, Browsing History, Search History, Purchases,
Sensitive Info. None are collected.

> **Judgement call worth your review:** listing credentials under `Other Data` is
> the defensible reading — Apple has no credential category, and omitting them
> entirely would understate collection. If you'd rather be conservative, they can
> also be argued as not "collected" because they are user-supplied connection
> secrets held on the user's behalf. **I recommend declaring them.** Under-declaring
> is the failure mode Apple actually penalises.

---

## R4 — Google Play Data Safety

Play Console → App content → Data safety. Google separates **collected** (leaves
the device) from **shared** (goes to a third party).

**Security practices:**

| Question | Answer | Basis |
|---|---|---|
| Encrypted in transit? | **Yes** | HTTPS/TLS throughout; TLS confirmed via handshake in the A3 review |
| Users can request data deletion? | **Yes** | In-app under Account + public `/delete-account` page; confirmation phrase `DELETE MY OMEN DATA` |
| Committed to Play Families Policy? | **No** | App is 13+, not child-directed |
| Independent security review? | **No** | Do not claim one |

**Data types — collected, and how:**

| Category → Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Personal info → Email address | Yes | No | Required | Account management |
| Personal info → User IDs | Yes | No | Required | Account management, App functionality |
| Personal info → Name | Yes | No | Optional | App functionality (display name) |
| Personal info → Other info | Yes | No | Optional | App functionality — connection credentials, fantasy-platform identifiers |
| App activity → App interactions | Yes | No | Optional | Analytics, App functionality |
| App activity → Other actions | Yes | No | Optional | App functionality — recommendations, saved moves, consent records |
| App info & performance → Crash logs | Yes | No | Optional | Analytics — Sentry, when configured |
| App info & performance → Diagnostics | Yes | No | Optional | Analytics — performance data |
| App info & performance → Other | Yes | No | Optional | App functionality — IP, user agent, security events |

**Notes on "shared":** answer **No** throughout. Supabase, Sentry, and Resend are
**service providers processing on Omen's behalf**, which Google treats as
collection, not sharing. Yahoo / Sleeper / ESPN receive data only at the user's
explicit request to connect — that is user-directed transfer, not sharing. Confirm
this framing against Google's current definitions at submission time.

**Do NOT declare:** Location, Financial info, Health & fitness, Messages, Photos
and videos, Audio, Files and docs, Calendar, Contacts, Web browsing history,
Device or other IDs *for advertising*.

---

## R5 — Apple age rating

App Store Connect → App Information → Age Rating.

| Category | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humor | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| **Simulated Gambling** | **None** |
| **Contests** | **None** |
| Unrestricted Web Access | No |
| Gambling and Contests (legacy combined) | No |

**Standing product boundary** (`Direction/decision_log.md`, 2026-08-02):

> Omen will not operate paid contests, wagering, gambling, betting, entry fees,
> prize pools, or cash-out functionality. This is a standing product boundary,
> not temporary launch copy.

That is why every gambling answer is None, and it must stay true. Adding any of
it later is a re-rating, a policy review, and a Terms change — not a feature.

**Target the 13+ band.** Your Terms and Privacy Notice both state 13 and older.
Apple's questionnaire will otherwise compute a lower rating, and a store rating
of 4+ against Terms that say 13+ is an inconsistency a reviewer can act on. Apple
revised its age bands in 2025 — **confirm the exact options in the live
questionnaire** and choose the one that matches 13+.

---

## R5 — Google Play content rating (IARC)

Play Console → App content → Content ratings. IARC generates ESRB/PEGI/USK
ratings from one questionnaire.

| Question area | Answer |
|---|---|
| Category | **Reference, News, or Educational** (a decision assistant, not a game) |
| Violence, sexuality, language, controlled substances | None |
| **Gambling — real money** | **No** |
| **Gambling — simulated / social casino** | **No** |
| Does the app promote or reference gambling? | **No** |
| Users can interact / communicate with each other | **No** — no messaging, comments, or profiles |
| **Users can share content** | **Yes** — bounded public trade-share link, 30-day expiry. See the UGC note above. |
| Shares user location with others | No |
| Allows purchase of digital goods | No |
| Miscellaneous — user-generated content moderation | Bounded input, no free text or media; no moderation surface required |

**Do not categorise Omen as a game.** It has no gameplay, scoring against other
players, or wagering loop. Miscategorising as a game routes it into a stricter
review lane for no benefit.

---

## Cross-check before submitting

Every line must be true at submission, not just today.

- [ ] Privacy Notice URL resolves publicly and is linked in **both** store listings
- [ ] Support URL resolves publicly (depends on `M4-Help-Support-Implementation`)
- [ ] Account-deletion page resolves publicly and is linked in the Play listing
- [ ] Labels here match `frontend/src/pages/Privacy.jsx` exactly — re-diff if the policy changes
- [ ] **No Draft Assistant claim** anywhere in metadata (**R7**) — cut from 1.0
- [ ] Reviewer notes updated: Discord is shipped, not pending; drop the stale billing line
- [ ] UGC answer reflects trade-share, on both stores
- [ ] Sentry declared as *conditional* — if it is not deployed at submission, say so honestly rather than declaring collection that is not happening
- [ ] No screenshot or asset contains an ESPN cookie, provider token, real league id, or real username

## Standing constraints

- Demo and mock data is labeled and never presented as live advice (`Direction/facts-of-record.md` #7).
- ESPN cookie values never appear in any artifact, including screenshots and store answers.
- Store submission, signing, and provider configuration remain founder-gated. This document is preparation only.
- This is not legal advice. The gambling and privacy answers carry real regulatory weight; counsel review is warranted before first public release.
