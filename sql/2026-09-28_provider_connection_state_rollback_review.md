# Provider connection state rollback review

This is a review artifact, not an execution instruction. Do not run it against
Supabase until the migration has been approved and a current backup has been
verified. Rollback is destructive to the newly added health metadata and must
be a separate approval from applying the additive migration.

If rollback is approved, inspect `pg_depend`, confirm that no application code
still reads these columns, and execute the following in one transaction during
a maintenance window:

```sql
begin;

drop index if exists public.idx_platform_connections_health_state;

alter table public.platform_connections
  drop constraint if exists platform_connections_connection_state_check,
  drop constraint if exists platform_connections_credential_generation_check,
  drop constraint if exists platform_connections_consecutive_failures_check,
  drop constraint if exists platform_connections_last_status_check;

alter table public.platform_connections
  drop column if exists connection_state,
  drop column if exists connection_reason_code,
  drop column if exists credential_generation,
  drop column if exists consecutive_failures,
  drop column if exists last_status,
  drop column if exists last_checked_at,
  drop column if exists state_changed_at;

rollback; -- replace with commit only after the reviewed change is verified
```

The final `rollback` is intentional in this review artifact: it makes an
accidental paste non-destructive. A real rollback must replace it with
`commit` only after the operator records the approval, backup identifier,
applied migration revision, dependency check, and post-change health checks.
