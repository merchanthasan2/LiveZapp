# LiveZapp - Architecture Overview

## Project type

Next.js 14 App Router application built with TypeScript and Tailwind CSS.
Firebase Auth and Realtime Database power the core app flows. Firestore is
used selectively for admin analytics when available, with RTDB fallback.
PayPal-backed checkout flows are handled through Next.js API routes.

---

## Route groups

- Public marketing: `/`, `/plans`, `/about`, `/contact`, `/login`, `/register`, `/checkout`
- Join flows: `/join`, `/join/[code]`
- Authenticated app: `/app/dashboard`, `/app/create`, `/app/create/[id]`, `/app/present/[id]`, `/app/settings`
- Admin: `/admin`, `/admin/users`, `/admin/traffic`, `/admin/plans`, `/admin/promos`, `/admin/sessions`, `/admin/settings`, `/admin/seo`, `/admin/financials`, `/admin/logs`, `/admin/members`
- API routes: contact form, local IP helper, PayPal order endpoints, promo endpoints, traffic tracking, and logo upload

---

## Directory structure

```text
Live-Zapp v01/
|-- app/                     # App Router routes, layouts, API handlers
|-- components/              # Shared UI, route-level sections, question editors
|-- lib/
|   |-- data/                # Remaining mock/demo-only UI data
|   |-- hooks/               # React hooks such as useAuth, useCurrency, usePlanLimits
|   |-- services/            # Firebase/RTDB/Firestore service layer
|   `-- promo/               # Promo-code helpers and built-in promo definitions
|-- mock/                    # Sample domain data used for demos and scaffolding
|-- public/                  # Static assets, logos, images
|-- types/                   # Shared domain contracts
|-- __tests__/               # Jest + React Testing Library smoke tests
`-- docs/                    # Product, design, and implementation notes
```

---

## Layer responsibilities

| Layer | Responsibility |
|---|---|
| `app/` | Route segments, layouts, page composition, metadata, API routes |
| `components/` | Reusable UI and route-specific client components |
| `lib/firebase.ts` | Real Firebase SDK bootstrap for Auth, Firestore, RTDB, and Storage |
| `lib/hooks/` | Client hooks for auth, currency/pricing, plan limits, and shared state |
| `lib/services/` | Reads/writes for presentations, questions, live sessions, branding, analytics, and join codes |
| `lib/data/` | Remaining mock/test-friendly data that is not part of the live backend |
| `types/` | Canonical TypeScript types shared across app, services, and tests |
| `__tests__/` | Smoke tests for key UI entry points and pricing/navigation behavior |

---

## Data flow

### Authentication

```text
Firebase Auth -> useAuth -> route layouts/pages/components
```

### Core app data

```text
RTDB -> lib/services/* -> client pages/components
```

### Admin overview

```text
Firestore -> AdminStatsService -> fallback to RTDB when Firestore is empty/unavailable
```

### Payments and promotions

```text
UI -> Next.js API routes -> PayPal / promo services -> RTDB user and plan state
```

---

## Rendering strategy

| Area | Rendering |
|---|---|
| Marketing shell | Mixed; layouts are server components, interactive sections are client components |
| Forms and dashboards | Client components |
| Presenter and participant flows | Client-heavy for live state and interaction |
| Admin pages | Client-heavy because they depend on live reads, charts, and filters |

---

## Tooling

- `npm run build` performs a clean production build
- `npm test` runs Jest with shared mocks in `jest.setup.ts`
- `npm run lint` uses the checked-in `.eslintrc.json`
