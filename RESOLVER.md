# Omen resolver

Use this page when deciding where knowledge belongs before creating or moving a file.

1. Route by the existing DBS purpose in `DBS_INDEX.md`.
2. Product direction and current state belong in `Direction/`.
3. Specifications, prompts, procedures, evidence handoffs, and durable engineering guidance belong in `Blueprints/` under the closest existing route.
4. Research remains in `References/`; completed outputs remain in `Solutions/`; superseded material remains in `Archive/`.
5. A `page_type` describes content. It never creates a folder or overrides the DBS route.
6. If a page opts into `metadata_profile: valor-brain/v1`, run `node scripts/check-valor-brain.mjs` before treating its metadata as valid.
7. If no current route fits, use `Direction/agent_inbox.md` as the temporary routing surface and ask the founder. Do not invent a parallel knowledge tree.

Cross-layer doctrine is owned by L0. Omen owns its product facts and keeps local mirrors of the Valor Brain schema and validator so standalone clones can validate themselves.
