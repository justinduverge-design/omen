# Legal Spot Check — Sleeper Draft Sync

Date: 2026-06-19

This is a platform-terms spot-check, not legal advice.

- [Sleeper's API documentation](https://docs.sleeper.com/) describes a free read-only tokenless API and advises remaining below 1,000 calls per minute.
- [Sleeper's General Terms](https://support.sleeper.com/en/articles/5486620-general-terms-of-use), updated June 1, 2026, restrict business/commercial and third-party-benefit use.

Those statements leave material ambiguity for Corvus even while Corvus is free. Justin explicitly directed Corvus to ship two-second active sync, retain 30-second low mode, and revert future traffic if Sleeper objects. That is founder risk acceptance, not permission, endorsement, partnership, or legal clearance. Lower frequency does not cure the ambiguity, and a later rollback cannot erase earlier requests.

Engineering guardrails: documented read-only endpoints only; no scraping, socket, token, or write operation; authenticated connected-league ownership; no other-manager raw user IDs; safe errors; caching, dedupe, backoff, and a 900-call/minute process budget.
