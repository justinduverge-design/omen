# Omen native interaction and response contract v1

**Status:** Founder-directed authority, 2026-10-16.  
**Applies to:** iPhone first; Android parity is contractual but implementation remains paused.  
**Purpose:** Make every action acknowledge the user's hand immediately, remain honest while work is
in flight, and resolve with restrained tactile and visual feedback.

## 1. Two acknowledgements, never one

Every action has a local acknowledgement and may have an asynchronous result. The local response
must not wait for the network. A spinner is not proof that a tap registered.

| Phase | Required response |
|---|---|
| touch down | visible press/highlight on the same interaction frame |
| touch up | release animation; selection or impact haptic when allowed |
| accepted | selected state, navigation shell, sheet or structured placeholder appears immediately |
| working | originating context stays mounted; duplicate activation is blocked |
| success | result replaces its shaped placeholder in place; success haptic only for a meaningful commit |
| failure | local error and recovery action; error haptic only after an attempted user action fails |

## 2. Haptic vocabulary

| Feedback | Use | Do not use |
|---|---|---|
| selection | tabs, filters, chips, player and team selection | scrolling or focus alone |
| light impact | disclosure, sheet, ordinary primary action | every list-row navigation |
| medium impact | active-league switch, compare, submit a decision request | passive refresh |
| success | connected, saved, copied/shared preparation complete | ordinary page load |
| warning | destructive confirmation boundary or material partial-data acceptance | passive missing evidence |
| error | a user-triggered operation actually failed | disabled taps or background failures |

Haptics are disabled when the system says so and never substitute for visible or spoken feedback.

## 3. Visual response

- Pressed and selected are distinct. Pressed is momentary; selected persists.
- Controls change at least two of fill, border, elevation/shadow, opacity, scale or label emphasis.
- Text actions gain a visible highlight/underline response; opacity alone is insufficient on small text.
- Reduce Motion removes scale/travel but preserves immediate fill, border or emphasis change.
- Loading labels keep their action identity (`Comparing…`, not `Loading…`).
- A control that started work owns the progress indication unless the whole destination is loading.

## 4. Loading and latency

Measure three clocks separately: input acknowledgement, navigation/shell readiness, and truthful data
completion. Record cold and warm samples on the paired physical iPhone before setting an SLO.

- Never wait for a request before acknowledging input.
- No full-screen spinner for section refresh or context switch.
- Use a placeholder shaped like the content that will land.
- Keep independent live sections mounted while another section refreshes.
- Never show the previous league's values under a newly selected league.
- An advisory capability that misses its server budget resolves to named Fog/unavailable evidence,
  not an indefinite spinner inside a delivered answer.
- Stale data remains only when safe, explicitly timestamped and visually distinct.

## 5. Instrumentation

Each measured journey records privacy-safe durations only:

`input_ack_ms`, `shell_ready_ms`, `data_ready_ms`, `outcome`, `screen`, `action`, `cache_state`.

No player, league, roster, provider credential, request body or recommendation content enters timing
events. Signposts are local/test evidence until the in-house telemetry contract explicitly admits
these aggregate fields.

## 6. Acceptance

For every primary journey action: automated state-transition coverage, pressed/selected/loading/error
screens, Reduce Motion, VoiceOver announcement, duplicate-submit proof, injected slow/failure response,
and a physical-device timing receipt. Simulator capture proves composition only.
