# Phase 1 Database Migration Review

Date: 2026-11-02  
Scope: review only. No migration was executed and no records were changed.

## Current local schema findings

Database inspected: local `next_auth`; disposable `phase0_test` was cloned from the same structures.

| Object | Current result |
|---|---|
| `users.user_category` | Missing |
| `messages` | Missing |
| `payments` | Exists; contains `reference`, `user_id`, `membership_type`, `amount`, `currency`, `status`, `payment_method`, `phone_number`, `transaction_id`, `checkout_url`, `paid_at`, `cycle_year`, `penalty_amount`, `is_new_member` |
| `payments` indexes/constraints | None reported by local `SHOW INDEX`; no FKs reported — this does not match migration expectations |
| `memberships` | Exists; no unique `user_id` reported; no FKs reported |
| `membership_payments` | Exists; no indexes/FKs reported |
| `cycle_payment_status` | Exists; no indexes/FKs reported |
| `user_membership_status` | Exists; no indexes/FKs reported |
| `membership_cycles` | Exists; no indexes/FKs reported |

The actual schema must be treated as authoritative. Migration files do not reliably describe the current database.

## Review: `database/add_user_categories_and_update_membership.sql`

### Purpose

Adds `users.user_category` and performs enhanced-membership initialization/index work.

### Affected objects

- `users.user_category`
- `membership_cycles` fee/penalty fields
- `membership_number_sequence`
- `user_membership_status.membership_number`
- Indexes on `users`, `user_membership_status`, `cycle_payment_status`

### Existing-data impact

- Existing users default to `regular`.
- The migration updates `membership_cycles` fees/penalties; this may conflict with the instruction not to modify membership fee/penalty rules and therefore needs business review before use.
- Existing numeric membership numbers are reformatted; potentially destructive to current display/reference values.
- `membership_number_sequence` initialization may conflict with existing `membership_sequence` naming used by code.

### Dependencies

- `membership_cycles`, `user_membership_status`, `cycle_payment_status` must exist.
- `ALTER TABLE` and `CREATE INDEX` support must match MariaDB/MySQL syntax.

### Risks

- **High:** changes fee/penalty configuration.
- **High:** modifies existing membership numbers.
- **Medium:** creates a second sequence table instead of extending `membership_sequence`.
- **Medium:** `CREATE INDEX IF NOT EXISTS` may not be portable.
- **Medium:** missing-column fix is bundled with unrelated data changes.

### Recommended implementation

**REQUIRES APPROVAL:** split into a minimal schema-only migration:

- Add `users.user_category` with default `regular`.
- Backfill only if required by current application rules.
- Add index `idx_users_category`.
- Do not update fees, penalties, or membership numbers in the same migration.

### Rollback

- Drop `idx_users_category`.
- Drop `users.user_category`.
- Do not attempt to reverse unrelated membership-number/fee mutations unless a reviewed backup exists.

### Required tests

- Member and admin `/api/membership/status`.
- Fee-category resolution for regular/organization/librarian.
- Registration and approval.
- Reports/admin user list.
- Confirm no membership fee or penalty calculation changes.

## Review: `database/create_messages_table.sql`

### Purpose

Creates the `messages` table required by member messaging endpoints.

### Affected objects

- `messages.id`
- `sender_id`
- `receiver_id`
- `subject`
- `content`
- `created_at`
- `read_at`
- FKs to `users(id)` for sender/receiver
- sender/receiver/date/read indexes

### Existing-data impact

Low: creates an empty table only. No existing records are modified.

### Dependencies

- `users` table must exist and use InnoDB-compatible integer IDs.
- MariaDB must support `ADD INDEX IF NOT EXISTS` in `ALTER TABLE` or the migration must be adjusted.

### Risks

- **Low/medium:** FK cascade deletes messages when a user is deleted; confirm desired retention policy.
- **Medium:** composite index syntax `ADD INDEX IF NOT EXISTS` may fail depending on DB version.
- **Low:** no uniqueness constraint is required for messages.

### Recommended implementation

Apply as a standalone additive migration after confirming DB syntax.

### Rollback

Drop `messages` after confirming there are no application-created records that need retention. In production-like systems, prefer a reversible deployment rather than dropping data.

### Required tests

- Member lists only own messages.
- Member sends message.
- Receiver marks own message read.
- Sender/receiver delete behavior.
- Nonparticipant cannot read, reply to, mark, or delete a message.
- Admin authorization remains intact.

## Payment schema gaps requiring a separate migration

**REQUIRES APPROVAL**

The current local schema lacks the constraints necessary for reliable payment integrity:

- `payments.reference` must be unique.
- `payments.transaction_id` should be unique where non-null.
- `payments.user_id` should FK to `users(id)`.
- `memberships.user_id` must be unique to make activation upserts safe.
- `membership_payments.reference` should be unique.
- `cycle_payment_status(user_id, cycle_year)` must be unique.
- `user_membership_status.user_id` must be unique.
- Payment lifecycle fields need expansion/normalization:
  - `processing`
  - `success` or canonical `completed`
  - `failed`
  - `cancelled`
  - `expired`
  - `refunded`
- Audit columns/events should record verification source and gateway payload hash, not raw sensitive payloads.

A schema-normalization proposal is required before reactivating payment writes.

## Decision classification

| Decision | Classification |
|---|---|
| Local DB is behind current code | VERIFIED |
| Minimal `user_category` migration needed | VERIFIED / REQUIRES APPROVAL |
| Existing migration bundles unrelated business/data changes | VERIFIED |
| `messages` additive migration needed | VERIFIED / REQUIRES APPROVAL |
| Payment uniqueness/FK constraints needed | VERIFIED / REQUIRES APPROVAL |
| Applying any migration now | REQUIRES APPROVAL |
