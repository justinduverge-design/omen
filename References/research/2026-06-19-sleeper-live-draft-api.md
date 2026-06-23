# Sleeper Live Draft API Research

Date: 2026-06-19

Official sources:

- [Sleeper API documentation](https://docs.sleeper.com/)
- [Sleeper General Terms of Use](https://support.sleeper.com/en/articles/5486620-general-terms-of-use)

Omen uses only the documented read-only league draft, draft metadata, and draft picks endpoints. Sleeper documents no token requirement and a general ceiling below 1,000 calls per minute. Draft `last_picked` is an event timestamp; pick position comes from `pick_no`. A league can contain multiple drafts.

Selected posture: request-driven cursor polling; 2-second active mode; 30-second low mode; Redis micro-cache; concurrent-request dedupe; 900-call process budget; 429 backoff; no WebSocket, long poll, background worker, scraping, migration, or new dependency.

Terms risk remains unresolved and is recorded in `Direction/reviews/2026-06-19-legal-spot-check-sleeper-draft-sync.md`.
