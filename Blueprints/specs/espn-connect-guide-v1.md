# ESPN Connect Guide v1

## Goal

Help a phone user continue the existing desktop-only Omen ESPN Connect extension flow without collecting contact details or exposing credentials.

## Public route

`/espn-connect` is unauthenticated and uses `PublicInfoLayout`. Its stable share URL is the only value shared, copied, encoded in QR, or placed in SMS/email drafts.

## Required guide content

1. Explain plainly that ESPN has no comparable smooth connection flow, so setup finishes on a computer.
2. State that the Omen helper fills the existing form only; the user reviews it and clicks Connect.
3. Link the existing local-load instructions in `extension/README.md`.
4. Show Share, Copy link, Text, Email, and QR handoff options. Native Web Share is progressive enhancement only; every action has a no-service fallback.
5. Keep platform attribution visible and do not claim ESPN approval or affiliation.

## Boundaries

- Never place `espn_s2`, `SWID`, league IDs, raw provider responses, or any credential content in the DOM, URL, QR, share text, analytics, video, or logs.
- No contact capture, SMS gateway, email provider, backend endpoint, package installation, or extension permission change.
- The walkthrough uses mock browser and Omen screens only, labels itself as a demo, and covers Chrome/Edge only in v1.

## Verification

- Public route works unauthenticated at phone and desktop widths.
- Share/copy/SMS/email/QR all contain only the guide URL.
- Tests cover native-share fallback selection and copy behavior.
- The walkthrough is captioned, transcribed, and contains no real account or credential data.
