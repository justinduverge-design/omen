# Skill dependency checker + `slops-taste` vetting — 2026-09-14

## Status

Complete locally on `tooling/skill-dep-checker` in **both** repos (L0 and Omen). Nothing pushed,
merged, or deployed. No app source, token file, SQL, secret, or provider config touched.

This is a **cross-layer** change: 17 files in L0, 4 in Omen.

## What changed

### 1. New tool — `Blueprints/tools/skill-link/check-skill-deps.mjs` (L0)

Answers whether the external tool a wrapper fronts is actually present. Same CLI shape as
`link-skills.mjs`: `--check` (exit 1), `--json`, `--skill=<name>`, `--target=L0|L2|all`.

Probes are declared per skill in a new `requires:` frontmatter block. Kinds: `bin`, `python-module`,
`node-module` (+`from:`), `path`, `skill`, `http`.

**Three properties that are load-bearing:**

- **Never installs.** Founder boundary, unchanged.
- **Never probes off this machine.** `http` refuses any non-loopback host rather than fetching it,
  so a dependency check cannot become egress (facts-of-record #17). Tested.
- **Never guesses.** A `wrapper`/`package` with an upstream and no `requires:` reports `UNDECLARED`
  and fails `--check`. It surfaces an install hint from prose, labelled unverified, and will not
  synthesise a probe from it — guessing and reporting `ready` would make it the thing it catches.

`upstream:` alone was not enough to probe on: it carries both the fronted tool and plain provenance
("Adapted from mattpocock/skills (MIT)"). `skill_type` discriminates — `wrapper`/`package` vs
`simple`. That cut 18 flags to 9 real ones.

### 2. `slops-taste` vetted, installed, and split (L0)

MIT, 87k stars, last push 2026-08-24, pinned to `ccbc15639c97`. Payload is prose — no SDK, no
runtime, no telemetry, no network call. **facts-of-record #17 passes clearly.** The installer is a
second upstream (`vercel-labs/skills`, MIT, two deps) and is now named in the wrapper.

**The upstream cannot serve native.** Its own scope line excludes multi-step product UI, and it
carries zero SwiftUI/Compose material (React 32 / Motion 52 / Tailwind 12 / SwiftUI 0 across 1,206
lines). Per the founder's requirement that taste work on native *and* web, the skill now has §A
(web → upstream) and §B (native → written here, routing to the locked native specs). §B invents no
doctrine; every rule derives from a locked spec or a defect a real canvas pass caught.

Dials replaced: the old `VARIANCE: medium | MOTION: low | DENSITY: medium` used invented aliases and
word values against upstream's 1–10 integer scale, under a comment claiming `brand-system.md` was
unauthored. It would have bound nothing. Now two sets — web `6/3/4`, native `2/2/6`.

Full review: `Blueprints/skills/slops-taste/notes/prior-use-review.md`.

### 3. Corrections

- **Retired tagline in three files**, not the one previously reported: `slops-ux-copy` (as
  *approved*), `slops-explainer-cut` (as *"the brand promise"*), and
  `slops-animation-render/assets/storyboard-template.md` — where it was a **template's** CTA line and
  propagated into every storyboard copied from it.
- **`slops-mobile-smoke` asserted a false dependency** — `playwright-core` "already vendored… No
  install required" when it is in neither `node_modules` nor `package.json`. Corrected in both the
  frontmatter and Preconditions; `_template` gained the rule.
- **Omen skill bundles** (`current_sprint.md`) named bare `slops-taste` for native, and named
  web-only `slops-mobile-smoke` for native. Both corrected.

### 4. `link-skills.mjs` would have silently uninstalled taste — fixed

Found only by running the full gate sweep after committing. `npx skills add` installs into
`.claude/skills/`, the directory `link-skills.mjs` manages, and its orphan sweep deleted anything it
had not created. **One routine apply run would have removed the four taste variants**, flipping
`slops-taste` back to `NEEDS-INSTALL` with nothing to explain why — the two tools taking turns
undoing each other.

Ownership is now decided by where a link **resolves**, not by its name: outside `Blueprints/skills/`
reports `FOREIGN` and is left alone. Proven against the destructive path — a real apply run leaves
all four in place and the checker still reads READY 4/4.

**Worth noting as a pattern:** `--check` reported this as 4 × `ORPHAN` and exit 1, which reads as
routine drift. The severity was only visible by asking what apply mode would *do* with that finding.

### 5. Follow-on — `X5-VetWrappers` minted (READY, P2)

Six vetting passes for the remaining unmet wrappers, each with the question it must answer.
`slops-mobile-smoke` is first and its question is **should it exist** before **should we install it**.

## Verification

| Check | Result |
|---|---|
| `check-skill-deps.mjs --check` | ready 2 · needs-install 7 · **undeclared 0** · provenance 9 · self-contained 44 → exit 1 (correct: 7 genuinely absent) |
| `check-skill-deps.mjs --skill=slops-taste` | **READY** 4/4 after install |
| `node scripts/check-kickoff-drift.js` | PASS |
| `link-skills.mjs --check` | **SKILL-LINK: OK** — 122 in-sync, 0 drift, 4 FOREIGN left alone (after the fix; 4 ORPHAN before it) |
| `node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet` (from L0 root) | see below |
| `node ../../Blueprints/tools/valor-brain/validate.mjs` | see below |
| `node scripts/check-sprint-staleness.js` | ran — only the 13 pre-existing standing findings |
| `npm test` | **NOT RUN — no source changed.** Docs and one new standalone tool only. |

Tool guards tested: non-loopback probe refused not attempted · optional-only misses → `READY*` ·
our own `link-skills.mjs` symlinks not counted as an upstream install · wrong dir → exit 2 ·
unknown `--skill` → exit 2 · report-only → exit 0 · `--check` with findings → exit 1.

## Limits — what this does not prove

- **`READY` means found, not functional.** Nobody has run `slops-taste` on a real screen. Its design
  advice is unjudged; that belongs in `prior-use-review.md` after first real use, not now.
- **Every probe is local.** `slops-explainer-cut` and `slops-animation-render` are specified to render
  on **KVM1**, so their `NEEDS-INSTALL` here may be irrelevant. The tool cannot tell you and says so.
- **A wrong `requires:` block is a wrong answer.** Each of the 12 was written from the skill's prose
  and confirmed against this machine, but the binding is human and stays human.
- **It answers *is it here*, never *should it be here*.** That is `X5-VetWrappers`.

## Approval boundaries

- Nothing pushed or merged. Both branches are local.
- The only install run was the four `slops-taste` variants, after vetting.
- **C2–C8 remain unrun and uncleared** — each needs its own pass under `X5-VetWrappers`.
