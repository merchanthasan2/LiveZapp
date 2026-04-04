# LiveZapp â€” Task Checklist

## Phases 1â€“9 (Complete) âœ…

### Phase 1 â€” Scaffold & Design System
- [x] `package.json` â€” all deps
- [x] `tailwind.config.js` â€” design tokens, `glass-card`, `btn-primary`, gradients
- [x] `postcss.config.mjs` â€” ESM `export default` (fixed CommonJS bug)
- [x] `tsconfig.json`, `next.config.js`, `jest.config.js`
- [x] `app/globals.css` â€” CSS variables, utility classes

### Phase 2 â€” Domain Type System
- [x] `types/domain.ts` â€” PresentationType, PresentationStatus, BaseQuestion, QuizQuestion, QAQuestion, FeedbackQuestion, Question, QuestionSet, Presentation
- [x] `types/auth.ts` â€” Role, BaseUser, AdminUser, RegularUser, User (discriminated union)
- [x] `types/plans.ts` â€” PlanId, PlanLimits, PlanFeatureFlags, Plan, PLANS (4 tiers)
- [x] `types/join.ts` â€” JoinConfig, DEFAULT_JOIN_CONFIG, LiveSession, QRSettings, generateJoinCode
- [x] `types/index.ts` â€” barrel re-export + UI types (TrafficMetric, Testimonial, StatCard, NavLink, UsageStats, DashboardPresentation)

### Phase 3 â€” Shared Layout
- [x] `components/Navbar.tsx` â€” scroll-blur, mobile slide-over
- [x] `components/Footer.tsx`
- [x] `app/layout.tsx` â€” Inter font, gradient body, SEO metadata

### Phase 4 â€” Home Page
- [x] `components/home/HeroSection.tsx`
- [x] `components/home/FeaturesSection.tsx`
- [x] `components/home/HowItWorks.tsx`
- [x] `components/home/PricingPreview.tsx`
- [x] `components/home/QuantumStepSection.tsx`
- [x] `components/home/Testimonials.tsx`
- [x] `app/page.tsx`

### Phase 5 â€” Marketing Pages
- [x] `app/plans/page.tsx` â€” updated to new Plan type (pricePerMonth, limits.*, features.canUse*, exportFormats)
- [x] `app/about/page.tsx`
- [x] `app/contact/page.tsx` â€” RHF + Zod, success state

### Phase 6 â€” Auth Pages
- [x] `app/login/page.tsx` â€” glass card, RHF + Zod, show/hide password
- [x] `app/register/page.tsx` â€” glass card, RHF + Zod, strong password, success state

### Phase 7 â€” Mock & Sample Data
- [x] `mock/sampleData.ts` â€” SAMPLE_PRESENTATIONS (quiz/qa/feedback), all QUIZ/QA/FEEDBACK question sets
- [x] `lib/data/mockData.ts` â€” slimmed to DashboardPresentation rows, traffic, testimonials
- [x] `lib/hooks/useAuth.ts` â€” updated to User/Role/PlanId domain types

### Phase 8 â€” App Shells
- [x] `app/app/layout.tsx` â€” sidebar layout
- [x] `app/app/dashboard/page.tsx` â€” filterable table (draft/scheduled/live/completed), usage bars
- [x] `app/admin/layout.tsx` â€” admin sidebar with Settings link
- [x] `app/admin/page.tsx` â€” isAdmin guard, stat cards, Recharts chart
- [x] `app/admin/settings/page.tsx` â€” JoinConfig editor (6/8/10 digits), QR best-practice tips, live QR preview with branding CTA

### Phase 9 â€” Docs & Tests
- [x] `README.md`
- [x] `docs/architecture.md`
- [x] `docs/design-system.md`
- [x] `docs/phases.md`
- [x] `docs/implementation_plan.md` (this plan, stored in docs/)
- [x] `docs/task.md` (this checklist, stored in docs/)
- [x] `__tests__/Navbar.test.tsx`
- [x] `__tests__/PricingCards.test.tsx`

---

## Phase 10 â€” Firebase Authentication âœ…
- [x] `.env.local` â€” Firebase config vars
- [x] `lib/firebase.ts` â€” initialize SDK, replace stubs
- [x] `lib/hooks/useAuth.ts` â€” replace with `onAuthStateChanged`, handling real Auth state and auto-provisioning
- [x] Repair corrupted dependencies post-npm-update
- [x] Verify login redirects and admin dashboard rendering
- [x] Route Guards â€” protect `/app`, `/admin` (layout level)
- [x] Email confirmation on register (Deferred - testing mode)

## Phase 11 â€” Realtime Data Layer âœ…
- [x] Initial RTDB Schema alignment (using `/users` path)
- [x] Implement `PresentationService` for RTDB CRUD
- [x] Implement `QuestionService` for RTDB CRUD
- [x] Connect Dashboard to RTDB (Real Data Sync)
- [x] Deploy RTDB Security Rules
- [x] Premium Dashboard UI Polishing (Animations & Refinements)
- [x] `lib/services/JoinCodeService.ts` â€” `generateUniqueCode()` with RTDB uniqueness check + claim/release
- [x] `lib/services/AdminConfigService.ts` â€” load/save `/admin/config` in RTDB
- [x] `app/admin/settings/page.tsx` â€” wired to AdminConfigService (load on mount, save to RTDB)

## Phase 12 â€” Presentation Builder âœ…
- [x] Build Builder Shell (Header, Tabs, Settings)
- [x] Implement Question List view (inline delete, count vs limit)
- [x] Build Question Type Editors (Quiz, Q&A, Feedback â€” all 4 feedback subtypes)
- [x] Tier Limit Checks â€” derived from `PLANS` canonical data (not hardcoded)
- [x] Preview Mode â€” participant-view slide-in panel with interactive mock UI
- [x] Save success toast + unsaved-changes indicator

## Phase 12.5 â€” UI/UX Redesign âœ…  (Design overhaul â€” "Broadcast Studio" dark theme)
- [x] `tailwind.config.js` â€” new dark palette (indigo/violet/coral-live), glow shadows, Syne+DM Sans fonts, orb/live keyframes
- [x] `app/globals.css` â€” full dark design system: animated orb background, dot-grid, dark glass cards, `.btn-primary/.btn-live/.btn-ghost/.btn-secondary`, `.live-badge/.live-dot`, `.nav-item/.nav-item-active`, usage bars with glow, gradient text/bg utilities
- [x] `app/layout.tsx` â€” Syne (display) + DM Sans (body) from next/font/google; ambient orb divs injected
- [x] `app/app/layout.tsx` â€” dark sidebar: brand wordmark, gradient-ring avatar, plan badge, glowing active nav, system status widget
- [x] `app/app/dashboard/page.tsx` â€” dark broadcast-studio dashboard: Syne headings, live badge in header, type-accented presentation cards (quiz=indigo/qa=blue/feedback=green), redesigned status badges, gradient stat cards with top accent borders, usage bars with warning glow

## Phase 13 â€” Live Session Engine âœ…
- [x] Firebase RTDB for real-time responses
- [x] Presenter view with live charts/results (current-question response visuals)
- [x] Participant join by code
- [x] Quiz leaderboard (shown on session end)

## Phase 14 â€” Admin Analytics âœ…
- [x] Real traffic data â†’ Recharts (traffic analytics dashboard)
- [x] Date-range filtering for traffic charts
- [x] Firestore aggregation for stat cards

## Phase 15 â€” Payments & Launch âœ…
- [x] PayPal billing (subscription billing)
- [x] Server-side plan limit enforcement (plan caps enforced in backend services)
- [ ] `/privacy`, `/terms`
- [ ] SEO: sitemap.xml, robots.txt
- [ ] Vercel deploy â†’ livezapp.quantumstep.in

---

## Phase X Backlog (Current)

### Product pages
- [ ] Phase X-4: App pages - Dashboard, Create wizard, Settings, Checkout
- [ ] Phase X-5: Admin pages - all pages under `/admin`
- [ ] Phase X-6: Presenter & Participant screens
- [ ] Phase X-7: Polish - mobile, animations, dark mode consistency

### Hero refinement
- [x] HR-1: Replace `JoinWidget` with `JoinCodeCard`
- [x] HR-2: Promote `MockDashboardCard` as sole right-column visual
- [x] HR-3: Add trust strip between CTAs and feature pills
- [x] HR-4: Upgrade feature pills with icons

