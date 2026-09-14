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

---

# Addendum — all eight wrappers vetted

The first pass did `slops-taste` and deferred the other seven into `X5-VetWrappers`. The brief said
*"for each wrapper, in priority order (taste first)"* — taste first, not taste only. That was a
scope narrowing and it is now closed. **`X5-VetWrappers` is VERIFIED, not READY.**

| Wrapper | Licence | Verdict |
|---|---|---|
| `slops-taste` | MIT | ADOPT — installed, split web/native |
| `slops-mobile-smoke` | Apache-2.0 | KEEP — cleared to install (`--save-dev`) |
| `slops-voiceover` | MIT | Already correct; the reference example for wrapper authoring |
| `slops-animation-render` | **Not open source** | ADOPT — conditional on headcount |
| `slops-explainer-cut` | MIT | ADOPT — defer install |
| `slops-markitdown` | MIT | ADOPT — **not** with `[all]` |
| `compliance-by-template` | Apache-2.0 | ADOPT — hard scope line |
| `slops-headroom` | Apache-2.0 | Library only — defer |

## The four that changed a file

1. **markitdown banned Azure in prose and installed it in its own command.** `[all]` pulls
   `azure-ai-documentintelligence`, `azure-ai-contentunderstanding`, `azure-identity` — plus
   `SpeechRecognition`, whose default recognizer is a cloud service. Narrowed to format extras so
   the ban is structural.
2. **Remotion is not open source** — free only to three employees. We qualify today under
   facts-of-record #15 (sole owner). That eligibility was recorded nowhere, and #15's revisit
   trigger is the same event as Remotion's. Now tied together explicitly.
3. **headroom's proxy is a cloud-LLM path.** The library is local and fine; the proxy is what #17
   forecloses. The skill endorsed all three components.
4. **compliance-by-template gated counsel on "paid-tier products"** — and Omen is free, so the gate
   was off. A Privacy Policy binds regardless of price.

## One withdrawal

I said `slops-mobile-smoke` might be worth retiring because the web app is paused. **Wrong.**
`AGENTS.md` ships *"a secondary web app"*, `frontend/` is live, and what is paused is new *page
migrations*. "Native is active authority" ranks surfaces; it does not delete them.

## Three blockers that are shared, not per-package

- **One Python decision blocks three wrappers** (markitdown ≥3.10, manim ≥3.11, headroom). This Mac
  runs 3.9.6 with no Homebrew Python, `pipx`, or `uv`.
- **Two skills render on KVM1 and neither names a project root**, so both `NEEDS-INSTALL` results
  are noise — the checker is answering for the wrong machine and cannot know it.
- **`playwright-core@1.49.1` is 14 minors behind current.** The pin should be a decision.

## The checker found a bug in its own session

A malformed `note:` I wrote dropped `slops-markitdown`'s `description`, and the harness fell back to
showing the folder name — the skill became unroutable and nothing flagged it. The reader here is
deliberately lenient; the harness parses real YAML. The checker now reports structural YAML hazards
as `UNREADABLE` with the line number. Negative-tested against the actual failure, not a lookalike:
the first guard I wrote did **not** catch it, and the passing test was the thing that revealed the
gap.

## Gates, re-run after the addendum

`skill-deps` ready 2 / needs-install 7 / **undeclared 0** / **unreadable 0** ·
`link-skills` OK (122 in-sync, 0 drift, 4 FOREIGN left alone) · `truth-gate` **P0 0 P1 0** P2 2 ·
`valor-brain` 4/4 · `kickoff-drift` PASS · `npm test` **NOT RUN — no source changed.**

## Founder decisions this leaves open

1. Which Python (unblocks three wrappers).
2. Confirm KVM1 as render host and the two project roots (unblocks two).
3. Whether `playwright-core@1.49.1` is still the right pin.
4. Accept the Remotion headcount condition, and re-check it whenever facts-of-record #15 is
   re-derived.

---

# Addendum 2 — everything installed

**ready 8 · needs-install 1 · undeclared 0 · unreadable 0.** The remaining one is
`slops-voiceover`, whose voicebox host is another machine — correct, not a gap.

Full record with versions, exact commands and proof:
`Blueprints/tools/skill-link/INSTALL-STATE.md` (L0).

**Every Python tool runs on a pinned CPython 3.12 in an isolated `uv` venv.** System Python (3.9.6)
untouched; no two tools share a dependency tree. That settles the Python decision that was blocking
three wrappers, without a system-level change to reverse.

**The verdicts were carried into the installs, not filed beside them:** markitdown has no Azure
(`ModuleNotFoundError: No module named 'azure'`); headroom is library-only with the proxy
deliberately not installed; `playwright-core` went in with `--save-dev` so `omen/package.json`
records it and the long-false vendoring claim is true; open-agreements pinned to a commit.

**Proven working, not just on PATH.** markitdown converted an HTML table with structure intact;
pandoc produced a real Word 2007+ DOCX; manim rendered an MP4 in brass `#C4933B`; Remotion listed
**ten real compositions** and rendered 60 frames of `OmenHypeVertical` to a 1080×1920 h264+aac file.

## Two traps, recorded for the next machine

1. **`uv` without `--python` silently resolved markitdown to `0.0.1a1`** — a two-year-old alpha. It
   inherited system Python 3.9 and **backtracked past the `>=3.10` floor instead of failing**,
   reporting it as `warning: does not have an extra named 'xlsx'` — which reads like a typo, not a
   two-year downgrade. A resolver that succeeds against an unmet floor is a red flag.
2. **manim needs `cairo`, `pango`, `pkgconf`** before pip can build `pycairo`. A pip-only line is
   misleading. **LaTeX is still not installed**, so `Tex`/`MathTex` scenes fail — a real limit for a
   math-explainer skill, not a footnote.

## One gate change

`truth-gate` gained `legal-templates` to `SKIP_DIRS`. Cloning open-agreements put **two P0s** on the
board that were findings about the *upstream's own documents*. Vendored third-party checkouts are
the `node_modules` category: read, never authored. `References/legal-templates/` and `.agents/` are
gitignored — the pins are tracked, the payloads are not.

## Gates

`skill-deps` ready 8 / needs-install 1 / undeclared 0 / unreadable 0 · `link-skills` OK ·
`truth-gate` **P0 0 P1 0** P2 2 · `valor-brain` 4/4 · `kickoff-drift` PASS ·
**`npm test` 1100/1100** — run this time, because `omen/package.json` changed.

## Still open

- **LaTeX** for manim math scenes (`brew install --cask basictex`, ~100 MB).
- **Browser binaries** for playwright-core — a separate first-run download, still founder-run.
- **Confirm KVM1** as the render host and the Remotion project root. Both render pipelines now work
  locally, so this is a placement decision rather than a blocker.
- **`playwright-core@1.49.1`** is 14 minors behind current.

---

# Addendum 3 — the three open items closed, both traps made structural

## The three

1. **LaTeX — installed.** `brew install --cask basictex` fails without a terminal password (the cask
   runs `/usr/sbin/installer` under `sudo`). **TinyTeX** is the no-root equivalent: same TeX Live,
   unpacked into `~/Library/TinyTeX`. Its installer was **read before running** rather than piped
   from curl to sh; `--no-path` skips its only `sudo`, and binaries were linked into `~/.local/bin`
   via `tlmgr`. `tlmgr` errored during `fmtutil`, so the only thing that settled it was rendering a
   real `MathTex` scene. It renders.
2. **Browser binaries — installed and exercised.** Chromium 131.0.6778.33 and WebKit 18.2, both
   launched at 390×844 running this skill's own touch-target axis, which correctly flagged a 30px
   button. Not "the file exists".
3. **Render host — this was a defect, not a decision.** Both render skills said renders run on
   **KVM1**. `AGENT.md` § Infrastructure Boundary: KVM1 is the **live app hosting lane** —
   `omen_api` and `omen_cron` serving `https://slopssaloon.com`. It is the production API host, not
   a render farm; a multi-minute CPU-saturating render there risks the live service to save a file
   copy. **Corrected to local in both**, which is proved for both pipelines. The instruction
   survived for months because the tools had never been installed, so it was never tested against
   what KVM1 actually is.

## Both traps are now caught by the tool, not by a note

A note in a file is a control only if someone reads it.

- **`min_version` in `requires:`** — `markitdown >= 0.1.0`, `manim >= 0.19.0`,
  `headroom >= 0.30.0`. The uv-backtracking trap (a silently-installed two-year-old alpha) now
  reports **NEEDS-INSTALL**, not READY. Tested with an impossible floor:
  *"found 0.1.7 — BELOW the required 99.0.0."*
- **manim's system libraries are declared dependencies**, not prose — `cairo`, `pango`, `pkgconf`,
  `latex`, `dvisvgm`, `ffmpeg` are probed by name, so the checker states the cause before `pycairo`
  fails with an opaque build error.

## Two bugs of my own, found by the number moving

The check went 8 → 7 after I added those probes. Both were mine: the `path:` probe could not expand
`~`, so a machine-local cache in `$HOME` read as absent for binaries I had just launched; and an
inserted `requires:` entry absorbed the previous entry's `install:`/`note:` lines. **The count
moving in the wrong direction was the only signal** — every individual line still looked plausible.

## Gates

`skill-deps` **ready 8 · needs-install 1 · undeclared 0 · unreadable 0** · `link-skills` OK ·
`truth-gate` **P0 0 P1 0** P2 2 · `valor-brain` 4/4 · `kickoff-drift` PASS · `npm test` 1100/1100.

The remaining `needs-install` is `slops-voiceover`, hosted on another machine — correct, not a gap.

