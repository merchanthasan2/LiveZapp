# LiveZapp - Implementation Plan

## Current snapshot

As of 2026-04-05, the application is in a stable development state:

- Production build passes
- TypeScript check passes
- Jest suite passes
- ESLint is configured and runs cleanly apart from existing hook-dependency warnings
- Firebase Auth and RTDB are active in the main app flow

---

## Locked stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |
| Charts | Recharts |
| Auth | Firebase Auth |
| Live data | Firebase Realtime Database |
| Admin analytics | Firestore when available, RTDB fallback |
| Payments | PayPal via Next.js API routes |
| Tests | Jest + React Testing Library |
| Linting | ESLint via `eslint-config-next` |

---

## Completed work

### 1. Foundation and design system
- App scaffold, Tailwind tokens, shared utilities, and domain types are in place

### 2. Marketing and account entry
- Home, plans, about, contact, login, and register pages are implemented

### 3. Authenticated app shell
- Dashboard, builder, presenter, join, checkout, and settings routes exist
- Admin layouts and route groups are wired up

### 4. Firebase authentication
- `lib/firebase.ts` initializes the real SDK
- `lib/hooks/useAuth.ts` listens to auth state and hydrates the user profile
- Protected app/admin flows are enforced at the layout level

### 5. Realtime data layer
- Presentation, question, live-session, branding, admin-config, and join-code services are implemented
- Dashboard and live session flows read/write against RTDB

### 6. Presentation builder
- Multi-step builder is implemented
- Question-type editors are implemented
- The builder already includes an inline participant/live preview panel

### 7. Live session engine
- Presenter controls, participant join flow, realtime responses, and quiz leaderboard are implemented

### 8. Admin analytics and operations
- Traffic analytics dashboard is live
- Admin overview stat cards are served by `AdminStatsService`
- Supporting admin pages for users, plans, promos, sessions, SEO, and financials are present

### 9. Payments baseline
- PayPal order endpoints are wired in
- Plan limits are enforced server-side in service logic

### 10. Tooling
- Jest configuration and shared test setup are now checked in
- ESLint configuration is now checked in

---

## Remaining work

### 1. Dedicated pre-live review step
- Product decision: keep the current inline preview, or add a separate preview-before-go-live step

### 2. Billing lifecycle completion
- Add webhook-driven upgrade/downgrade synchronization and renewal/cancellation handling

### 3. Legal and SEO pages
- Add `/privacy`
- Add `/terms`
- Add `robots.txt`
- Add `sitemap.xml`

### 4. Launch polish
- Run a Lighthouse/performance pass
- Finalize production deployment
- Add CI/CD automation

---

## Notes

- The admin overview stats item should be considered implemented: the current code loads Firestore data first and falls back to RTDB when needed.
- The preview-mode item is partially complete already through the builder's inline preview UI; only a dedicated review stage remains undecided.
