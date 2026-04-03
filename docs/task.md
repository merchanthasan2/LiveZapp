# LiveZapp — Task Checklist

## Phases 1–9 (Complete) ✅

### Phase 1 — Scaffold & Design System
- [x] `package.json` — all deps
- [x] `tailwind.config.js` — design tokens, `glass-card`, `btn-primary`, gradients
- [x] `postcss.config.mjs` — ESM `export default` (fixed CommonJS bug)
- [x] `tsconfig.json`, `next.config.js`, `jest.config.js`
- [x] `app/globals.css` — CSS variables, utility classes

### Phase 2 — Domain Type System
- [x] `types/domain.ts` — PresentationType, PresentationStatus, BaseQuestion, QuizQuestion, QAQuestion, FeedbackQuestion, Question, QuestionSet, Presentation
- [x] `types/auth.ts` — Role, BaseUser, AdminUser, RegularUser, User (discriminated union)
- [x] `types/plans.ts` — PlanId, PlanLimits, PlanFeatureFlags, Plan, PLANS (4 tiers)
- [x] `types/join.ts` — JoinConfig, DEFAULT_JOIN_CONFIG, LiveSession, QRSettings, generateJoinCode
- [x] `types/index.ts` — barrel re-export + UI types (TrafficMetric, Testimonial, StatCard, NavLink, UsageStats, DashboardPresentation)

### Phase 3 — Shared Layout
- [x] `components/Navbar.tsx` — scroll-blur, mobile slide-over
- [x] `components/Footer.tsx`
- [x] `app/layout.tsx` — Inter font, gradient body, SEO metadata

### Phase 4 — Home Page
- [x] `components/home/HeroSection.tsx`
- [x] `components/home/FeaturesSection.tsx`
- [x] `components/home/HowItWorks.tsx`
- [x] `components/home/PricingPreview.tsx`
- [x] `components/home/QuantumStepSection.tsx`
- [x] `components/home/Testimonials.tsx`
- [x] `app/page.tsx`

### Phase 5 — Marketing Pages
- [x] `app/plans/page.tsx` — updated to new Plan type (pricePerMonth, limits.*, features.canUse*, exportFormats)
- [x] `app/about/page.tsx`
- [x] `app/contact/page.tsx` — RHF + Zod, success state

### Phase 6 — Auth Pages
- [x] `app/login/page.tsx` — glass card, RHF + Zod, show/hide password
- [x] `app/register/page.tsx` — glass card, RHF + Zod, strong password, success state

### Phase 7 — Mock & Sample Data
- [x] `mock/sampleData.ts` — SAMPLE_PRESENTATIONS (quiz/qa/feedback), all QUIZ/QA/FEEDBACK question sets
- [x] `lib/data/mockData.ts` — slimmed to DashboardPresentation rows, traffic, testimonials
- [x] `lib/hooks/useAuth.ts` — updated to User/Role/PlanId domain types

### Phase 8 — App Shells
- [x] `app/app/layout.tsx` — sidebar layout
- [x] `app/app/dashboard/page.tsx` — filterable table (draft/scheduled/live/completed), usage bars
- [x] `app/admin/layout.tsx` — admin sidebar with Settings link
- [x] `app/admin/page.tsx` — isAdmin guard, stat cards, Recharts chart
- [x] `app/admin/settings/page.tsx` — JoinConfig editor (6/8/10 digits), QR best-practice tips, live QR preview with branding CTA

### Phase 9 — Docs & Tests
- [x] `README.md`
- [x] `docs/architecture.md`
- [x] `docs/design-system.md`
- [x] `docs/phases.md`
- [x] `docs/implementation_plan.md` (this plan, stored in docs/)
- [x] `docs/task.md` (this checklist, stored in docs/)
- [x] `__tests__/Navbar.test.tsx`
- [x] `__tests__/PricingCards.test.tsx`

---

## Phase 10 — Firebase Authentication ✅
- [x] `.env.local` — Firebase config vars
- [x] `lib/firebase.ts` — initialize SDK, replace stubs
- [x] `lib/hooks/useAuth.ts` — replace with `onAuthStateChanged`, handling real Auth state and auto-provisioning
- [x] Repair corrupted dependencies post-npm-update
- [x] Verify login redirects and admin dashboard rendering
- [x] Route Guards — protect `/app`, `/admin` (layout level)
- [x] Email confirmation on register (Deferred - testing mode)

## Phase 11 — Realtime Data Layer ✅
- [x] Initial RTDB Schema alignment (using `/users` path)
- [x] Implement `PresentationService` for RTDB CRUD
- [x] Implement `QuestionService` for RTDB CRUD
- [x] Connect Dashboard to RTDB (Real Data Sync)
- [x] Deploy RTDB Security Rules
- [x] Premium Dashboard UI Polishing (Animations & Refinements)
- [x] `lib/services/JoinCodeService.ts` — `generateUniqueCode()` with RTDB uniqueness check + claim/release
- [x] `lib/services/AdminConfigService.ts` — load/save `/admin/config` in RTDB
- [x] `app/admin/settings/page.tsx` — wired to AdminConfigService (load on mount, save to RTDB)

## Phase 12 — Presentation Builder ✅
- [x] Build Builder Shell (Header, Tabs, Settings)
- [x] Implement Question List view (inline delete, count vs limit)
- [x] Build Question Type Editors (Quiz, Q&A, Feedback — all 4 feedback subtypes)
- [x] Tier Limit Checks — derived from `PLANS` canonical data (not hardcoded)
- [x] Preview Mode — participant-view slide-in panel with interactive mock UI
- [x] Save success toast + unsaved-changes indicator

## Phase 12.5 — UI/UX Redesign ✅  (Design overhaul — "Broadcast Studio" dark theme)
- [x] `tailwind.config.js` — new dark palette (indigo/violet/coral-live), glow shadows, Syne+DM Sans fonts, orb/live keyframes
- [x] `app/globals.css` — full dark design system: animated orb background, dot-grid, dark glass cards, `.btn-primary/.btn-live/.btn-ghost/.btn-secondary`, `.live-badge/.live-dot`, `.nav-item/.nav-item-active`, usage bars with glow, gradient text/bg utilities
- [x] `app/layout.tsx` — Syne (display) + DM Sans (body) from next/font/google; ambient orb divs injected
- [x] `app/app/layout.tsx` — dark sidebar: brand wordmark, gradient-ring avatar, plan badge, glowing active nav, system status widget
- [x] `app/app/dashboard/page.tsx` — dark broadcast-studio dashboard: Syne headings, live badge in header, type-accented presentation cards (quiz=indigo/qa=blue/feedback=green), redesigned status badges, gradient stat cards with top accent borders, usage bars with warning glow

## Phase 13 — Live Session Engine ✅
- [x] Firebase RTDB for real-time responses
- [x] Presenter view with live charts/results (current-question response visuals)
- [x] Participant join by code
- [x] Quiz leaderboard (shown on session end)

## Phase 14 — Admin Analytics ✅
- [x] Real traffic data → Recharts (traffic analytics dashboard)
- [x] Date-range filtering for traffic charts
- [ ] Firestore aggregation for stat cards

## Phase 15 — Payments & Launch ✅
- [x] PayPal billing (subscription billing)
- [x] Server-side plan limit enforcement (plan caps enforced in backend services)
- [ ] `/privacy`, `/terms`
- [ ] SEO: sitemap.xml, robots.txt
- [ ] Vercel deploy → livezapp.quantumstep.in
