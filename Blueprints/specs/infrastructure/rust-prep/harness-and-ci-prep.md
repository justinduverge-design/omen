# Rust programme — harness and CI prep

**valid-as-of:** 2026-10-17
**Status:** PREP ONLY. Nothing below is applied. Each draft needs founder approval before it lands.
**Parent spec:** `Blueprints/specs/infrastructure/omen-rust-infrastructure-plan-v1.md` (readiness items 7 and 8).

## 1. Agent harness

### 1.1 Map budget

Measured with `node scripts/harness-cost.js` on 2026-10-17:

- `Direction/map.md`: ~1487 tokens. Budget is 2000 (`MAP_BUDGET_TOKENS`). Headroom is ~513 tokens.
- Always-loaded total: ~2896 tokens. Budget is 10000.
- The row below is about 75 tokens. It fits.

### 1.2 Map routing-table row (draft)

Add after the "Warehouse, timers, backups" row in `Direction/map.md`:

```markdown
| Rust crates, Pi binaries, Rust core bindings | `Blueprints/specs/infrastructure/omen-rust-infrastructure-plan-v1.md`, `Blueprints/specs/infrastructure/rust-prep/harness-and-ci-prep.md` | `slops-rust-tdd`, `slops-code-review` |
```

### 1.3 `.graphifyignore` (draft)

`.graphifyignore` exists. It ignores `build/`, `**/build/`, `**/node_modules/` and similar. It does not ignore Cargo
output. Add:

```gitignore
# Cargo build output and vendored crates are not code structure.
**/target/
**/vendor/
```

Note: graphify parses JS/TS today. Check whether it parses `.rs` before relying on it for Rust crates.

### 1.4 Draft skill: `slops-rust-tdd`

Path when applied: `Slops-OS/Blueprints/skills/slops-rust-tdd/SKILL.md`. Modeled on `slops-tdd` (same frontmatter
keys and section order). It must be authored through `slops-skill-author`, not copied by hand.

```markdown
---
name: slops-rust-tdd
description: Implement changed Rust behavior through one vertical red-green-refactor slice at a time with cargo test. Use for Rust crates, Pi fleet binaries, and the shared decision core and its napi-rs/UniFFI/WASM bindings; tests public behavior and does not authorize deploys, cross-compiled releases or unrelated refactors.
status: proposed
skill_type: simple
layer: Layer 0
default_agent: Codex implements; Claude may define acceptance behavior
trigger: build this crate with TDD, add a Rust regression test, port this JS function to the Rust core, fix this Pi binary bug
version: 0.1.0
upstream: Extends slops-tdd 0.1.0 for Rust and cargo
owner: SLOPS
---

# Slops Rust TDD

## Purpose

Build the smallest vertical Rust behavior slice with a fast cargo feedback loop. Tests specify observable contracts,
not internal call choreography. Parity with an existing JS path is a contract, not a side check.

## When to Use

- Implement behavior in a Rust library or binary crate.
- Port a JS function into the shared decision core, behind a parity test.
- Fix a reproducible defect in a Pi fleet binary with a regression test.
- Change a binding layer (napi-rs, UniFFI, wasm-bindgen) whose callers can be tested.

## Do Not Use

- Pure documentation, generated bindings or vendored crates.
- Exploratory spikes; time-box and discard or convert the result into a tested build item.
- Cross-compiling and shipping a release to a Pi, deploying, installing toolchains or changing secrets.
- JS or Python work; use `slops-tdd`.

## Required Inputs

- Approved task, acceptance behavior, target crate and boundaries.
- The crate's test command (`cargo test -p <crate>`) and definition of done.
- For a port: the JS function, its recorded fixtures, and the parity tolerance (default: exact).

## Preconditions and Dependencies

- Use the workspace's pinned toolchain (`rust-toolchain.toml`). Do not change it without approval.
- Use only crates already in `Cargo.lock`. A new dependency needs approval and must pass `cargo deny check`.
- Establish a fast deterministic command that can fail for the behavior under construction.

## Process Recipe

1. Translate one acceptance criterion into one externally observable example, including its important failure case.
2. Add the smallest test through the public API: a unit test in the module, or an integration test in `tests/`.
3. Run `cargo test -p <crate> <test_name>` and confirm **RED for the intended reason**. A compile error does not
   count; stub the signature first so the test compiles and fails on an assertion.
4. Write the minimum implementation for that one example.
5. Run the same command and confirm **GREEN**. Then run `cargo test --workspace`.
6. For a port, run the parity test against the recorded JS fixtures and confirm an exact match.
7. Run `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`. Refactor while tests stay green.
8. Checkpoint the slice according to `slops-git-flow`.
9. Repeat with the next acceptance example. Do not write all tests first and all code later.
10. For a Pi binary, finish with a cross-compile check for the target (`aarch64-unknown-linux-gnu`). Building is
    verification; copying to a device is a deploy and needs approval.

## Test Design Rules

- Prefer public functions, return values and `Result` error variants over private helpers.
- Test error contracts: every `Err` variant a caller can see has at least one test.
- No `unwrap()` or `expect()` on untrusted input in non-test code; test the failure path instead.
- Mock only slow, nondeterministic or external boundaries behind a trait; keep domain math real.
- Floating-point math: state the tolerance in the test. Parity with JS uses the same rounding as JS.
- Use property tests (proptest) only when the crate already depends on it.
- A regression test must fail on the defect and pass on the correction.

## Output Contract

The scoped code and test patch, plus evidence per slice: red command and intended failure, green command and result,
workspace test, fmt and clippy results, parity result for ports, cross-compile result for Pi targets, assumptions and
excluded work.

## Verification

- At least one test was observed red on an assertion before the implementation.
- The same test is green after the minimum implementation.
- `cargo test --workspace`, `cargo fmt --check`, `cargo clippy -D warnings` and `git diff --check` pass.
- Ports: parity test passes against recorded JS fixtures.
- No unrelated refactor, new crate, toolchain change, deploy or secret change entered the diff.

## DBS Routing

Layer 0 doctrine that writes only inside the approved target repository. Pair with `planning-pass`, `slops-git-flow`,
`slops-quality-baseline` and `slops-code-review`.

## Boundaries

- Follow target repository ownership: backend and Rust crates are Codex unless explicitly assigned.
- Stop for approval on new crates, toolchain bumps, `unsafe` blocks, production data, secrets, deploys or flipping a
  programme switch (`DECISION_ENGINE`, systemd units).
- TDD does not override a task's acceptance criteria or safety controls.

## Failure Modes

- A test added after implementation that was never seen fail.
- RED caused by a compile error instead of an assertion.
- Horizontal work: all tests, then all code.
- Parity checked by eye instead of by a test.
- `unwrap()` hiding an untested error path.
- Clippy warnings silenced with `#[allow]` instead of fixed.

## Prior-Use Review Loop

Read `notes/prior-use-review.md` when present. Record slow builds, flaky tests, parity mismatches and cross-compile
friction; improve the smallest part of the loop that caused them.

## Changelog

- 0.1.0 — Proposed. Rust extension of `slops-tdd`.
```

### 1.5 `SKILL_ROUTING.md` row (draft)

Add next to the `slops-tdd` row (line ~102) in `Slops-OS/Blueprints/skills/SKILL_ROUTING.md`. Status stays
`proposed` until a first real use.

```markdown
| `slops-rust-tdd` | Codex implements; Claude may define acceptance behavior | `Layer 0` (writes in the approved target repo) | `proposed` | Build one vertical red-green-refactor Rust slice at a time with cargo test, fmt and clippy; JS parity tests for core ports; no deploys, new crates or toolchain changes. |
```

## 2. CI

### 2.1 Existing workflows

| Workflow | Trigger | Runner | What it runs | New tool slots in |
|---|---|---|---|---|
| `ai-evals.yml` | PR, dispatch | ubuntu-latest | `npm run evals:validate`, `evals:mock` | — |
| `android-ci.yml` | push, PR | ubuntu-latest | Java, Gradle tests | UniFFI Android bindings (later) |
| `dependency-health.yml` | schedule, dispatch, PR | ubuntu-latest | `npm audit` root and `frontend/`, prod and dev; dependency inbox | **cargo-deny, cargo-audit**; `uv` lock audit |
| `deploy-kvm1-tailscale-fallback.yml` | dispatch | ubuntu-latest | quality (npm ci, test, audit), build, deploy over Tailscale SSH | mirror of deploy.yml changes |
| `deploy.yml` | push to main | quality and build on ubuntu-latest; deploy on `[self-hosted, kvm1, omen-deploy]` | npm ci, test, contract compare, npm audit, image build/push, deploy | napi-rs build stage in Dockerfile (Phase 5) |
| `docs-quality.yml` | PR | ubuntu-latest | kickoff drift, valor-brain, sprint staleness | **typos** |
| `ios-ci.yml` | push, PR | macos-14 | Xcode tests | UniFFI Swift bindings (Phase 5) |
| `migrations-ci.yml` | PR, dispatch | ubuntu-latest | redo rehearsal, concurrency check | — |
| `native-tokens.yml` | PR | ubuntu-latest | token parity, Gradle contrast test | — |
| `native-visual-evidence.yml` | (see file) | macos-14, ubuntu-latest | iOS and Android screenshots | — |
| `pr-quality.yml` | PR (path filter incl. `client/`) | ubuntu-latest | backend tests and audit; frontend build; boot smoke | **Biome**; Tailwind 4 / Rolldown via the frontend build; drop `client/` paths |
| `ui-quality.yml` | PR | ubuntu-latest | `npx impeccable detect frontend/src/` | — |
| `warehouse-worker-image.yml` | push, dispatch | ubuntu-latest | buildx image, push by digest, upload artifact | Polars ingest image (Phase 3) |

No workflow runs Python, ruff, shellcheck, typos or cargo today. Shellcheck is not in any workflow, although the plan
says "keep shellcheck". That is a gap to confirm.

### 2.2 Runner and pinning conventions

- Every workflow pins actions by **major tag** (`actions/checkout@v7`, `docker/build-push-action@v7`). None pin by SHA.
- The plan asks for SHA pins on new Rust actions. That would be a first. Either pin all new actions by SHA (preferred
  for third-party actions like `dtolnay/rust-toolchain` and `Swatinem/rust-cache`) or match the tag convention. Founder
  call.
- Images are pinned by digest (warehouse worker image). Keep that for any Rust image.
- The KVM1 self-hosted runner (labels `self-hosted, kvm1, omen-deploy`) is only used by the `deploy` job. Never run
  Rust builds or cross-compiles there. KVM1 is production with 2 vCPU. All new jobs use `ubuntu-latest`.
- ARM runners: GitHub offers `ubuntu-24.04-arm`. It could build aarch64 natively instead of cross-compiling. Check plan
  availability for this repo.

### 2.3 Pi targets

From `slops-os-raspberry-pi-fleet-v1.md`: all three Pis run **Debian 13 (trixie) arm64**. That includes both Pi Zero 2 W
boards (Steward, Sentinel), which have a 64-bit CPU and run a 64-bit OS here.

- Target: **`aarch64-unknown-linux-gnu`** for all Pis. Use `aarch64-unknown-linux-musl` for a fully static binary.
- **armv7 is not needed.** Add it only if a Pi is reflashed with a 32-bit OS.
- Steward and Sentinel have ~415 MiB usable RAM. Build with `opt-level = "z"` or `"s"`, `lto = true`, `strip = true`,
  `panic = "abort"`.

### 2.4 Draft: `rust-ci.yml`

```yaml
name: Rust CI
on:
  pull_request:
    paths:
      - "crates/**"
      - "Cargo.toml"
      - "Cargo.lock"
      - "rust-toolchain.toml"
      - "deny.toml"
      - ".github/workflows/rust-ci.yml"
  workflow_dispatch:

concurrency:
  group: rust-ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  CARGO_TERM_COLOR: always
  RUSTFLAGS: "-D warnings"

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: dtolnay/rust-toolchain@<SHA_PLACEHOLDER> # stable, matches rust-toolchain.toml
        with:
          toolchain: stable
          components: rustfmt, clippy
      - uses: Swatinem/rust-cache@<SHA_PLACEHOLDER> # v2
      - name: Format
        run: cargo fmt --all --check
      - name: Clippy
        run: cargo clippy --workspace --all-targets --locked -- -D warnings
      - name: Test
        run: cargo test --workspace --locked

  pi-cross:
    needs: check
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      matrix:
        target: [aarch64-unknown-linux-gnu, aarch64-unknown-linux-musl]
    steps:
      - uses: actions/checkout@v7
      - uses: dtolnay/rust-toolchain@<SHA_PLACEHOLDER>
        with:
          toolchain: stable
          targets: ${{ matrix.target }}
      - uses: Swatinem/rust-cache@<SHA_PLACEHOLDER>
        with:
          key: ${{ matrix.target }}
      - uses: mlugg/setup-zig@<SHA_PLACEHOLDER> # zig for cargo-zigbuild
      - name: Install cargo-zigbuild
        run: cargo install cargo-zigbuild --locked --version <PINNED_VERSION>
      - name: Build Pi binaries
        run: cargo zigbuild --release --locked --target ${{ matrix.target }} -p <pi-crate>
      - name: Size report
        run: ls -l target/${{ matrix.target }}/release/ | tee -a "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@v7
        with:
          name: pi-${{ matrix.target }}
          path: target/${{ matrix.target }}/release/<binary-name>
          retention-days: 14
```

`cargo-zigbuild` is chosen over `cross` because `cross` needs Docker-in-Docker images. Either works on
`ubuntu-latest`. Uploading an artifact is not a deploy. Copying to a Pi stays a manual, approved step.

### 2.5 Draft: additions to `dependency-health.yml`

```yaml
  rust-supply-chain:
    if: hashFiles('Cargo.lock') != ''
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: EmbarkStudios/cargo-deny-action@<SHA_PLACEHOLDER> # v2
        with:
          command: check advisories bans licenses sources
      - uses: dtolnay/rust-toolchain@<SHA_PLACEHOLDER>
        with:
          toolchain: stable
      - name: cargo-audit
        run: |
          cargo install cargo-audit --locked --version <PINNED_VERSION>
          cargo audit --deny warnings
```

A `deny.toml` is needed at the repo root (licence allow-list, ban duplicate versions as warn, sources: crates.io only).

### 2.6 Draft: typos (add to `docs-quality.yml`)

```yaml
  typos:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7
      - uses: crate-ci/typos@<SHA_PLACEHOLDER> # pin a release
        with:
          config: _typos.toml
```

Start with `_typos.toml` excluding `Archive/`, `References/`, `output/`, lockfiles and fantasy player names. Run on
changed files first; widen once the backlog is clean.

### 2.7 Draft: Python job (`python-quality.yml`)

```yaml
name: Python quality
on:
  pull_request:
    paths:
      - "**/*.py"
      - "pyproject.toml"
      - "uv.lock"
      - ".github/workflows/python-quality.yml"

permissions:
  contents: read

jobs:
  python:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: astral-sh/setup-uv@<SHA_PLACEHOLDER> # pin a release
        with:
          enable-cache: true
      - name: Sync
        run: uv sync --locked
      - name: Ruff lint
        run: uv run ruff check .
      - name: Ruff format
        run: uv run ruff format --check .
      - name: Warehouse Python tests
        run: uv run python -m unittest discover -s warehouse/test -p "test_*.py"
```

Check the test runner first: confirm whether the two `warehouse/test/*.py` files use unittest or pytest.

### 2.8 Draft: Biome job (add to `pr-quality.yml`)

```yaml
  biome:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: biomejs/setup-biome@<SHA_PLACEHOLDER>
        with:
          version: <PINNED_VERSION>
      - name: Biome
        run: biome ci src scripts frontend/src extension
```

Run in report-only mode (`continue-on-error: true`) for one week, per "old and new tools pass on the same commit".
Then make it blocking. Add `biome.json` and the Biome paths to the `pr-quality.yml` path filter.

## 3. Python inventory

| Path | Purpose | How it runs today |
|---|---|---|
| `infra/warehouse/select_release_root.py` | Trusted release-root selector | On KVM1 by the warehouse runbook; excluded from bundles (`SELECTOR-CONTRACT.md`) |
| `infra/warehouse/publish_release_root.py` | Trusted release publisher | Same; excluded from bundles (`PUBLISHER-CONTRACT.md`) |
| `infra/warehouse/build-release.sh` | Inline `python3 - <<'PY'` heredoc | Run by hand on the host |
| `warehouse/test/test_select_release_root.py`, `test_publish_release_root.py` | Tests for the two scripts above | Not run in any CI workflow |
| `ops/football-data/command-center/omen_football_witness.py` | Witness script on Command Center | On the Pi, outside CI |
| `scripts/research/context-vs-projection/*.py` (16 files) | One-off research | By hand, outside CI |
| `scripts/httponly-cookie-spike-server.py` | Spike server | By hand, outside CI |

- There are **no** `requirements*.txt`, `pyproject.toml` or `Pipfile` files.
- `Dockerfile` and `Dockerfile.cron` install `python3 make g++` for native npm builds (node-gyp), not for Omen
  Python code. Leave that alone.
- **No workflow runs Python today.** uv/ruff adoption starts from zero. Scope it to `infra/warehouse/`,
  `warehouse/test/` and `ops/` first. Treat `scripts/research/` as lint-only, or exclude it.
- Check whether the trusted scripts must stay stdlib-only. If so, uv manages only dev tools (ruff), not runtime deps.

## 4. Legacy `client/` app

Evidence:

- `Dockerfile` has a `client-builder` stage. It builds `client/` and copies `client/dist` into the production image
  (line 81). It also builds `frontend/` and copies `frontend/dist` (line 82).
- `src/server.js` line 167 serves `SPA_DIR = frontend/dist`. It does **not** serve `client/dist`. The log line at
  173 still says "Serving SPA from client/dist". That message is stale.
- `Dockerfile.cron` copies `client/` into the builder (line 19) and into the cron image (line 35). No cron code
  imports it.
- `deploy/hostinger/nginx-omen.conf` proxies `/` to `127.0.0.1:3000`. It has no `root` for `client/`. Only the ACME
  challenge uses a static root (`/var/www/html`).
- No file in `src/`, `frontend/src/`, `scripts/`, `test/` or `extension/` imports from `client/`. The `client` hits
  in `src/` are Supabase client variables.
- `pr-quality.yml` lists `client/package.json` and `client/package-lock.json` in its path filter.
- `client/` holds `App.jsx`, `AuthApp.jsx`, `PrivacyPolicy.jsx`, `lib/`, `public/` and `vite.config.js`.

Conclusion: `client/` is built and shipped, but nothing serves or imports it. Retiring it looks safe. Before deleting:

1. Confirm `frontend/` has its own privacy-policy page and auth screens, since `PrivacyPolicy.jsx` and `AuthApp.jsx`
   live only in `client/`.
2. Diff `client/public/` against `frontend/public/` for any file a URL still points to (for example, `.well-known`
   files or legal pages).
3. Then remove the Dockerfile stage and line 81, the two `Dockerfile.cron` lines, the `pr-quality.yml` filter entries,
   and fix the stale log line in `server.js`.
