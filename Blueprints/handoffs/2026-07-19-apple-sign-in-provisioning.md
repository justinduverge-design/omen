# Apple Sign in Provisioning — 2026-07-19

## Outcome

Founder provisioning for Omen's Apple authentication is complete:

- The explicit iOS App ID `com.slopssaloon.omen` is enabled for Sign in with Apple and is the primary App ID.
- The web Services ID `com.slopssaloon.omen.web` is associated with that primary App ID.
- The Services ID registers the Omen Supabase project domain and its `/auth/v1/callback` return URL.
- Supabase's Apple provider is enabled with the Services ID first and the native App ID second in its client-ID list.

## Security boundary

- No private key, generated Apple OAuth secret, Supabase secret, or user credential is stored in this repository, handoff, chat record, or build configuration.
- The Apple `.p8` signing key remains founder-controlled in secure storage. The generated OAuth secret remains only in the Supabase provider dashboard.
- The OAuth secret must be rotated before its six-month expiry. Set a calendar reminder for **2027-01-19** and retain the `.p8` file securely for rotation.

## What this does not mean

- This is provider provisioning, not a signed iOS build, TestFlight release, App Store submission, or real-device verification.
- Native iOS code wiring and macOS CI validation remain separate authorized work.
- Google Credential Manager and email-OTP implementation remain owned by the M3-A Android workstream.
- Yahoo, Sleeper, and ESPN connections remain out of scope.

## V2 discovery note

The broader Apple capability catalogue shown during App-ID setup is a **V2 research item**. Before enabling any additional entitlement, assess the user problem, App Review requirement, privacy/data flow, server dependency, battery impact, cost, and a clear no-go alternative. No additional Apple capability is approved or enabled by this provisioning step.
