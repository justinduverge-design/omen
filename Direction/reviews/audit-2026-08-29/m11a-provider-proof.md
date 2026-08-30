# M11A — provider shape proof, partial

| | |
|---|---|
| **Status** | **2 of 4 claims cleared.** Claims 1 and 3 (ESPN) need credentials and remain founder-gated. |
| **Date** | 2026-08-30 |
| **Method** | Live read of Sleeper's **public** league endpoint. No credential, no token, no cookie, no write. |
| **League** | The founder's own drafted Sleeper league — the same one used for the 2026-07-29 public read-only proof (`Blueprints/handoffs/2026-07-29-b2d-s3-sleeper-live-proof.md`). Not repeated here. |

**Sanitised per the item's own rule:** no league name, roster, manager identity, cookie, or
token appears below. Only field names, types, and shape.

---

## Claim 4 — Trade personalization inputs, live Sleeper league — **CONFIRMED**

`src/services/tradeLeagueContext.js` resolved real settings only in tests. All three inputs
arrive in the expected shape from a live league:

| Field | Result | Observed |
|---|---|---|
| `roster_positions` | **PRESENT** | `list`, 15 entries, slots `BN DEF FLEX K QB RB TE WR` |
| `scoring_settings.rec` | **PRESENT** | `1.0` (`float`) — full PPR |
| `total_rosters` | **PRESENT** | `8` (`int`) |

Trade personalization's inputs are real. The contract's claim holds as written.

## Claim 2 — Sleeper deadline field — **CONFIRMED, WITH A CORRECTION**

The field exists. **Its type is not what the contract assumed.**

| Field | Observed |
|---|---|
| `settings.trade_deadline` | `11` (`int`) |
| `settings.playoff_week_start` | `15` (`int`) |

**`trade_deadline` is a WEEK NUMBER, not a date.** The data plan's §3 signal is *"Trade deadline
is in 12 days."* Producing that sentence needs a week→date conversion through the NFL schedule;
it is not a subtraction on a timestamp. **Reported as a finding against the contract rather than
worked around**, per the item's own instruction.

## Bonus — a blocker on two other findings is now cleared

Not in M11A's scope, observed while proving Claim 2, and it matters:

| Field | Observed |
|---|---|
| `settings.playoff_teams` | **`6`** (`int`) |
| `settings.playoff_week_start` | `15` (`int`) |

**`F-SCR-02` and `F-VET-03` both rested on "no provider path reads playoff settings."** That is
why `playoffPicture()` hardcodes `settings_known: false` and why the League activity panel can
never populate. **The field is in the league object `sleeperOverview()` already fetches.** For
Sleeper the cut line is computable today — a parse, not an integration.

That does not make the whole activity panel free: the deadline signal still needs the week→date
conversion above, and ESPN remains unproven. But the specific claim that step 2 needs provider
work it does not have is now **wrong for Sleeper**.

## Claims 1 and 3 — ESPN — **NOT CLEARED**

Both need `espn_s2` and `SWID`. Handling those is outside what this session may do, and neither
is inferable from code. **Founder-gated, and they are what remains of M11A.**

- **Claim 1:** does ESPN return per-side projected totals in the `mMatchup` view, and in what shape?
- **Claim 3:** ESPN deadline field on league settings — name and type.

Both are single read-only calls once credentials are present.

## Effect on the beta gates

Abort class 2 — *no provider path unproven against a real connected account* — is **partially
satisfied**. Sleeper's shape claims are proven live. **ESPN's are not**, so the class still binds
at the invitation gate.
