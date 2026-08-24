# Omen Football Data Policy v1.1

**Audience:** Founder and product leadership
**Status:** Adopted by founder — 2026-08-24
**Purpose:** amend the adopted v1 policy with data custody, correction transparency, account-deletion, and operating-accountability rules.

This document is an amendment to `omen-football-data-policy-v1.md`. Its original lawful-source, traceability, validation, and phased-authorization rules remain in force.

## The added commitment

Omen will keep public football facts, private account data, and Omen’s audit evidence separate. It will correct material outcomes visibly, remove account-linked recommendation history when an account is deleted, and stop publication when a named operating owner cannot establish that the data is trustworthy.

## 1. Data classes and custody

Omen recognizes three distinct kinds of information:

| Data class | Examples | Rule |
|---|---|---|
| Public football facts | game, player, team, and stat records; approved source snapshots | Shared scoring infrastructure. Kept with source provenance and attribution; never treated as a person’s account data. |
| Private account and league data | account identity, connected league context, roster context, a person’s recommendations and outcomes | Used only to personalize and explain that person’s Omen experience. It is not an input to the public football-data corpus. |
| Omen audit evidence | source/version identifiers, formula version, validation result, correction record | Kept to explain and reproduce Omen’s behavior. It must not expose another person’s private league or account information. |

Provider credentials and access tokens remain outside the football-data pipeline. The pipeline must work from approved football-source records, not from another user’s connected-provider data.

## 2. Account history and deletion

Recommendation history belongs to the account it explains.

- Omen may retain a person’s recommendations and grades while their account is active, subject to the product privacy and retention rules.
- When an account is deleted through Omen’s established deletion process, Omen deletes or irreversibly de-identifies account-linked recommendation history and private league context.
- The deletion does not require removing the shared public football facts or general, non-identifying audit evidence needed to prove how the scoring system operated.
- Omen does not retain a private recommendation history merely because it could be useful for future product analysis. Any new use needs a separate, explicit policy decision.

## 3. Corrections are visible, not silent

If an approved source correction or Omen formula correction materially changes a graded outcome, Omen preserves the original result and records the new version, reason, and effective date.

The affected account’s history must show that the result was corrected and why in plain language. Omen should notify the account when the correction changes the recommendation’s outcome or grade; a cosmetic or non-material metadata correction does not require a notification.

Omen must never overwrite an old grade as though the first result never existed.

## 4. Operating ownership and stop authority

Every proposed collection, validation, or publication phase must name one **Data Operations Owner** in its approval record.

That owner is responsible for reviewing the defined evidence, pausing publication on a failed control, escalating a source or correctness concern, and recording any narrowly approved exception. The role is accountable for operating the policy; it does not gain unilateral authority to weaken it.

Any failed rights, completeness, identity, formula, or validation control stops publication automatically. A human may investigate and approve a bounded exception only where the governing policy explicitly permits one; urgency is never a reason to publish an untrustworthy grade.

## 5. What did not change

This amendment does not authorize a collector, scheduled timer, paid source, credential, SQL application, database migration, deployment, production scoring flag, or ADP work. A4 and A6 production gates remain unchanged.

## Related records

- Base policy: `Direction/policies/omen-football-data-policy-v1.md`
- Source and architecture evidence: `Direction/reviews/2026-08-24-a7-owned-football-data-pipeline.md`
- Current delivery gates: `Direction/current_sprint.md` (`A4`, `A6`, and `A7`)
