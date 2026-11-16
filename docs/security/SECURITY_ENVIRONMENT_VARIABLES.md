# Security Environment Variables — Phase 0

Date: 2026-11-02  
This document names required configuration only. Do not commit or log actual values.

## Required for authentication

| Variable | Required | Minimum / format | Purpose |
|---|---:|---|---|
| `JWT_SECRET` | Yes | At least 32 bytes of high-entropy random material | Signs and verifies member access JWTs. Missing, too-short, or known public values fail closed. |
| `JWT_REFRESH_SECRET` | Required if refresh endpoint is enabled | At least 32 bytes, distinct from `JWT_SECRET` | Verifies refresh tokens. Missing/short values return `503`. |
| `NEXTAUTH_SECRET` | Required if NextAuth is enabled | High-entropy random value | Signs NextAuth session/JWT data. |

Changing `JWT_SECRET` invalidates existing application JWTs. Changing `JWT_REFRESH_SECRET` invalidates refresh tokens. Deploy by invalidating sessions and requiring reauthentication.

## Database

| Variable | Required | Purpose |
|---|---:|---|
| `MYSQL_HOST` | Environment-dependent | DB host. Local fallback is `localhost`. |
| `MYSQL_PORT` | Environment-dependent | DB port. Local fallback is `3306`. |
| `MYSQL_USER` | Environment-dependent | DB username. |
| `MYSQL_PASSWORD` | Environment-dependent | DB password. |
| `MYSQL_DATABASE` | Environment-dependent | DB name. Local fallback is `next_auth`. |
| `MYSQL_SSL_CA` | Required for TLS verification when configured | CA path for non-localhost DB TLS. |
| `MYSQL_SSL_CERT` | Optional | Client certificate path. |
| `MYSQL_SSL_KEY` | Optional | Client key path. |

Do not use production DB credentials for tests.

## Email

| Variable | Required | Purpose |
|---|---:|---|
| `EMAIL_HOST` | For password-reset delivery | SMTP host. |
| `EMAIL_PORT` | For password-reset delivery | SMTP port. |
| `EMAIL_USER` | For password-reset delivery | SMTP user. |
| `EMAIL_PASS` | For password-reset delivery | SMTP credential. |
| `EMAIL_FROM` | For password-reset delivery | Sender identity. No hardcoded fallback remains. |
| `RESEND_API_KEY` | For Resend-backed emails | Report/approval email delivery; missing value returns `503`. |
| `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_BASE_URL` | Recommended | Public base URL for reset/report links. |

## Internal jobs

| Variable | Required | Minimum | Purpose |
|---|---:|---|---|
| `CRON_SECRET` | Required to invoke cron APIs | At least 32 bytes | Authenticates `x-cron-secret`. If absent, central policy returns `403`. |

## Payment gateway — currently blocked

| Variable | Required before enabling | Purpose |
|---|---:|---|
| `AZAMPAY_ENVIRONMENT` | Yes | `sandbox` or `production`. |
| `AZAMPAY_CLIENT_ID` | Yes | Gateway client identifier. |
| `AZAMPAY_CLIENT_SECRET` | Yes | Gateway credential. |
| `AZAMPAY_APP_NAME` | Yes | Registered app name. |
| `AZAMPAY_CALLBACK_URL` | Yes | Registered callback URL. |
| `AZAMPAY_TEST_MODE` | No; `true` only for controlled non-production tests | Must not be used to activate memberships. |
| `AZAMPAY_CALLBACK_PUBLIC_KEY` or documented equivalent | Yes | Callback signature verification key; exact name/protocol must come from official AzamPay integration docs. |

Payment completion remains disabled until the callback authenticity contract and server-side status verification are configured and tested with sandbox credentials.

## Cookie policy

- Session token cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, path `/`.
- Development may use `Secure=false` only on local HTTP.
- Do not expose tokens in response logs.
