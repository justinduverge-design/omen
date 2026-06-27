# Phase 3.12 Research - KVM2 Gemma Bridge

Date: 2026-06-27

## Question

How should Omen safely wire the existing optional local narration bridge toward KVM2 Ollama/Gemma without exposing the model server publicly or making the recommendation route depend on it?

## Sources Checked

- Tailscale 100.x addresses: https://tailscale.com/kb/1015/100.x-addresses
- Tailscale MagicDNS: https://tailscale.com/kb/1081/magicdns
- Ollama OpenAI compatibility: https://docs.ollama.com/openai

## Findings

- Tailscale device addresses live in the CGNAT `100.64.0.0/10` range. That range is not the public Internet, so it is an appropriate allowlist target for a KVM1 -> KVM2 bridge.
- MagicDNS gives devices stable tailnet DNS names under Tailscale-managed naming. Allowing private-style suffixes such as `.ts.net` and `.tailnet` lets the app support the intended private route without committing any real host name to git.
- Ollama provides OpenAI-compatible chat completions, so Omen can keep the existing `/v1/chat/completions` request shape and avoid a package change.
- The bridge should stay optional. If `LLM_BASE_URL` is absent, invalid, or public, Omen should keep deterministic/template narration rather than failing the recommendation route.

## Decision

Use the existing `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_TIMEOUT` env interface, but accept the base URL only when it resolves to:

- `localhost`
- private IPv4 ranges: `10/8`, `127/8`, `169.254/16`, `172.16/12`, `192.168/16`
- Tailscale CGNAT: `100.64/10`
- private IPv6 loopback / ULA / link-local prefixes
- private-style DNS suffixes: `.internal`, `.lan`, `.local`, `.home.arpa`, `.tailnet`, `.ts.net`

Public or malformed URLs fail closed: no fetch is attempted, no URL is exposed by status routes, and recommendation behavior falls back to the existing non-LLM path.

## Evidence Pointer

Implementation commit: `fbbf0c5` (`feat: harden private llm bridge`).

