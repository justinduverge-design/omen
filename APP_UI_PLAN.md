# Corvus App UI Plan

This file makes app UI and product experience explicit for Claude Code and Codex.

## Active Build Focus

Corvus is the active product. Claude Code and Codex are expected to help build the full app, not only documentation or isolated prompts.

The current product priority is:

1. App backbone
2. Draft Assistant UI and API foundation
3. MVP Move / Omen of the Week UI and API foundation
4. Supporting fantasy tools
5. Lightweight Slops Saloon landing page

## App Experience Goal

Corvus should feel like a polished fantasy football product, not a loose collection of pages.

The app must have:

- a consistent layout
- clear navigation
- reusable cards and panels
- strong mobile behavior
- trustworthy copy
- loading states
- error states
- empty states
- disconnected platform states
- mock/live data labels where needed
- clear calls to action

## Primary App Screens

### 1. Slops Saloon Landing Page

Purpose: lightweight umbrella doorway.

This page should:

- introduce Slops Saloon as the umbrella brand
- present Corvus as the active flagship product
- link users into Corvus
- avoid building a full media hub

Do not build a blog, CMS, podcast archive, art gallery, or broad content platform during the current phase.

### 2. Corvus Marketing / Entry Page

Purpose: explain Corvus quickly and move users into the app.

Must include:

- what Corvus does
- Draft Assistant free-this-year positioning if public
- MVP Move / Omen of the Week as the premium direction
- trust-building language
- clear CTA

### 3. App Shell / Dashboard

Purpose: shared home for all Corvus tools.

Must include:

- navigation
- tool cards
- user/platform connection status
- dashboard content area
- consistent mobile layout
- reusable loading/error/empty states

### 4. Draft Assistant

Purpose: first-impression tool. Free this year only.

Must include:

- draft setup/start state
- scoring/league context inputs where needed
- recommendation output area
- explanation and confidence language
- mock/live data label
- clear next action
- mobile-friendly layout

Important: Draft Assistant must reuse shared Corvus patterns. Do not build it as a disconnected one-off page.

### 5. MVP Move / Omen of the Week

Purpose: paid centerpiece and weekly personalized recommendation.

Must include:

- disconnected state when platform is not linked
- loading state while analysis is pending
- result state with recommendation, confidence, risk, and evidence
- error state
- clear explanation copy
- no false claim that mock data is live

### 6. Supporting Tools

Supporting tools may include:

- Trade Analyzer
- Start/Sit
- Waiver Wire
- Roster insights
- Platform status

These should follow the same app shell and design language.

## UI Component Priorities

Claude Code should prioritize reusable components such as:

- AppLayout
- Header / Nav
- Sidebar or mobile nav
- ToolCard
- StatusBadge
- FeaturePanel
- LoadingState
- ErrorState
- EmptyState
- DisconnectedState
- RecommendationCard
- ConfidenceMeter
- RiskBadge
- EvidenceList
- CTAButton

## Frontend / Backend Contract Rule

Every UI screen that needs backend data must have a matching backend contract in:

```text
handoffs/frontend-to-backend.md
```

Codex must respond with completed contracts in:

```text
handoffs/backend-to-frontend.md
```

## Claude Code Responsibilities

Claude Code should:

- build app UI
- identify active frontend folders
- create or improve screens
- create reusable components
- wire UI to backend contracts when available
- use mock data only when clearly labeled
- update frontend-to-backend handoffs when backend support is needed

## Codex Responsibilities For UI Support

Codex should:

- provide API routes needed by the UI
- provide stable contracts
- provide mock endpoints before live integrations
- make platform status predictable
- document how Claude Code should call endpoints
- avoid frontend redesign unless explicitly asked

## Definition Of Good App UI

A Corvus screen is good when a user can answer:

1. What is this tool for?
2. What do I do next?
3. Is my data connected?
4. Is this mock, pending, or live?
5. Why did Corvus recommend this?
6. Can I use this comfortably on mobile?
