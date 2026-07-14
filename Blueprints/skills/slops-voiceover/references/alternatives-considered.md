# Alternatives Considered — slops-voiceover

Researched 2026-07-13 while deciding what to wrap for local VO generation. Recorded here so a future
session doesn't re-research from scratch.

## Wrapped: `jamiepine/voicebox`

MIT license, 41k stars, mature, actively maintained. Local-first (Tauri/Rust desktop app), `POST /speak`
REST endpoint + MCP tool, 7 TTS engines (Kokoro default — 82M params, CPU-only; LuxTTS as a ~1GB-VRAM
upgrade path). No account, no API key, no per-generation cost. Chosen as the sole wrapped tool.

## Considered, not wrapped

### `debpalash/OmniVoice-Studio`

AGPL-3.0. Comparable feature set (voice cloning, 646-language dubbing, real-time dictation) and 8.3k
stars — genuinely good software. **Not wrapped due to AGPL's copyleft terms**: incorporating its code
into a Slops-owned tool likely creates a source-disclosure obligation for the derivative work. Kept as
reference only. If a future need specifically requires its video-dubbing feature (translation + re-voice
+ timing in one pass) and voicebox can't match it, this needs a real legal review before any code is
touched — not a judgment call for an agent to make unilaterally.

### `aidrivencoder/voiceover-generator`

Small (2 stars) Streamlit wrapper around the **ElevenLabs cloud API** — requires an account and a paid
API key. Skipped: cloud-dependent, contradicts the no-paid-dependency-without-CEO-approval rule, and
the sovereignty posture already established elsewhere in this repo (self-hosted Sentry/Umami over SaaS,
open-agreements templates over Termly). Its only reusable idea — a plain-text `<character>`/`<dialogue>`
script tag format — is a pattern, not code, and isn't currently needed since this repo's promo scripts
already use a beat-sheet-with-segment-labels shape.

### `OpenBMB/VoxCPM`

Apache-2.0, 33k stars, legitimate TTS research model (tokenizer-free, multilingual, voice design +
cloning). **Not wrapped in v1** because it's a raw model/library with no bundled REST API or app —
using it would mean building and maintaining our own serving layer, which voicebox already provides for
free. Worth revisiting as an additional engine *inside* a future voicebox-adjacent setup, or if voicebox
itself adds VoxCPM as a supported engine, rather than us building a parallel serving stack.

### `wildminder/awesome-ai-voice`

A curated list of open-source TTS/voice-cloning/music-generation projects, not a tool. Useful as a
starting point if this skill's wrapped tool ever needs to be re-evaluated, but nothing to install or
wrap directly.
