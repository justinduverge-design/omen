# Upstream vetting — `slops-voiceover` / voicebox

**Vetted 2026-09-14 · Verdict: POSTURE IS ALREADY CORRECT. No change, no install, no pass needed
beyond recording this.**

## The upstream

| | |
|---|---|
| Licence | **MIT** |
| Stars / forks / issues | 53,262 / 6,655 / 688 |
| Created / last push | 2026-01-25 / 2026-08-09 |
| Repo | `jamiepine/voicebox` |
| Pinned | `voicebox@v0.5.0` — already pinned to an exact tag |

## Against our constraints

**facts-of-record #17. PASS, and it is the strongest fit in the catalogue.** From the upstream's own
README: *"a **local-first** AI voice studio"* and *"**Complete privacy** — models, voice data, and
captures never leave your machine."* The refinement LLM is a **bundled local Qwen3** (0.6B/1.7B/4B)
sharing the TTS runtime, not an API call. It is explicitly positioned as the self-hosted alternative
to ElevenLabs and WisprFlow — the cloud incumbents.

That is the same architecture #17 already mandates elsewhere (local Ollama for beta reports).

**No paid fallbacks. PASS**, and the wrapper enforces it in the right place: *"If voicebox is
unavailable, stop and report; do not fall back to a cloud service without Justin's explicit
approval."* That is the correct failure mode written down before it was needed.

## Does it earn its place?

**Yes, and it is already correctly scoped.** It closes a gap `slops-content-ship` kept finding —
promo videos shipping with a written VO script and no recorded audio — and it refuses to paper over
that gap with synthesized placeholder audio, citing the 2026-07-13 retro on why placeholders are not
acceptable as final.

## Why this one needs no install pass

**Detect-only is the design, not a limitation.** Voicebox is a Tauri **desktop application**, and the
recorded install is a native Windows `.msi` (`Voicebox_0.5.0_x64_en-US.msi`) on a different machine —
the Docker path was tried first and hit an upstream build failure, documented honestly in the skill.

So on this Mac the probe will report `NEEDS-INSTALL` **permanently and correctly**. That is not a
broken state to be fixed by installing something; it is an accurate statement that the voicebox host
is elsewhere. The loopback-only probe (`http://127.0.0.1:17493/health`) answers *"is it running
here, right now"*, which is the only question that matters at invocation time.

**This is the cleanest example of the checker's own limit:** `NEEDS-INSTALL` is an answer about this
machine, not a verdict on the skill.

## What we would change

**Upstream:** nothing. The Docker build failure is worth reporting if it reproduces on a clean
checkout, but the notes suggest a Windows Docker Desktop build-context quirk rather than a real
defect, and nobody has confirmed that.

**Local deltas: none required.** This wrapper already does what every other one in this pass had to
be corrected toward — it pins an exact version, names its install boundary, records the install
method actually used and the one that failed, dates its live confirmation, and states its no-cloud
failure mode. **It should be the reference example for wrapper authoring.**

One addition only: note that the probe is loopback-only by construction, so a dependency check can
never become egress.
