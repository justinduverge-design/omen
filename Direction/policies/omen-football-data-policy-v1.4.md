# Omen Football Data Policy v1.4

**Audience:** Founder and product leadership
**Status:** Adopted by founder — 2026-08-24
**Purpose:** amend the adopted football-data policy with provider-capability transparency for exact scoring.

This document is an amendment to policies v1 through v1.3. Their rules remain in force.

## The commitment

Omen tells a user plainly when a provider does not currently offer Omen a supported path to verify exact league scoring. It does not hide the limitation, blame the user, accuse the provider of wrongdoing, or present an approximation as exact.

## ESPN exact-scoring state

Until ESPN provides express written permission or an official commercial interface that covers Omen’s required settings extraction and final-result reconciliation, every ESPN recommendation must carry the user-facing state **Exact ESPN scoring unavailable**.

Approved user-facing wording:

> **Exact ESPN scoring unavailable**
>
> Omen can still offer guidance from the information available, but it cannot verify this recommendation against your final ESPN league score. ESPN does not currently provide Omen a supported way to perform that verification.

The product may adapt this copy for accessible/mobile presentation without weakening its meaning. It must not say or imply that the user connected incorrectly, that a commissioner acted improperly, or that Omen has verified an exact ESPN outcome.

## Product behavior

- Guidance may remain available only when its inputs and uncertainty are honestly described.
- Omen cannot attach `league-exact`, `exact`, or an equivalent exact-score claim to an ESPN recommendation or outcome while this state applies.
- Any ESPN score/outcome displayed during this state is an Omen estimate or provider-observed context, not an independently verified exact league score.
- If the supported path becomes available, the rights review, provider integration, reconciliation proof, and client contract must pass before the state is removed.

## What did not change

This amendment does not authorize expanded ESPN access, cookie handling, scraping, a collector, timer, provider credential, SQL application, migration, deployment, production scoring flag, or ADP work.

## Related records

- Full League Scoring Contract: `Direction/reviews/2026-08-24-full-league-scoring-contract-adr.md`
- Recommendation outcome and independence policy: `omen-football-data-policy-v1.2.md`, `omen-football-data-policy-v1.3.md`
