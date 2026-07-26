# Quiet Dependency Inbox and Jules Delegation — 2026-07-26

## Delivered

- Added weekly Dependabot version monitoring for Android Gradle at `mobile/android`.
- Added a scheduled/workflow-dispatch-only `Dependency Inbox` job. It creates one GitHub issue and updates that same issue with audit outcomes and open dependency pull requests.
- Added a Jules dependency-update issue template. The `jules` label is deliberately manual; no workflow applies it.
- Documented the quiet-notification and review-gated Jules policy.

## Validation

- Workflow and Dependabot YAML parse cleanly.
- Inbox job has no pull-request trigger, uses least-privilege issue write access only in its job, and does not send emails or mention users.
- No push, GitHub App installation, label creation, merge, deploy, provider, credential, or production action occurred.

## Founder follow-up

1. Push and merge this branch when ready; the scheduled workflow cannot run before then.
2. In Jules, connect only this repository through the Google Labs Jules GitHub App.
3. Use the included template, then manually add `jules` to one selected update issue when you want to spend a task.
