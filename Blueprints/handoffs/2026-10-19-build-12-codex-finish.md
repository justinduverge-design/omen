# Build 12: handoff to Codex (2026-10-19)

## Closeout (2026-10-20)

This handoff has been executed through #762. Treat the original checklist below as historical context, not
the current queue.

- #760 shipped the light stacked lockup, removed forced-dark sign-in, added Qwen's native Ollama chat path
  with thinking disabled, and passed a production-shaped probe on the private model host.
- Production still uses `gemma3:4b`. Activating `qwen3:1.7b` is a separate production-setting decision; it
  is not a Build 12 binary gate.
- #761 repaired the accessibility and stale UI-test gates, put the report control in the Desk flow after
  Ledger, made Omen calls usable across Sleeper, Yahoo and ESPN when provider projections are absent, added
  ESPN late-listing background recovery, and completed the Trade fields.
- #762 recorded the final Trade response fixtures. Merge `36835f11` deployed successfully in run
  `39473388464`, including backend tests, contract verification, health smoke and visual canary.
- Deferred beyond this finish: the move follow-through write route and support/report delivery workflow.
- Remaining release gate: install the final signed build on the founder's iPhone, complete the Build 12
  device walk, then upload the proven archive to TestFlight.

## Where things are

- **Repo:** `/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen`
- **Build 12 worktree:** `/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen/.claude/worktrees/build-12`
  - Work there.
  - `Config/Local.xcconfig` is a symlink to the main checkout's copy, and is gitignored.
  - `node_modules` is a real install.
- **Branch:** everything up to #758 is merged to `main` and deployed (KVM1, deploy workflow green).
  - Start from `origin/main` with a new branch, e.g. `git checkout -B build-12/codex-finish origin/main`.
  - Open one PR and merge on green. A merge to `main` deploys the API automatically.
- **Build package:** `Direction/release/builds/build-12.md`.
- **Canvas and build sheet:** `design/whole-app-canvas-2026-10-19/BUILD.md`.
  - Its provider parity table must stay all "yes".
  - Published canvas: https://claude.ai/artifact/Gwu93gZJUCzG87GRUrp2vS
- **Founder's iPhone:** UDID `00008120-001A284E02C0201E`. Install a Release build after native changes:
  - `xcodebuild -configuration Release -destination id=<UDID> -allowProvisioningUpdates`
  - `xcrun devicectl device install app`

## Original finish list (historical)

1. **Logo:** light-mode stacked lockup. See the prompt below.
2. **Narration model:** switch to qwen3:1.7b.
   - Before switching, test it on the model host (`100.67.187.57:11434`, over Tailscale from KVM1). qwen3 has a "thinking" mode that can use up `max_tokens` (90) before it answers. If so, disable thinking (`/no_think` in the prompt, or the server's think option) or pick `llama3.2:1b`.
   - Then, on KVM1, back up `/opt/omen/deploy/hostinger/.env.production` (root-owned, needs sudo).
   - Set `LLM_MODEL=qwen3:1.7b`.
   - Run `sudo docker compose -f docker-compose.prod.yml up -d --no-deps api`.
   - Confirm that the second view of a move shows a live write-up, and that no `narration_breaker_opened` lines appear in `docker logs omen_api`.
3. **Accessibility audit:** 73 issues, mostly Dynamic Type. `PerformanceJourneyUITests/testAccessibilityAuditEveryTab` must reach 0.
4. **Stale UI tests that fail on main:**
   - the two report-pill tests in `ChromeInteractionUITests`;
   - `J1InteractionUITests/testNoLeagueTerminusIsNotADeadEnd`, which asserts a "See how Omen decides" button removed in #637.
5. **ESPN late-listed leagues:** when ESPN lists only some of a new login's leagues, the server should keep checking and follow the rest itself. Today the user taps "Check again".
6. **Backend gaps, recorded in BUILD.md:**
   - "I made the move / Not this week" needs a follow-through write route.
   - Trade "the catch" needs a server field.
   - Forward trade horizons need a compare field.
7. **Then:** run the device walk in `build-12.md` "To test once the canvas and screens are fixed", then upload to TestFlight.

## Rules that bite

- **Provider parity:** Sleeper, ESPN and Yahoo get the same thing. No screen ships otherwise.
- **The "draft" rule:** no native string may contain "draft" (`DraftClaimAbsenceTests`).
- **Primitives:**
  - App code uses Omen primitives only, never raw `Button(` (`PrimitiveEnforcementTests`). `OmenTappableCard` exists for whole-card taps.
  - Colour tokens have iOS and Android twins: `node scripts/check-token-parity.js` must pass, and so must the Android `OmenColorTest`.
- **Contract fixtures:** re-record with `node scripts/contract-recorded.js record` when a response shape changes.
- **Biome:** `npx -y @biomejs/biome@2.5.15 format --write .` before pushing.
- **Secrets:** never log or print secrets, tokens, ESPN cookies or league ids.

## Prompt for the logo

> Work in the Build 12 worktree at
> `/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen/.claude/worktrees/build-12`, on a new branch from `origin/main`.
> The iOS app now has light mode (Account › Appearance), but the stacked logo
> `mobile/ios/OmenIOS/OmenIOS/Assets.xcassets/OmenLockupStacked.imageset/omen-lockup-stacked.svg` is a single
> cream-on-dark asset (wordmark `#F5F0E8`). On the light ground (`#F6F6F4`) the wordmark disappears, so
> `App/Auth/SignInView.swift` currently forces `.preferredColorScheme(.dark)`.
>
> 1. Add a light-appearance variant to the imageset: the same lockup with a dark wordmark (`#161614`) and the
>    brass ball unchanged. Use `appearances` / `luminosity: light` in `Contents.json`, keep
>    `preserves-vector-representation`, and check the other lockup assets (e.g. horizontal) the same way.
> 2. Remove the forced dark from `SignInView` and confirm sign-in looks right in Dark, Light and Match iPhone.
> 3. Check every screen in light mode for any other image or asset drawn for dark only, and fix it the same way.
> 4. Run the iOS unit tests and `PrimitiveEnforcementTests`, take light and dark simulator screenshots of sign-in,
>    install a Release build on the founder's iPhone, open one PR, and merge on green.
