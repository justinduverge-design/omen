# Provider connection state execution review

This is a review artifact, not an execution instruction. The companion SQL is
not approved for production application by this file. A migration operator must
record the approval, target project, backup identifier, and maintenance window
before running anything.

## Scope and invariants

- Target table: `public.platform_connections` only.
- The change is additive: seven nullable columns, four checks, and one index.
- No rows, Vault secrets, credentials, policies, triggers, functions, or RLS
  settings may be changed by the provider-state migration.
- Existing application routes must continue to work when the columns are
  absent; this is why the API keeps its compatibility fallback.
- Browser roles must retain no table grant. The backend service role is the
  only intended access path.

## Preflight (read-only)

Run each query against the intended project and save the results with the
migration evidence. Stop immediately if any result violates the predicate.

```sql
-- 1. Confirm the target exists and is the expected table shape.
select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'platform_connections';

-- 2. Confirm no conflicting columns or constraints already exist with an
-- incompatible type/definition.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'platform_connections'
  and column_name in (
    'connection_state', 'connection_reason_code', 'credential_generation',
    'consecutive_failures', 'last_status', 'last_checked_at',
    'state_changed_at'
  )
order by column_name;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.platform_connections'::regclass
  and conname in (
    'platform_connections_connection_state_check',
    'platform_connections_credential_generation_check',
    'platform_connections_consecutive_failures_check',
    'platform_connections_last_status_check'
  );

-- 3. Establish the row-count baseline; the postflight count must match.
select count(*) as platform_connections_row_count
from public.platform_connections;

-- 4. Capture grants and ensure no browser grant is already present.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'platform_connections'
order by grantee, privilege_type;

-- 5. Confirm a current backup exists outside the database session.
-- Record backup identifier, creation time, and restore-test evidence here.
```

### Mandatory stop conditions

Stop and do not apply the companion SQL if:

1. `platform_connections` is absent, is not in `public`, or has an unexpected
   primary key/ownership model.
2. Any proposed health column exists with a non-compatible type or a
   non-null requirement that would make existing rows invalid.
3. Any existing constraint with one of the reserved names has a different
   definition.
4. The current row count cannot be recorded, a backup cannot be identified,
   or the restore test is missing.
5. The target project is not positively identified, or the operator cannot
   establish a maintenance/observation window.
6. The preflight grant output shows browser access that would be accidentally
   preserved by the migration review.

## Application boundary

If preflight passes, run
`sql/2026-09-28_provider_connection_state_review.sql` as a single reviewed
change. Do not paste the rollback artifact into the same session. Do not add
backfills, defaults, triggers, policies, RLS changes, or secret operations.

## Postflight (read-only)

Save the output and compare it with preflight before declaring success:

```sql
-- 1. All seven columns must exist with the intended nullable types.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'platform_connections'
  and column_name in (
    'connection_state', 'connection_reason_code', 'credential_generation',
    'consecutive_failures', 'last_status', 'last_checked_at',
    'state_changed_at'
  )
order by column_name;

-- 2. Constraints and index must exist with the reviewed definitions.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.platform_connections'::regclass
  and conname like 'platform_connections_%_check'
order by conname;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'platform_connections'
  and indexname = 'idx_platform_connections_health_state';

-- 3. Row count must be unchanged.
select count(*) as platform_connections_row_count
from public.platform_connections;

-- 4. Browser roles must still have no table grants; service_role must retain
-- the backend grant.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'platform_connections'
order by grantee, privilege_type;
```

## Postflight stop conditions and rollback gate

Stop traffic to the changed path and do not claim success if the row count
changed, any column is non-nullable, a constraint/index is missing, grants are
broader than the preflight contract, or API health checks report errors. A
rollback requires a separate approval, a current backup, a dependency check,
and the fail-closed rollback artifact in
`sql/2026-09-28_provider_connection_state_rollback_review.md`; it is not an
automatic response to an operator error.

