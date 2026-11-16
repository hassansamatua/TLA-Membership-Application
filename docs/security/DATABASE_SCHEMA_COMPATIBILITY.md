# Phase 0 Database Schema Compatibility Report

Date: 2026-11-02  
Scope: local verification only. No credentials are included and no destructive or repair migration was run.

## Effective database configuration

`lib/db.ts` resolves its runtime database from environment variables and otherwise falls back to:

- host: `localhost`
- port: `3306`
- database: `next_auth`
- SSL: disabled for localhost

The first local production-server check therefore used `next_auth`. A second disposable verification database named `phase0_test` was created with table structures copied from `next_auth`; it contained synthetic users only.

| Environment | Database selected | Source |
|---|---|---|
| Local app default | `next_auth` | `lib/db.ts` fallback / local environment |
| Disposable app test | `phase0_test` | `MYSQL_*` variables supplied only to the local test process |
| Direct schema checks | `next_auth` and `phase0_test` | local MySQL-compatible server |

## Observed schema

`next_auth` reported 36 tables. `phase0_test` was initialized with the same 36 table structures.

The `users` table in both databases contains these relevant columns:

- `id`
- `email`
- `password`
- `membership_type`
- `is_admin`
- `role`
- `is_approved`
- `refresh_token`
- `membership_number`
- `payment_status`
- `reset_token`
- `reset_token_expires_at`
- `is_new_member`
- `last_membership_year`

It does **not** contain `users.user_category`.

The `messages` table expected by `app/api/messages/**` is absent in both databases.

## Error reproduced

`/api/membership/status` returns HTTP 500 on the disposable schema because the handler executes a query requiring `users.user_category`. The server-side error is MySQL `ER_BAD_FIELD_ERROR` for the missing column. The response was changed to return a generic 500 without exposing SQL details.

`/api/messages` returns HTTP 500 on the disposable schema because `messages` is absent.

## Migration source identified

`database/add_user_categories_and_update_membership.sql` defines:

- `users.user_category` as `ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular'`
- related membership updates and an index

Similar definitions exist in `database/simple_migration.sql` and `database/migrate_to_enhanced_system.sql`.

No `messages` table migration was found in the tracked `migrations/` directory during this verification; `database/create_messages_table.sql` exists and should be reviewed before use.

## Compatibility conclusion

The checked-out application code is newer than the local schema. The runtime app and direct local tests were using compatible database selection logic, but the schema itself is missing columns/tables required by the current code.

## Required follow-up — awaiting authorization

1. Confirm the intended non-production schema owner and migration ordering.
2. Review and apply the approved `user_category` migration in a disposable/staging database.
3. Review and apply an approved `messages` schema migration in the same disposable/staging database.
4. Re-run member dashboard, messages, payment-status, and authorization tests.
5. Do not apply these migrations to production without a reviewed migration plan and backup/rollback procedure.
