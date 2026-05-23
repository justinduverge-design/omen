# Security And Privacy Tracker

## Purpose

This is the human-readable tracker for active `ssffmvp` security and privacy decisions.

`probo.yaml` is the machine-readable compliance and evidence map. This file explains the product and engineering defaults agents should follow before changing auth, platform connections, ESPN recovery, logging, analytics, or user data handling.

## Canonical Evidence

- Compliance controls: `probo.yaml`
- Security summary: `README.md`
- Supabase RLS and Vault setup: `sql\ssffmvp_rls_security.sql`
- GDPR/delete flow notes: `src\ssffmvp_gdpr.js`
- ESPN recovery privacy rules: `Corvus\Blueprints\playbooks\espn-recovery.md`
- Shared engineering decisions: `Blueprints\handoffs\decisions.md`

## Current Controls

- ESPN cookies are stored through Supabase Vault references, not plaintext database columns.
- Yahoo tokens are stored through Supabase Vault references.
- Supabase Row Level Security restricts user-owned rows by authenticated user.
- Production secrets are injected at runtime and should not live in server `.env` files.
- ESPN request bodies are scrubbed from logs.
- User deletion work includes platform connection and Vault secret cleanup.
- `probo.yaml` tracks GDPR/SOC2-style control evidence.

## Safe Defaults

- Keep credential repair inside authenticated Account surfaces.
- Use `/account` for ESPN recovery instead of a separate public-feeling recovery route.
- Use only safe query params such as platform and recovery state.
- Keep ESPN league selection inside a full Account section for MVP.
- Preserve only safe feature context after recovery.
- Require an explicit user click before rerunning ESPN-backed work after recovery.
- Track product state and user actions, not credential content.

## Never Log Or Display

- ESPN credential values.
- Yahoo token values.
- Vault secret ids.
- Auth headers.
- Raw ESPN response bodies.
- Raw platform request bodies containing credential material.
- Full stack traces in user-facing responses.
- Values that can be reused to access a user's fantasy platform account.

## Probo Notes

`probo.yaml` exists and currently tracks:

- Credential encryption evidence.
- User data erasure evidence.
- Data inventory evidence.
- Non-PII audit trail evidence.
- ESPN recovery secret-handling evidence.

This is useful as a compliance checklist, but it is not a complete security program by itself. Keep product decisions and privacy rules in this tracker or the relevant playbook, then point `probo.yaml` at implementation evidence when controls are ready to verify.

## Active Product Decisions

- ESPN recovery routes through `/account`.
- ESPN league selection uses an Account section for MVP.
- Omen preserves safe request context only and waits for the user to click "Run Omen again."
- `espn_import_blocked` remains broad for MVP; later backend work may add safe `reason_code` values.

## Open Security And Privacy Follow-Ups

- Decide whether recovery analytics ship before paid launch.
- Add a lightweight privacy review checklist before paid launch.
- Re-check frontend privacy copy before using any "Probo Verified" language publicly.
