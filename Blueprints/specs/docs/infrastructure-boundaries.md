# Spec: Infrastructure Boundaries

## Status

Active

## Decision

Oracle remains the Omen web app hosting lane for now.

Hostinger KVM 2 remains the Ollama/Gemma private AI engine lane for now.

Do not move the Omen web app to Hostinger unless Justin explicitly approves a future infrastructure change.

## Current Infrastructure Roles

### Oracle VPS

Role:
- Omen web app / API hosting lane
- Existing deployment lane

### Hostinger KVM 2

Role:
- Ollama/Gemma private LLM host
- AI engine experimentation

Not current role:
- Omen production app host
- DNS cutover target
- all-in-one app + LLM box

## Rationale

Hostinger KVM 2 has limited resources for both the production web app and local LLM inference.

Ollama/Gemma can spike CPU/RAM and may affect app stability if hosted together.

The app should remain stable while Omen is still being finished locally.

## Future Option

A later upgrade to Hostinger KVM 8, AWS, or another server may allow app + LLM consolidation.

That is a future decision, not an active task.

## Forbidden Without Explicit Approval

- Move app from Oracle to Hostinger
- Plan Hostinger app cutover
- Change DNS
- Change SSL/TLS
- Change Nginx
- Change production secrets
- Enable cron on Hostinger
- Expose Ollama publicly

## Allowed

- Document future infrastructure options
- Keep Hostinger LLM private
- Keep Oracle deployment lane intact
- Build local MVP readiness
