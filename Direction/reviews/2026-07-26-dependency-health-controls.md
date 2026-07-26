# Dependency Health Controls Review

## Scope

Dependency advisory remediation and visibility controls for the root Node.js project. No provider credentials, production configuration, deployment, user data, or runtime endpoint behavior changed.

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Root production audit is clean | `npm audit --omit=dev --audit-level=low` returned 0 vulnerabilities after the `body-parser` 1.20.6 lock resolution. | `package-lock.json` | confirmed |
| Frontend production risk is visible | `npm --prefix frontend audit --omit=dev` returns 2 moderate React Router advisories; the frontend production-audit job reports them without blocking unrelated dependency pull requests until the migration is completed. | `frontend/package.json`; `.github/workflows/dependency-health.yml` | confirmed |
| New high-severity dependency risk is blocked in PRs | Dependency Review workflow runs `actions/dependency-review-action@v4` with `fail-on-severity: high`. | `.github/workflows/dependency-review.yml` | confirmed |
| Production advisories are a strict CI gate | Dependency Health runs the production-only audit at low severity on dependency PRs, weekly, and manually. | `.github/workflows/dependency-health.yml` | confirmed |
| Existing Promptfoo debt remains visible | Development audit is a visible non-blocking job; full audit currently returns 15 development-only advisories. | `.github/workflows/dependency-health.yml`; `npm audit --omit=dev` | confirmed |
| Deterministic prompt regressions block relevant PRs | The mock config validation and fixture eval have no error-suppressing shell clause. | `.github/workflows/ai-evals.yml`; `package.json` | confirmed |

## Data Classification and Boundaries

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Dependency manifests and lockfile | Internal engineering metadata | GitHub pull-request and scheduled CI | Reviewed without reading secrets. |
| Prompt fixture text | Internal product behavior fixture | Deterministic CI job | Uses `echo`; no user, league, or credential data. |
| Provider-dependent prompt eval | External-engine availability signal | Manual GitHub workflow only | Existing secret reference remains unprinted and unmodified. |

## Gaps and Required Follow-Up

- Promptfoo 0.121.19 remains the latest release but brings 15 development-only root-audit advisories.
- The frontend requires a React Router major-version migration to resolve 2 production moderate advisories; its full audit has 6 total advisories, including Vite/PostCSS tooling.
- A dependency-light SLOPS runner needs a separate compatibility task before Promptfoo can be removed.
- Repository administrators must ensure GitHub Dependabot alerts/security updates and the dependency graph are enabled; the committed configuration controls version-update pull requests but cannot enable repository settings.

## Recommended Next Safe Step

Open the dependency-health branch for review. The next implementation items are a scoped React Router migration and a parity-tested SLOPS-owned fixture runner or upstream Promptfoo release evaluation; do not apply broad nested overrides just to suppress the report.
