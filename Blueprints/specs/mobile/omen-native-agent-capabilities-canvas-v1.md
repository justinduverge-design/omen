# Omen Native Agent Capabilities & Canvas v1

**Status:** Proposed active operating contract  
**Date:** 2026-07-19  
**Purpose:** Give agents a clear, least-privilege lane for building the native Omen apps without exposing users, production, provider credentials, or store accounts.

## 1. What this secures

This is the operating boundary for native work. It secures two things:

1. **The canvas:** the one visual workspace that tells agents what an approved Omen native experience looks like.
2. **The tools:** the limits on what each role may read, change, test, or release.

This document is policy and repository authority. It does not itself change GitHub, Figma, Supabase, Apple, Google, or deployment-account permissions. Those systems must be configured to match this policy before agents receive access.

## 2. Official native canvas

**Figma file:** [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3)  
**Figma file key:** `mWjrAKPi4JSIP5lAmGAtB3`

Every native task starts on `00 — Start Here`, then reads the needed contract and the latest approved Figma node. The file has these controlled zones:

| Page | Purpose | Who may edit |
|---|---|---|
| `00 — Start Here` | entry point, authority, active rules | founder or design steward |
| `01 — Principles & References` | approved reference analysis; not copyable layouts | founder or design steward |
| `02 — Tokens & Themes` | semantic tokens, platform aliases, theme bounds | design steward after review |
| `03 — Components` | component anatomy, variants, states, accessibility | design steward; implementers may propose |
| `04 — iOS Screens` | approved SwiftUI screen contracts | design steward after iOS review |
| `05 — Android Screens` | approved Compose screen contracts | design steward after Android review |
| `06 — QA & Evidence` | screenshots, state coverage, deviations, decisions | QA/reviewer and design steward |

Screen pages may use only approved tokens and components. A new visual pattern begins as a proposal on `03 — Components`; it does not appear first in production code.

## 3. Role lanes

| Role | May do | Must not do without explicit founder approval |
|---|---|---|
| Founder | choose scope, approve design/security/release decisions, appoint access | delegate their approval implicitly |
| Design steward | maintain Figma, tokens, components, screen contracts, visual reviews | change product scope, secrets, environments, or releases |
| iOS implementer | work in approved iOS scope; test local/dev; attach evidence | access Apple account, signing credentials, production data, or release workflows |
| Android implementer | work in approved Android scope; test local/dev; attach evidence | access Play account, signing keys, production data, or release workflows |
| Backend/security implementer | improve approved API/auth/provider boundaries and safe observability | mutate production, schema, provider credentials, or ESPN mechanics without a separate pin |
| QA/reviewer | run local/dev/device/accessibility checks and record evidence | use real credentials in screenshots/logs, alter production, or approve their own exception |
| Release operator | execute a founder-approved, written release checklist | decide scope, use standing authority, or expose secrets |

One person or agent can cover several lanes on a small task. The approval and evidence gates still apply.

## 4. Capability baseline

All agents receive only the access needed for their assigned PR:

- read the repository contracts, approved Figma nodes, and safe test fixtures;
- create a branch and draft PR;
- run local or development-safe tests;
- attach screenshots, test output, Figma links, and an honest limitation list.

No agent receives standing authority to:

- write directly to `main`;
- deploy, restart infrastructure, edit DNS/Nginx, or alter production flags;
- access or print `.env`, secrets, OAuth tokens, ESPN cookies, service keys, signing keys, or user-provider data;
- access Apple Developer, App Store Connect, Google Play Console, or Supabase production;
- add paid services, dependencies, analytics, or cloud spend;
- change database schema/migrations;
- state that a provider or store path is ready without documented real-device evidence.

Use safe fixtures and demo/reviewer mode for all normal implementation and QA. Never place a secret or raw provider value in code, a Figma note, a screenshot, a URL, test output, analytics, or a pull request.

## 5. Change and approval path

1. The agent reads the native foundation, Design House, delivery governance, onboarding/connection contract, this capability contract, the inbox, and the relevant Figma node.
2. The task names its role lane, allowed files, do-not-touch boundaries, required states, and required evidence.
3. The agent works on a branch and opens a small draft PR.
4. The PR links the exact Figma node(s), contract(s), screenshots, tests, accessibility result, and any deviation.
5. A reviewer checks code/behavior; the design steward checks visual adherence when UI changes.
6. Founder approval is required for a new component, token, provider claim, security exception, production action, or release.
7. Only a separately authorized release operator may perform an approved release.

## 6. Figma integrity rules

- Figma is the visual source of truth; Markdown is the behavioral and governance source of truth; code must follow both.
- No copied competitor screen, brand asset, or proprietary content enters the file.
- Do not use rough reference boards as approval to ship a pattern.
- Component, screen, and token changes need an owner, version/date, purpose, states, accessibility notes, and iOS/Android mapping.
- A Figma edit without a linked contract/PR is a proposal, not approved scope.
- A code change that creates a new visual pattern without a Figma proposal is blocked.

## 7. Technical enforcement checklist

Before granting agent access, the founder or repository administrator should verify:

- `main` requires pull requests and review; no agent has direct push authority.
- environments for development, staging, and production are separate and protected;
- secrets are stored only in the appropriate protected secret store, never repository files or agent prompts;
- deploy and release workflows require protected-environment approval;
- Figma has role-based sharing: only founder/design steward can publish library changes; implementers have the minimum needed edit/comment access;
- Apple/Google store accounts and signing keys remain founder-controlled until a written release assignment exists;
- real-provider test accounts are isolated, consented, revocable, and never copied into artifacts;
- incident/revocation owner is named and can remove an agent's access immediately.

## 8. Stop conditions

Stop, do not improvise, and flag the owner when:

- the required Figma screen/component or API/state contract is missing or conflicts;
- a task needs a new component, token, permission, secret, provider behavior, store setting, or production action;
- a real league/account is needed to verify a path but no safe test plan exists;
- a screenshot/log may expose personal or provider data;
- the native design intent conflicts with an Apple or Android platform behavior.

## 9. Definition of secure progress

Secure progress is a small, reviewable change that a future agent can reproduce from approved contracts and evidence—without receiving more power than the task needs.
