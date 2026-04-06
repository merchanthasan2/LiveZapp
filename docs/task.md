# LiveZapp — Task checklist

## Phases 1–9 (complete)

### Phase 1 — Scaffold and design system
- [x] `package.json` — dependencies
- [x] `tailwind.config.js` — design tokens, `glass-card`, `btn-primary`, gradients
- [x] `postcss.config.mjs` — ESM `export default`
- [x] `tsconfig.json`, `next.config.js`, `jest.config.js`
- [x] `app/globals.css` — CSS variables, utility classes

### Phase 2 — Domain type system
- [x] `types/domain.ts` — presentation and question models
- [x] `types/auth.ts` — roles and user types
- [x] `types/plans.ts` — `PLANS`, limits
- [x] `types/join.ts` — join config and live session types
- [x] `types/index.ts` — barrel exports

### Phase 3 — Shared layout
- [x] `components/Navbar.tsx`
- [x] `components/Footer.tsx`
- [x] `app/layout.tsx` — metadata, fonts

### Phase 4 — Home page
- [x] Home sections and `app/page.tsx`

### Phase 5 — Marketing pages
- [x] `app/plans/page.tsx`
- [x] `app/about/page.tsx`
- [x] `app/contact/page.tsx`

### Phase 6 — Auth pages
- [x] `app/login/page.tsx`
- [x] `app/register/page.tsx`

### Phase 7 — Mock and sample data
- [x] Sample data and hooks aligned to types

### Phase 8 — App shells
- [x] `app/app/layout.tsx`
- [x] `app/app/dashboard/page.tsx`
- [x] `app/admin/layout.tsx` and key admin pages
- [x] `app/admin/settings/page.tsx`

### Phase 9 — Docs and tests
- [x] README, architecture, design-system, phases, implementation plan
- [x] Jest tests and ESLint

---

## Phase 10 — Firebase authentication (complete)
- [x] Firebase client SDK and `useAuth`
- [x] Route guards for `/app` and `/admin`
- [ ] Email verification enforced in production (optional)

---

## Phase 11 — Realtime data layer (complete)
- [x] RTDB services for presentations, questions, join codes, admin config

---

## Phase 12 — Presentation builder (complete)
- [x] Builder UI, question editors, tier limits, preview

---

## Phase 12.5 — UI redesign (complete)
- [x] Broadcast-style app shell and dashboard styling

---

## Phase 13 — Live session engine (complete)
- [x] RTDB live sessions, presenter view, join by code, quiz leaderboard on end

---

## Phase 14 — Admin analytics (complete)
- [x] Traffic charts and analytics

---

## Phase 15 — Payments and launch
- [x] PayPal billing and plan enforcement in services
- [x] `/privacy` and `/terms` — static legal pages
- [x] SEO — `app/sitemap.ts` and `app/robots.txt/route.ts` (fallback in `lib/site.ts`)
- [ ] Production deploy and environment configuration on target host

---

## Backlog

### Product polish (optional)
- [ ] Further mobile pass and animation tuning
- [ ] Stronger dark/light consistency between marketing, app shell, and admin

### Dev experience
- [ ] **DEV-1:** Slow `next dev` / first load — baseline first paint after server is ready (not time-to-“ready”); see [dev-server-performance.md](./dev-server-performance.md)

### Security and dependencies
- [ ] Periodically run `npm audit` and upgrade Next.js patch versions

---

## Hero refinement (complete)
- [x] Join code card, dashboard mock, trust strip, feature pills
