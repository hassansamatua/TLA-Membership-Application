# Improvement Roadmap (prioritized; nothing implemented — awaiting authorization)

## Phase 0 — Emergency containment (≈1–2 days)
- Remove/disable dangerous routes & dev pages (Master rec. 1); fix forgot-password (rec. 2); add `requireAdmin` to reports/admin payment/news; fail-fast on missing `JWT_SECRET`; force callback signature verification.
- Confirm whether production exposed these routes; rotate admin and user credentials if so; check prod DB for unexpected admins (ids/emails created by setup routes).

## Phase 1 — Payment integrity (≈1 week)
- Single payment completion path (AzamPay callback + server-side status query), server-computed amounts, idempotency (UNIQUE reference), remove `membership/pay` self-completion, fix refund status model and membership reversal.
- Wrap multi-table payment writes in transactions.

## Phase 2 — Data foundation (≈1 week, after prod schema dump)
- Migration tool + baseline; PK/AUTO_INCREMENT repair; orphan triage report for TLA; FKs, UNIQUE (user_id, cycle_year); consolidate membership-number generation; choose ledger of record.

## Phase 3 — Business rules (≈3–5 days after TLA decisions)
- One server-side membership-rules module; delete/redirect other engines; unit tests for the boundary table, leap years, EAT timezone, multiple cycles, exemption; client displays server quotes.

## Phase 4 — Security hardening & hygiene (≈1 week)
- Rehash legacy passwords, remove sensitive logs, rate limiting, generic errors, secure cookies, CSRF/origin checks for admin, PII purge from git, uploads to object storage, audit logging.

## Phase 5 — Quality & delivery (ongoing)
- Remove `ignoreBuildErrors`, fix TS/ESLint, sync lockfile, dependency upgrades, CI (lint/type/test/build), README + `.env.example`, monitoring/error tracking, backups & restore drill.

## Phase 6 — Functional gaps
- Public pages outside login, suspension/termination, finance-officer role, partial payments/balances, SMS provider, attendance, admin bulk actions, accessibility pass.
