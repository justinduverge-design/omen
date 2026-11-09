# Synthetic held-out narration shadow (B13-SMALL-MODELS)

This independent five-case fixture was written for this evaluation and was not part of the 40-player
2026 bake-off input. It contains invented, bounded counts and no people, league, provider or user data.
The task is deliberately narrow: classify a change in synthetic carries as increased, decreased or unchanged. It does not measure general
narration quality or prove that the grounding validator catches every semantic error. Agreement with the deterministic classification is
required in addition to grounding because that validator can accept incorrect framing. The deterministic
classification is always the fallback. Nothing consumes the output as a recommendation.

Run manually on a machine with the model already installed and a local loopback model service:

```sh
node scripts/research/small-model-shadow/worker.js > receipts.json
```

No endpoint, model, prompt, input or output path can be configured by the caller. The process makes at most
five sequential requests with a 30-second timeout each. It does not schedule itself or connect to a database.
The JSON output is the only receipt store; choose a local, access-controlled destination. Each receipt records
input class and hash, accepted output or null, deterministic fallback, grounding and exact agreement, latency,
failure category, and human action (initially false). Model resource use is null because this client cannot
measure host memory; do not infer it from process memory. Rejected model text and transport errors are not
stored. A nonzero exit indicates transport failure, timeout or HTTP failure; inspect all receipts for rejected
outputs as well. This is synthetic experimental evidence only, not customer-facing text.

## Runner evidence, 2026-11-09

A loopback model-service availability probe failed with `EPERM` in this runner's network sandbox. The
five-case worker was run: 0 accepted, all five `host_unavailable`; no model response was received.
Model installation, quality, latency and memory are therefore **not measured**. This is a blocked evaluation,
not a zero-quality score or evidence that the model is absent. Re-run the command on an authorized local
host and assess the resulting receipts before any activation decision. No host, credentials, provider data,
scheduler, production configuration or database was changed.

The separate narration evaluation uses three synthetic held-out decisions and the existing grounding gate:

```sh
node scripts/research/small-model-shadow/narration-eval.js > narration-receipts.json
```

Grounding is a lexical check, not a semantic quality judgment. Agreement remains null until a human reviews
accepted output against its facts and deterministic fallback; resource use remains unmeasured. The same runner
restriction prevented this evaluation from obtaining model output. No quality, latency or memory claim follows.

The narration run produced three `request_failed` receipts and zero model responses. The focused shadow test
passed. `npm test` showed failures before it stalled, and `npm run contracts:check` did not finish; both were
interrupted in this runner and are not passes. Independent review: pass for the experiment and its documented
blocked status; a live model evaluation is still required.
