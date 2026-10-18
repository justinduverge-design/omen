# Player-note model bake-off (2026-10-18)

Small models on KVM2 (`model-host`, 7.9 GB RAM, Ollama 0.23.1, `OLLAMA_MAX_LOADED_MODELS=1`), judged by Omen's
production grounding check (`src/services/narrationGrounding.js`). Inputs: 2026 regular-season usage for the 40
RB/WR/TE with the most carries + targets (`facts.sql`, read-only on the warehouse). One model loaded at a time,
temperature 0.2.

| Model | RAM | Grounded | p50 | p90 |
|---|---|---|---|---|
| `qwen3:1.7b` (thinking off) | 1.4 GB | **33/40** | 4.5 s | 5.4 s |
| `gemma3:4b` (current) | 3.3 GB | 31/40 | 8.7 s | 10.0 s |
| `llama3.2:1b` | 1.3 GB | 6/40 | 2.8 s | 3.8 s |

**Pick: `qwen3:1.7b`.** It is as grounded as the 4B model at half the RAM and twice the speed. A full 600-player run is
about 45 minutes instead of about 3 hours. `llama3.2:1b` adds unsupported claims ("target share", "trending").
`gemma3:1b` needs a newer Ollama, which is a host upgrade, so it was not tested.

Findings for the notes job:
- Grounding passes some wrong framings: "10 targets" written for a 10-per-game average, and "WR 14", which slips through
  the position-tag rule. Spot checks stay part of shadow.
- The validator needs the literal "red-zone" in the facts when the text writes "red zone". It also rejects "three"
  when the facts say "3". The script passes aliases for both; fix this in the validator before the job relies on it.

Run: `node bakeoff.js <repo-root> facts.json results.json` (facts from `facts.sql`).
