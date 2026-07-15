# Prior-Use Review — slops-voiceover

## 2026-07-13 — Authored, install attempted, generation not yet run

Skill created to close the missing-VO gap `slops-content-ship` found twice on
`Brand/promos/omen-coming-soon/renders/omen-all-users-reel-vertical.mp4`.

Install attempt 1 (Docker): failed. `docker compose up` from a fresh `git clone` hit a trailing-comma
JSON error inside `bunx vite build` referencing `web/../package.json` — but the actual on-disk file at
that exact commit is valid JSON with no trailing comma. Root cause not confirmed; suspected Windows
Docker Desktop build-context/line-ending quirk rather than a real upstream defect. Not investigated
further — switched to the native installer instead of sinking time into someone else's Dockerfile.

Install attempt 2 (native `.msi`): succeeded. `Voicebox_0.5.0_x64_en-US.msi` installed clean, app
launched, local API confirmed live at `http://127.0.0.1:17493` (`GET /health` returned healthy, CPU
backend, no GPU, no model downloaded yet). `GET /profiles` returned `[]` — confirms first-run has no
profile until one is created or a preset engine (Kokoro) is used.

**Corrections applied to SKILL.md from this round:**
- The real REST endpoint is `POST /generate`, not `POST /speak` (README's `/speak` is MCP-tool framing,
  not the REST path — a real gap between marketing docs and the actual API surface).
- Native `.msi` is now the primary documented install path; Docker is flagged as known-broken on Windows
  as of this date, not removed as an option (may work fine on Linux/Mac) but should not be assumed to
  work without re-testing.

**Still open for the next real invocation:**
- Which Kokoro preset voice (or custom profile) Justin actually selects.
- Whether `POST /generate`'s response format matches the Output Contract's assumption of a savable
  audio file (path vs. base64 vs. stream) — verify on first real call, adjust Process Recipe step 2 if
  wrong.

## 2026-07-14 — First real generation, full script, succeeded

**Correction to the 2026-07-13 entry above:** `/speak` is a real endpoint too (confirmed via
`GET /openapi.json`), alongside `/generate` — the prior note that `/speak` was "MCP-tool framing, not
the REST path" was wrong. Both exist; this invocation used `/generate` since that's what the OpenAPI
schema's `GenerationRequest`/`GenerationResponse` models actually document.

**Real request/response shape, confirmed live** (differs from the skill's original guess):
- `POST /profiles` — required to create a usable profile before generating. Kokoro's preset voices are
  not directly callable by `voice_id` on `/generate`; you first `POST /profiles` with
  `{"voice_type":"preset","preset_engine":"kokoro","preset_voice_id":"am_onyx", ...}` to get back a
  `profile_id`, then `POST /generate` takes `{"profile_id","text","engine",...}` — required fields are
  `profile_id` and `text` only.
- Preset voice IDs discovered via `GET /profiles/presets/{engine}` (e.g. `kokoro` → 50 voices,
  `voice_id` values like `am_onyx`, `af_bella`). Chose **`am_onyx`** ("Onyx") for the Omen Narrator
  profile — confident male voice fitting the brand's "sharp, observant, institutional" personality.
- Generation is **async**: `POST /generate` returns immediately with `status:"generating"`; poll
  `GET /generate/{id}/status` (SSE-style `data: {...}` lines) until `status` is `completed` or `failed`.
  First call also passes through a `loading_model` status while Kokoro downloads/loads.
- Completed audio is fetched via `GET /audio/{generation_id}`, not embedded in the status response —
  the Output Contract's "path vs. base64 vs. stream" open question is resolved: it's a separate
  download-by-ID endpoint returning raw WAV bytes.
- Response `duration` field is accurate — used directly to compute Remotion frame timing rather than
  re-measuring the files.

**Real problems hit and fixed, for the next session's benefit:**
1. **Docker Desktop build failure** (see 2026-07-13 entry) — worked around via native `.msi`, root
   cause never confirmed.
2. **Windows HuggingFace Hub symlink bug.** First generation attempt failed with
   `[Errno 22] Invalid argument` on the Kokoro model's cached `config.json` — the file was a broken
   symlink (`ls -la` showed `lrwxrwxrwx ... -> ../../blobs/<hash>`, and `file` reported "broken symbolic
   link") even though the target blob existed and Windows Developer Mode was already enabled (so it
   wasn't a missing-privilege issue — cause still not fully confirmed, possibly the process token not
   having refreshed the privilege, or an unrelated HF Hub/Windows quirk). Fixed by deleting the cached
   model folder (`C:\Users\<user>\.cache\huggingface\hub\models--hexgrad--Kokoro-82M`) and retrying —
   the re-download and re-symlink succeeded cleanly. **If this recurs:** clear that cache folder first
   before assuming it's a Developer Mode / privilege problem.
3. **Self-inflicted shell-quoting bug**, not a voicebox issue: a Bash loop using
   `"$DEST\$NAME.wav"` inside double quotes let `\$` escape to a literal `$`, so all 6 batch downloads
   silently overwrote one wrongly-named file (`vo$NAME.wav`) instead of writing 6 distinct files. Caught
   by checking `ls` output against the expected file count, not by trusting the loop's own echoed
   "success" lines. Fixed by using forward-slash paths (`$DEST/$n.wav`) instead of backslash paths in
   Bash on Windows, which sidesteps the escaping trap entirely.

**Outcome:** all 7 script segments generated successfully (1.98s–5.9s each), downloaded as valid WAV
files (16-bit PCM mono 24kHz) into
`Brand/promos/omen-coming-soon/public/audio/vo/`, and wired into the `OmenAllUsersReel` Remotion
composition via one `<Sequence>`+`<Audio>` per segment. Scene frame timing was rebuilt from the real
measured durations rather than the earlier words/sec estimate. Re-rendered and re-verified via 12 frame
stills spanning every scene boundary — no visual regressions from the retiming.

**Not yet verified:** actual audio quality/tone/pacing — Claude cannot listen to audio, so whether the
Onyx voice actually fits the brand and reads naturally against the visuals is still Justin's call, not
confirmed here.

**Fix to apply to SKILL.md's Process Recipe** (not yet applied, flag for next revision): step 1 should
explicitly say "create a profile via `POST /profiles` from a preset first, `/generate` cannot take a
raw preset `voice_id` directly" — the current wording implies presets are directly callable on
`/generate`, which is wrong.
