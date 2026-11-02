# UI / UX Audit

**Method and limits:** pages were enumerated from `app/**/page.tsx` (≈45) and fetched at runtime (HTTP status/redirect) as anonymous and as an approved member against the local dev server; component source was read for flows. A visual walk-through in a browser (screenshots, responsive and screen-reader testing) was **not** performed in this phase — those items are marked Unknown.

## Navigation & access (runtime)
| Page | Anonymous | Member |
|---|---|---|
| `/`, `/about`, `/contact` | 307 → `/auth/login` | 200 |
| `/auth/login`, `/auth/register` | 200 | 200 |
| `/dashboard`, `/dashboard/payment` | 307 → login | 200 |
| `/admin`, `/admin/users` | 307 → login | 307 → `/dashboard` |
Finding U1: public marketing pages (home, about, contact, privacy/terms) are behind login because `middleware.ts` only whitelists auth pages — prospective members cannot read about TLA before registering.

## User flows
- **Prospective member:** register → "pending approval" page → wait for admin email. No status lookup beyond login attempt; email depends on SMTP.
- **Registered member:** dashboard → complete profile → payment page (multiple gateways page + "subscribe" + early pay) → card. Amounts shown come from `lib/membership-pricing.ts`, which can differ from what the server charges (`membership/pay`, legacy engine) — U2: quoted vs charged mismatch.
- **Admin:** requests (approve/reject), users (bulk actions TODO), payments/payment (manual entry), reports & charts, events, news, content, cards.
- **Finance officer / other roles:** no such role exists (Not found).

## States, forms, accessibility (source review)
- Loading/error states exist in most client pages (spinners, toast/alert), but API errors frequently surface raw server messages (e.g. SQL errors) to users (U3).
- Forms: register/profile use controlled forms with client checks; server-side validation is minimal (no schema validation library on API side).
- Accessibility, responsiveness, keyboard navigation, contrast: **Unknown** (needs browser/axe pass).
- Dev pages reachable by authenticated users: `/fix-auth`, `/test-membership-card` (U4).
