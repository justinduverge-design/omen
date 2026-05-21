# Slops Saloon / Corvus Context

## Current Priority

Corvus is the main active product.

The current goal is to finish a polished, demoable MVP web/app experience using Claude and Codex as the main workers.

## Product Summary

Corvus is a fantasy football decision assistant under the Slops Saloon umbrella.

Corvus helps fantasy football players make better decisions through:

- Free Trade Analyzer
- Draft Assistant
- Omen of the Week
- Start/Sit and Waiver logic inside Omen
- Future platform connections for ESPN, Yahoo, and Sleeper

## Product Hierarchy

Trade Analyzer is the front door.

Draft Assistant is the couch, food, and entertainment — the seasonal prep experience that keeps users engaged.

Omen of the Week is the main event — the best available weekly move Corvus can find.

Start/Sit and Waiver Wire are not primary homepage features. They are decision paths inside Omen.

## Core Product Idea

Trade Analyzer brings users in.

Draft Assistant helps users prepare.

Omen of the Week helps users win the week.

## Brand Direction

Name: Corvus
Umbrella brand: Slops Saloon
Theme: mythic, ancient, bird/raven/crow, omen-based fantasy football guidance
Tone: confident, sharp, useful, not goofy

## Platform Strategy

ESPN, Yahoo, and Sleeper are all important.

ESPN is essential despite its cookie/auth risk.

The product promise should support all three platforms.

The engineering reality may require platform-specific recovery flows and uneven stabilization work.

## Current Workflow

ChatGPT is the foreman.

Codex is the engineering/backend/repo worker.

Claude is the frontend/product/UX worker.

Gemini Chat is used for second opinions, brainstorming, marketing, and critique.

Local Gemma is parked or used only as an optional private LLM helper.

## Current Infrastructure Boundary

Oracle hosts the Corvus web app / production app lane for now.

Hostinger KVM 2 hosts Ollama/Gemma only for now.

Do not move the Corvus web app to Hostinger unless Justin explicitly approves a future infrastructure change.

## Current Rule

Claude and Codex may recommend next steps, but they should not start the next phase without founder approval.

Every worker must end with a handoff.
