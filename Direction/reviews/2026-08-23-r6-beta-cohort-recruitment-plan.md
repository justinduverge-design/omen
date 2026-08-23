# R6 beta-cohort recruitment plan — 2026-08-23

## Claim

Omen's beta-store setup is complete as far as it can proceed without outside outcomes. Apple Build 1 is waiting for Beta App Review; Google Play's internal release is active, but no compatible Android installation has been proved and the required cohort of 10+ real testers in real fantasy leagues has not been assembled.

## What counts

A qualified tester:

- actively participates in at least one real fantasy-football league;
- has an iPhone or Android phone compatible with the beta build;
- explicitly opts in to receiving the beta invitation;
- can install the app and perform a short structured test; and
- can report a problem or confirm the tested path worked.

An anonymous install, paid click, emulator-only run, or install-exchange participant does not count merely because the app was downloaded. A participant recruited through a broader community may count only after the same real-league qualification is recorded.

## Recommended funnel: Founding League Panel

Recruit **15–18 qualified prospects** to land at least 10 accepted testers after ordinary attrition. Aim initially for **4 Android prospects and 10–14 iPhone prospects**; this is a recruiting target, not a platform quota in `R6`.

Use channels in this order:

1. **Founder's existing leagues and fantasy contacts.** Highest likelihood of real usage, useful context, and prompt feedback.
2. **Existing Omen waitlist.** The repo records 10 waitlist rows and the signup promise includes early access. Treat those people as invitation candidates, not automatic testers; obtain the founder's approval for the message and send before contacting them.
3. **Moderated fantasy-football communities.** Ask moderators before posting. Recruit for useful testing, not download swapping, and qualify each volunteer as an active league participant.
4. **Generic beta-testing communities only as a compatibility fallback.** These can help find Android hardware, but their participants do not satisfy the real-league threshold unless independently qualified.

No new paid vendor or subscription is required.

## Invitation mechanics

### iPhone

After Apple approves Build 1, create a TestFlight public link for the external group, capped initially at 25 testers, or send named email invitations. Share it only through the approved recruiting channels; TestFlight external access is not a public App Store release.

### Android

For each qualified Android tester:

1. collect the Gmail address used by Google Play on that phone;
2. add it to the Google Play internal-testing email list;
3. send the private opt-in link;
4. have the tester opt in with the allowlisted account and install from Google Play; and
5. capture sanitized proof of successful install/open without exposing the tester's email or other personal data in the repo.

The founder does not need an Android phone. The evidence belongs to the release and the tester cohort, not to the founder's hardware.

## Minimal intake record

Keep personal details outside the repository. The working roster needs only:

- nickname or private roster ID;
- iPhone or Android, device model, and OS version;
- fantasy provider and confirmation of an active real league;
- invitation consent and invitation status;
- install/open status; and
- feedback status.

Commit only aggregate counts and sanitized evidence. Do not commit email addresses, phone numbers, credentials, private invitation links, or screenshots containing them.

## Trigger and escalation

- **Now:** prepare founder-approved invitation copy and privately identify 15–18 prospects; do not wait for Apple to start identifying the cohort.
- **On Apple approval:** enable the capped TestFlight route and send the approved invitations.
- **After 48 hours:** if fewer than 10 qualified testers have accepted, invite the opted-in waitlist cohort and then expand to moderator-approved fantasy communities.
- **Android proof:** prioritize the first qualified Android volunteer immediately; one successful Play installation removes the founder-hardware uncertainty, while the larger cohort continues toward the 10+ gate.

## Recommendation

Use the existing-league plus waitlist hybrid. It is free, matches the product's real-league acceptance criterion, and produces feedback from people who can evaluate personalized fantasy advice; anonymous crowdsourcing should remain a last-resort device-compatibility tool rather than the cohort strategy.

## Boundaries

This plan prepares recruitment. It does not approve copy, contact anyone, publish a public link, grant console access, expose the Play opt-in link, or decide that a person qualifies. Those are founder-owned calls or executions.

## External references

- Apple, *Invite external testers*: https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/
- Google Play Console Help, *Set up an open, closed or internal test*: https://support.google.com/googleplay/android-developer/answer/9845334
