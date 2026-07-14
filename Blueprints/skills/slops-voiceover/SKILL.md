---
name: slops-voiceover
description: Governed wrapper around voicebox (local, MIT-licensed AI voice studio) that turns an approved promo/marketing script into real recorded voiceover audio. Use when a video render has captions/VO-script but no actual spoken audio track, or when Justin asks to "record the VO," "generate voiceover," or "add real audio to the video." Detects voicebox, never installs it. Does not touch app code.
status: active
skill_type: wrapper
layer: 2
default_agent: Claude
trigger: none
version: 0.2.0
upstream: voicebox@v0.5.0
owner: Justin
---

# Slops Voiceover

## Purpose

Close the gap `slops-content-ship` keeps finding: promo videos ship with a written VO script and
captions, but no recorded VO audio. This skill fronts `voicebox` (jamiepine/voicebox, MIT, local-first,
Tauri desktop app) to turn an approved script into real audio files, using its `POST /generate` REST
endpoint (confirmed live 2026-07-13 against the native Windows install — the README's `POST /speak`
is MCP-tool naming, not the REST path) or its `voicebox.speak` MCP tool. It does not write, revise, or
approve the script — that happens before this skill runs.

## When to Use

- A promo/marketing video composition has an approved script but the render is captions-only or has
  only an instrumental bed (no spoken VO).
- Justin asks to "record the VO," "generate voiceover for [video]," or "add real audio."
- `slops-content-ship`'s Voiceover dimension has already flagged a cut as FAIL for missing VO and the
  fix is to actually produce the audio (not to fake it with a synthesized placeholder — see
  `Direction/decision_log.md` 2026-07-13 retro on why placeholder/generated audio is not acceptable
  as final).

## Do Not Use

- To write or revise the script — that's a drafting task (`marketing:draft-content`,
  `slops-screenplay-loop`).
- To QC the resulting audio's fit/pacing against the video — hand off to `slops-content-ship`
  afterward; this skill only produces the audio file(s).
- To install, update, or configure voicebox — detect only; installation is Justin-gated (see
  Preconditions & Dependencies).
- For anything requiring a cloud TTS API, an account, or a per-generation cost — that contradicts the
  self-hosted/no-paid-dependency posture this skill exists to satisfy. If voicebox is unavailable,
  stop and report; do not fall back to a cloud service without Justin's explicit approval.

## Required Inputs

- The approved script, in the beat-sheet-with-segment-labels shape used in this repo's promo scripts
  (each beat/segment's VO line as plain text), or a plain-text script if the video has no per-segment
  structure.
- A voice profile name already configured in the user's local voicebox install (this skill does not
  create voice profiles — that's a one-time setup step Justin does in the voicebox app itself).
- The target promo project path (e.g. `Brand/promos/omen-coming-soon/`) so output lands next to the
  Remotion composition that will consume it.

## Preconditions & Dependencies

- **Runtime:** voicebox running locally, reachable over its REST API (default port per voicebox's own
  docs) or via its MCP server if the invoking agent has voicebox configured as an MCP client.
- **Upstream:** `voicebox@v0.5.0` (pin recorded above; re-review this skill before bumping when
  voicebox releases a new version).
- **Install method actually used (2026-07-13):** native Windows `.msi`
  (`Voicebox_0.5.0_x64_en-US.msi`, from `github.com/jamiepine/voicebox/releases/v0.5.0`) — the Docker
  path was tried first and hit an upstream build failure (`web/../package.json` trailing-comma error
  inside the `bunx vite build` step, cause not fully root-caused; looked like a Windows Docker Desktop
  build-context quirk rather than a real file defect, since the on-disk `package.json` is valid JSON).
  The Docker checkout at `C:\Users\JDuve\dev\tools\voicebox` (pinned to the v0.5.0 commit) was kept for
  reference/upstream-diffing but is not the running instance.
- **Confirmed live 2026-07-13:** `GET http://127.0.0.1:17493/health` → `{"status":"healthy",
  "model_loaded":false,"backend_type":"pytorch","backend_variant":"cpu","gpu_available":false}` — CPU
  backend, no GPU, no model downloaded yet at that point. Confirms Kokoro (CPU-only) as the correct
  default engine, not an assumption.
- **Install boundary — this skill never installs voicebox.** Detect first:
  ```bash
  curl -sf http://127.0.0.1:17493/health 2>/dev/null || echo "voicebox not reachable"
  ```
  If not reachable, stop and report the exact install options to Justin, do not proceed:
  - Native binary (confirmed working): `https://github.com/jamiepine/voicebox/releases/download/v0.5.0/Voicebox_0.5.0_x64_en-US.msi` (543 MB)
  - Docker: `docker compose up` from a fresh clone — **known-broken as of 2026-07-13** on Windows Docker
    Desktop, see note above; do not assume it works without re-testing.
  - Linux: build from source per `voicebox.sh/linux-install` (no prebuilt binary yet as of v0.5.0)
- **Voice profile setup is manual and out of scope.** `GET /profiles` confirmed empty on first install.
  Kokoro ships 50 curated preset voices selectable in the app's Generation tab without recording a
  custom sample — first generation triggers an automatic model download. If no profile/preset is
  chosen yet, stop and ask Justin which preset or custom profile to use.
- **Network/credentials:** none beyond localhost — voicebox runs fully local, no API key, no account,
  no outbound network call for generation itself.

## Read-First Procedure

1. Read the approved script/beat-sheet for the target promo project.
2. Confirm voicebox is reachable (see detection command above). Stop if not.
3. Confirm a voice profile name was specified. Stop and ask if not.
4. Do not read app source, secrets, or anything outside the target promo project directory and its
   audio output path.

## Process Recipe

1. **Create a voice profile first if one doesn't exist.** `POST /generate` cannot take a raw preset
   `voice_id` directly — it requires a `profile_id`. If using a Kokoro preset (not a custom cloned
   voice), list options via `GET /profiles/presets/kokoro`, then `POST /profiles` with
   `{"name","voice_type":"preset","preset_engine":"kokoro","preset_voice_id":"<id>","default_engine":
   "kokoro"}` to get back the `profile_id`. This is a one-time step per voice, not per generation.
2. For each script segment (or the whole script, if ungated), call `POST /generate` with
   `{"profile_id","text","engine":"kokoro"}` (required fields: `profile_id`, `text`), using the
   **Kokoro** engine by default (82M params, CPU-only, no GPU requirement) unless Justin specifies a
   different engine (e.g. LuxTTS for ~1GB-VRAM higher quality). Generation is **async** — the response
   returns `status:"generating"` immediately; poll `GET /generate/{id}/status` until `status` is
   `completed` or `failed` (expect a `loading_model` status on first use while the engine downloads).
3. Fetch each completed segment's audio via `GET /audio/{generation_id}` — this is a separate
   download-by-ID call, not embedded in the status/generate response. Save each downloaded file to
   `<promo-project>/public/audio/vo/<segment-slug>.wav` (or `.mp3` — match whatever format voicebox
   returns). One file per segment is the default; a single combined
   file is an option if the composition's timing is simpler to drive that way — state which shape was
   chosen and why.
4. Report the exact file paths produced, the engine and voice profile used, and total audio duration
   per segment (for matching against the Remotion composition's frame timing) — use the response's
   `duration` field directly rather than re-measuring the file.
5. Wiring the audio into the Remotion composition (via `<Sequence from={frame}><Audio src=.../></Sequence>`
   per segment, with scene frame timing rebuilt from the real durations) is a code-edit task outside
   this skill's own scope, but is the natural next step once files are produced — hand the file list
   back with durations so timing isn't assumed.
6. Recommend running `slops-content-ship` against the next render to confirm the Voiceover dimension
   now passes.

## Output Contract

- Target path(s): `<promo-project>/public/audio/vo/*.{wav,mp3}`.
- One file per script segment (default) or one combined file (if chosen) — state which.
- Report: engine used, voice profile used, per-file duration, and the exact voicebox call made per
  segment (so it's reproducible).
- What was intentionally not touched: the Remotion composition/source code, the script itself, any
  voice-profile configuration.
- Next safe step: wire the returned file(s) into the composition's `Audio` track (a code-edit task,
  not this skill), then re-run `slops-content-ship`.

## Verification

- **Smoke test:** generate one short segment's audio and confirm the output file exists, is non-empty,
  and its duration is within expected range for the text length (~2.5-3 words/sec speaking rate as a
  sanity check, consistent with the caption-pacing norm `slops-content-ship` already uses).
- **Success signal:** audio file(s) exist at the stated path, non-zero size, and duration is plausible
  for the input text length.
- **Escalation:** if voicebox is unreachable, or returns an error, or a voice profile is missing, stop
  and report — do not retry with a different (cloud, paid, or synthesized-placeholder) fallback without
  Justin's explicit approval.

## DBS Routing

- Generated audio → `<promo-project>/public/audio/vo/` (e.g. `Brand/promos/omen-coming-soon/public/audio/vo/`).
- This skill's own doctrine → `Blueprints/skills/slops-voiceover/`.

## Boundaries

- No app code, secrets, payment, auth, or deployment access.
- No installation of voicebox or any other tool — detect only, stop with instructions if missing.
- No cloud/paid TTS fallback without explicit approval.
- Does not create or edit voice profiles — that's a manual one-time step in the voicebox app.
- Does not edit the Remotion composition or any render source.

## Failure Modes

- Treating "voicebox is installed" as equivalent to "a usable voice profile exists" — check both.
- Silently falling back to a cloud TTS API or a synthesized placeholder tone when voicebox is
  unreachable — this repeats the exact "placeholder audio treated as final" mistake logged in the
  2026-07-13 retro. Stop and report instead.
- Generating audio without checking segment duration against the Remotion composition's existing
  frame timing — mismatched duration will desync captions from speech.
- Auto-installing voicebox to "just get it working" — never do this; stop at the install boundary.

## Prior-Use Review Loop

Check `notes/prior-use-review.md` before revising. This is a new skill with no real invocation yet;
its first real run should be logged there.

## Changelog

- 0.2.0 — Process Recipe corrected after first real invocation (2026-07-14): profile-creation-first
  requirement, async generation + polling, and separate `/audio/{id}` download step now documented
  correctly — see `notes/prior-use-review.md` for the full troubleshooting log.
- 0.1.0 — Initial wrapper, pinned to `voicebox@v0.5.0`. Authored to close the missing-VO gap
  `slops-content-ship` surfaced on `Brand/promos/omen-coming-soon/renders/omen-all-users-reel-vertical.mp4`.
