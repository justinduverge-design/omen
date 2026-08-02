# Omen LEGAL-V1 final review

**Date:** 2026-08-02
**Branch:** `codex/legal-final-v1`
**Scope:** public Privacy Notice and Terms, sign-in assent, account deletion truth, waitlist unsubscribe, operator identity, tests, and rendered web QA
**Review type:** founder-directed pre-publication code, product, and legal issue spot-check

## Verdict

PASS for founder approval. No P0, P1, or P2 correctness, privacy, security, or presentation finding remains in the reviewed diff.

This is a pre-counsel issue spot-check, not a representation that a lawyer approved the documents. The founder explicitly declined paid counsel and approved the operating facts and recommendations used here.

## Reviewed facts and outcomes

- The official operator is written exactly as **Valor Ventures Limited Liability Company**.
- The founder expressly authorized publication of `23 Darrow St, New London, CT 06320` as the public mailing address.
- Omen is 13+. The sign-in action says that continuing confirms age 13+ and agreement to the Terms, with an acknowledgment of the Privacy Notice.
- The versioned server record is created only after a person initiates sign-in. The pending marker survives an emailed magic link opening in another tab, expires after 24 hours, contains no user information, and is removed after successful recording.
- Omen does not operate paid contests, wagering, gambling, betting, entry fees, prize pools, or cash-out functionality. The Terms state that boundary directly.
- Account deletion now removes the Supabase Auth identity in addition to Omen profile, connection, move, consent, and credential records. The public deletion page matches that behavior and distinguishes third-party accounts and the separate waitlist.
- Waitlist email contains the company name, postal address, and a public unsubscribe link. The removal endpoint normalizes the email, deletes all matching rows, and returns the same response whether or not the address existed.
- Privacy disclosures identify the collected categories, purposes, provider categories, local-AI boundary, tracking posture, retention rules, rights, children boundary, change notice, and contact method.

## Primary-source checklist used

- FTC COPPA guidance: under-13 collection requires the COPPA notice/parental-consent framework; Omen instead sets a 13+ eligibility boundary and says it does not knowingly collect from children under 13. <https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions>
- FTC CAN-SPAM guide: commercial email needs accurate sender information, a postal address, an easy opt-out, and prompt honoring. Omen's current waitlist email and immediate removal route cover those product-controlled items. <https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business>
- California Business and Professions Code 22575: the notice includes categories, sharing categories, request process, material-change process, effective date, and Do Not Track/cross-site collection disclosure. <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575>

## Accepted and external boundaries

- The public street address is intentionally public by founder authorization; changing to a registered agent, post-office box, or commercial mailbox later requires a legal-copy update.
- ESPN connection remains an unofficial and potentially fragile integration. The Terms disclose that reality, but Omen's documents cannot grant platform authorization or prevent a provider from changing or restricting access.
- Native iOS and Android are not released. Their store listings and sign-in/onboarding surfaces must link the current legal versions and preserve equivalent assent before release; this web change does not claim native-store completion.
- Production publication, live email delivery, merge, deployment, and canary are not established by this pre-merge review.

## Evidence

- RED: six expected failures for missing final copy/routes/behavior.
- GREEN focused suite: 13/13.
- Full backend suite: 506/506.
- Frontend production build: passed; existing Vite chunk advisory only.
- Root and frontend moderate audits: zero vulnerabilities.
- Desktop and 375px mobile render checks on `/privacy`, `/terms`, `/login`, and `/unsubscribe`: correct headings and zero horizontal overflow.
- `git diff --check`: clean.
