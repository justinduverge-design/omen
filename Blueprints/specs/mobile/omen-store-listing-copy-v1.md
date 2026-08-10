# Omen — Store Listing Copy v1

**Status:** Draft for founder review. **Not submitted.**
**Date:** 2026-08-05
**Covers:** sprint items **R7** (metadata scrubbed of Draft Assistant) and **K1** (honest mock/live copy)
**Companions:** `omen-store-privacy-and-rating-answers-v1.md` (R4/R5), `omen-store-review-notes-v1.md` (reviewer notes)

**⚠ Gate:** platform-support claims below must not go live until **F6–F8** (real-account
QA for ESPN, Yahoo, Sleeper) pass. The adapters are shipped and deployed, but no
provider is proven end-to-end with a real connected account. Publishing "works with
your Yahoo league" before that is a claim we cannot yet stand behind.

## Voice constraints applied

From `Brand/brand-system.md`:

- Plain English. No hype, hedging, corporate filler, or condescension.
- **Lead with the move, not the reasoning.**
- Approved anchors only: *"See the result before it happens."*, *"The edge is in what you almost missed."*, *"See the move before the league does."*
- **Not used:** the §10a brand-board pillars (DETECT / ANALYZE / PREDICT / WIN). §10a marks them **provisional** and says do not use in marketing copy until locked.
- **Not used:** retired lines — *"Less guessing. Better moves."*, *"Know your move before you make it."*, *"See the winning move."*, *"Where the math meets the legend."*
- **No Draft Assistant.** Cut from 1.0.
- No wagering, betting, odds, or contest language anywhere.

---

## Google Play

### App name — 30 char limit

```text
Omen — Fantasy Football Tool
```

28 characters. Matches the App Store listing title. The **product** name remains
**Omen**; the descriptor is for search.

### Short description — 80 char limit

```text
See the move before the league does. One clear call a week, with the reasoning.
```

78 characters. Uses the approved competitive-feel alternate anchor.

**Backups if you want a different angle:**

```text
Your best fantasy move each week — with the risk and confidence spelled out.
```
```text
Omen reads your real roster and matchup, then tells you the one move to make.
```

### Full description — 4000 char limit

```text
Omen gives you one clear fantasy football decision each week — the move to make, why it works, what it risks, and how confident it is.

It reads your actual roster, matchup, and league. Not generic rankings. Not a spreadsheet you still have to interpret.

WHAT YOU GET

• One recommended move each week — a lineup change or a waiver pickup
• Plain-English reasoning you can check, not a black-box score
• The risk in the move, stated directly
• A confidence level, so you know how much weight to give it
• Trade analysis that shows whether both sides actually improve

HOW IT WORKS

Connect your league from Yahoo, Sleeper, or ESPN. Omen pulls your real roster, your real matchup, and your league's actual scoring. Then it looks for the single move that changes your week most — and tells you plainly whether one exists.

Some weeks the answer is that your lineup is already right. Omen will say so rather than invent a move to look useful.

WHAT OMEN IS NOT

Omen is not a stats dashboard, a news feed, or a league manager. You already have those. It is a decision layer that sits on top of the league you already play in.

It is also not a replacement for your instinct. You usually know your roster better than any tool does. Omen tests that instinct, surfaces the risk you almost missed, and either confirms your call or changes it.

There is no betting, wagering, odds, entry fee, prize pool, or real-money contest anywhere in Omen. It is a roster decision tool.

TRY IT WITHOUT AN ACCOUNT

Tap "Try Demo" on the first screen to see the full app with clearly labeled sample data. No account, no password, no verification code. Every demo screen is marked as sample data so it can never be mistaken for real advice.

FREE

Omen is free. No subscription, no in-app purchases, no locked features, no trial that expires.

YOUR DATA

You can disconnect any platform, export your account data, and delete your account from inside the app at any time. Connection credentials are stored through an encrypted vault, are never shown back to you, and are never used for advertising. Omen does not sell your information.

Omen is for people 13 and older.

---

Omen is not endorsed by or affiliated with Yahoo, Sleeper, ESPN, Disney, or the NFL. Platform trademarks belong to their respective owners.
```

Roughly 2,050 characters — comfortably inside the limit, and short enough to actually be read.

### Graphics required before publishing

Not required for internal testing; required before production.

- App icon — 512×512 PNG. Source: `logos/` app-icon badge.
- Feature graphic — 1024×500 PNG.
- Phone screenshots — 2 minimum, 8 maximum.
  **Capture from Demo Mode only.** Never from a real connected league — a screenshot must never contain a real league id, username, roster, or any provider cookie.

---

## App Store Connect equivalents

Same substance, different field shapes.

### Subtitle — 30 char limit

```text
One clear move every week
```

25 characters.

### Promotional text — 170 char limit, editable without review

```text
Omen reads your real roster and matchup, then gives you one move — with the reasoning, the risk, and how confident it is. Free, and no account needed to look around.
```

163 characters. This field can be updated without a new submission, so use it for
in-season messaging.

### Description

Reuse the Play full description above, minus the trailing attribution line
(Apple handles trademark attribution separately). Apple does not render bullet
characters distinctly, so the `•` lines still read fine as plain text.

### Keywords — 100 char limit, comma-separated, no spaces

```text
fantasy,football,lineup,startsit,waiver,trade,roster,league,advice,decision,matchup,ppr
```

87 characters. **Do not** include competitor or platform brand names as keywords —
Apple rejects for that, and it would undercut the non-affiliation statement.

---

## Pre-publish checks

- [ ] **F6–F8 passed** before any platform-support claim goes live
- [ ] No Draft Assistant reference anywhere (**R7**)
- [ ] No wagering, betting, odds, or contest language
- [ ] Screenshots captured from Demo Mode, never a real league
- [ ] No screenshot or asset contains a league id, username, or provider cookie
- [ ] Free claim is accurate — no IAP configured on either store
- [ ] Privacy policy and account-deletion URLs resolve publicly
- [ ] Support URL resolves (depends on `M4-Help-Support-Implementation`)
- [ ] Age gate reads 13+ consistently with Terms, Privacy, and the R5 rating answers
- [ ] Non-affiliation line present on Play; Apple equivalent handled
