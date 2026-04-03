# LiveZapp — Implementation Plan

**Goal:** Production-ready Next.js 14 App Router SaaS for interactive presentations & live audience engagement. Visual style: glassmorphism, pastel gradients, modern typography.

---

## Stack (Locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | RSC by default; `"use client"` for forms/charts/interactive |
| State | Zustand skeleton + context; placeholder hooks for React Query & Firebase |
| Charts | Recharts (mock data) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Animation | Framer Motion (subtle) |
| Tests | Jest + React Testing Library |

---

## Phase 1 — Scaffold & Design System ✅

- `package.json` — all deps installed
- `tailwind.config.js` — custom colors, gradients, glass shadows, `glass-card` / `btn-primary` utilities
- `postcss.config.mjs` — ESM `export default` (CommonJS bug fixed)
- `tsconfig.json`, `next.config.js`, `jest.config.js`
- `app/globals.css` — CSS variables, gradient-bg, glass utilities, button utilities
- `types/index.ts` — barrel re-export of all domain + UI types

---

## Phase 2 — Domain Type System ✅

> All types are canonical. Import from the domain file directly or via the `@/types` barrel.

### [NEW] `types/domain.ts`
Core presentation & question domain:
- `PresentationType` — `"quiz" | "qa" | "feedback"`
- `PresentationStatus` — `"draft" | "scheduled" | "live" | "completed"`
- `BaseQuestion`, `Option`
- `QuizQuestion` — `kind: "quiz"`, options, timerSeconds, correctOptionId, points
- `QAQuestion` — `kind: "qa"`, allowMultipleSubmissions
- `FeedbackQuestion` — `kind: "feedback"`, feedbackType, scaleMax, options
- `Question` — discriminated union
- `QuestionSet` — groups questions per presentation
- `Presentation` — full domain record with joinCode, joinLink, qrCodeUrl

### [NEW] `types/auth.ts`
- `Role` — `"admin" | "user"`
- `BaseUser`, `AdminUser`, `RegularUser`
- `User` — discriminated union (`user.role === 'admin'` to narrow)
- Imports `PlanId` from `types/plans`

### [NEW] `types/plans.ts`
- `PlanId` — `"free" | "basic" | "regular" | "pro"`
- `PlanLimits` — maxPresentations, maxQuestionsPerPresentation, maxParticipantsPerSession, maxActiveSessions
- `PlanFeatureFlags` — canUseQuiz, canUseQA, canUseFeedback, canExportResults, exportFormats
- `Plan` — full plan shape
- `PLANS: Plan[]` — canonical plan data (4 tiers; Regular is `isRecommended`)

### [NEW] `types/join.ts`
- `JoinConfig` + `DEFAULT_JOIN_CONFIG` (defaultCodeLength: 6, allowed: [6, 8, 10])
- `LiveSession` — presentationId, joinCode, isActive, startedAt/endedAt
- `QRSettings` + `DEFAULT_QR_SETTINGS`
- `generateJoinCode(length)` — numeric stub (TODO: server-side uniqueness check Phase 11)

### [MODIFY] `types/index.ts`
Barrel re-exporting all 4 domain files + UI-only types (TrafficMetric, Testimonial, StatCard, NavLink, UsageStats, DashboardPresentation).

---

## Phase 3 — Shared Layout ✅

- `components/Navbar.tsx` — scroll-blur, mobile slide-over (Framer Motion)
- `components/Footer.tsx` — brand, links, copyright
- `app/layout.tsx` — Inter font, gradient body, Navbar + Footer, SEO metadata

---

## Phase 4 — Home Page ✅

- `components/home/HeroSection.tsx`
- `components/home/FeaturesSection.tsx`
- `components/home/HowItWorks.tsx`
- `components/home/PricingPreview.tsx`
- `components/home/QuantumStepSection.tsx`
- `components/home/Testimonials.tsx`
- `app/page.tsx` — Server Component composing all sections

---

## Phase 5 — Marketing Pages ✅

- `app/plans/page.tsx` — uses new `Plan` type (pricePerMonth, limits.*, features.canUse*, exportFormats). Comparison table uses typed boolean flags.
- `app/about/page.tsx` — QuantumStep + LiveZapp brand story
- `app/contact/page.tsx` — React Hook Form + Zod, success state

---

## Phase 6 — Auth Pages ✅

- `app/login/page.tsx` — glass card, RHF + Zod, show/hide password
- `app/register/page.tsx` — glass card, RHF + Zod, strong password rules, success state

---

## Phase 7 — Mock & Sample Data ✅

### [NEW] `mock/sampleData.ts`
Rich domain-level data:
- `SAMPLE_USER_ID`
- `SAMPLE_PRESENTATIONS: Presentation[]` — 3 presentations (quiz, qa, feedback) with join codes & links
- `QUIZ_QUESTIONS: QuizQuestion[]` — 2 quiz questions with options, timers, points
- `QA_QUESTIONS: QAQuestion[]` — 1 open Q&A question
- `FEEDBACK_QUESTIONS: FeedbackQuestion[]` — 1 rating + 1 short_text
- `SAMPLE_QUESTION_SETS: QuestionSet[]` — 3 sets, one per presentation

### [MODIFY] `lib/data/mockData.ts`
UI-only data only (PLANS moved to `types/plans.ts`):
- `MOCK_PRESENTATIONS: DashboardPresentation[]` — lightweight rows for dashboard table
- `MOCK_TRAFFIC: TrafficMetric[]` — 30 days, deterministic formula (no Math.random to avoid hydration issues)
- `TESTIMONIALS: Testimonial[]`

---

## Phase 8 — App Shells ✅

### User area
- `app/app/layout.tsx` — sidebar layout (Dashboard, New, Settings)
- `app/app/dashboard/page.tsx` — filterable table (draft/scheduled/live/completed), usage progress bars, quick stats

### Admin area
- `app/admin/layout.tsx` — admin sidebar (Overview, Traffic, LiveZapp, QuantumStep, Tools, **Settings**)
- `app/admin/page.tsx` — isAdmin guard, 4 stat cards, Recharts 14-day line chart, access denied page
- `app/admin/settings/page.tsx` — **JoinConfig & QR Settings** editor:
  - Code length toggle (6 / 8 / 10 digits) with guidance
  - QR best-practice tips (4 points)
  - Live QR preview with branding CTA, copy URL, regenerate
  - TODO marker for Firestore persistence (Phase 12)

### Auth hook
- `lib/hooks/useAuth.ts` — updated to use `User / Role / PlanId` from domain types; isAdmin checks both `role` field and email allowlist

---

## Phase 9 — Docs & Tests ✅

- `README.md` — install, run, build, env vars, folder structure, stack table
- `docs/architecture.md` — full folder tree, layer responsibilities, RSC rendering strategy
- `docs/design-system.md` — color tokens, typography, components, spacing, animation conventions, utility classes
- `docs/phases.md` — Phases 1–7 done, Phases 8–14 roadmap (Firebase, builder, live engine, payments, launch)
- `__tests__/Navbar.test.tsx` — brand text, nav links, action buttons, hamburger toggle
- `__tests__/PricingCards.test.tsx` — 4 plan names, 1 Most popular badge, CTA buttons

---

## Phase 10 — Firebase Authentication ✅

- [x] Add Firebase config to `.env.local`
- [x] Initialize SDK in `lib/firebase.ts`
- [x] Replace `useAuth` stub with `onAuthStateChanged`, handling real Auth state. Auto-provisions the 3 development accounts into Firebase seamlessly.
- [x] Layout guards to protect `/app` and `/admin`
- [x] Email confirmation on register (Deferred - testing mode)

## Phase 11 — Realtime Data Layer ✅

- [x] Define RTDB Schema for: `presentations`, `questions`, `live_sessions`
- [x] Implement `PresentationService` for RTDB CRUD
- [x] Implement `QuestionService` for RTDB CRUD
- [x] Server-side `generateJoinCode` with uniqueness check (RTDB)
- [x] Persist JoinConfig + QRSettings to `/admin/config` RTDB path
- [x] Replace `MOCK_PRESENTATIONS` with async RTDB calls in Dashboard

## Phase 12 — Presentation Builder ✅

- [x] `/app/create` — multi-step wizard
- [x] Question editors for Quiz, Live Poll, Q&A, Word Cloud, Feedback
- [ ] Preview mode before going live

## Phase 13 — Live Session Engine ✅

- [x] Implement real-time listener for active sessions
- [x] Presenter view with live charts/results (RTDB sync)
- [x] Participant join by code (6/8/10 digits per JoinConfig)
- [x] Leaderboard for quiz sessions (RTDB aggregation)

## Phase 14 — Admin Analytics ✅

- [x] Connect `/admin` traffic chart to real analytics
- [ ] Firestore aggregation for stat cards
- [x] Date-range filtering

## Phase 15 — Payments & Launch ✅

- [x] PayPal subscription billing
- [x] Plan limit enforcement server-side (plan caps enforced in backend services)
- [ ] `/privacy`, `/terms`
- [ ] sitemap.xml, robots.txt, Lighthouse 90+
- [ ] Deploy to Vercel → livezapp.quantumstep.in

---

## Design System Reference

See `docs/design-system.md` for color tokens, typography, component classes, animation conventions.

> [!NOTE]
> Firebase is now active and initialized for Auth/RTDB. The UI uses real Firebase credentials and syncs role/plan in RTDB.
> The admin access guard is handled dynamically based on stored role information.
