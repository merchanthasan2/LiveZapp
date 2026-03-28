# LiveZapp — Phased Roadmap

## ✅ Phase 1 — Scaffold & Design System
Config, Tailwind tokens, TypeScript types, Firebase stubs, global CSS.

## ✅ Phase 2 — Shared Layout
Navbar (blurred, mobile slide-over), Footer, root `app/layout.tsx`.

## ✅ Phase 3 — Home Page
Hero, Features, How it works, Pricing preview, QuantumStep section, Testimonials.

## ✅ Phase 4 — Marketing Pages
`/plans` (full table + checkmarks), `/about`, `/contact` (React Hook Form + Zod).

## ✅ Phase 5 — Auth Pages
`/login` and `/register` with glassmorphism cards, RHF + Zod validation, stub submit handlers.

## ✅ Phase 6 — App Shells
`/app/dashboard` (presentations table, usage bars), `/admin` (isAdmin guard, stat cards, Recharts chart), nested layouts.

## ✅ Phase 7 — Tests & Docs
Jest + RTL tests for Navbar and PricingCards. README.md, docs/architecture.md, docs/design-system.md.

---

## 🔜 Phase 8 — Firebase Authentication
- [ ] Add real Firebase config to `.env.local`
- [ ] Initialize Firebase in `lib/firebase.ts`
- [ ] Replace `useAuth` stub with `onAuthStateChanged` listener
- [ ] Protect `/app/*` and `/admin` with Next.js middleware
- [ ] Send confirmation email on register

## 🔜 Phase 9 — Firestore Data Layer
- [ ] Create Firestore collections: `users`, `presentations`, `questions`, `sessions`
- [ ] Replace `MOCK_PRESENTATIONS` with real Firestore reads
- [ ] Write presentation CRUD operations via `lib/presentations.ts`
- [ ] Add React Query for data fetching and cache invalidation

## 🔜 Phase 10 — Presentation Builder
- [ ] `/app/create` — multi-step presentation creation wizard
- [ ] Question types: multiple choice, poll, word cloud, open text
- [ ] Preview mode before going live

## 🔜 Phase 11 — Live Session Engine
- [ ] Firebase RTDB or Firestore for real-time audience response updates
- [ ] Presenter view: display live charts and results as responses arrive
- [ ] Participant view: join by code, submit answers, see leaderboard

## 🔜 Phase 12 — Admin Analytics
- [ ] Connect `/admin` traffic chart to real data (Google Analytics / Firestore)
- [ ] Replace mock stat cards with Firestore aggregation queries
- [ ] Add date-range filtering for traffic charts

## 🔜 Phase 13 — Payments & Plans
- [ ] Integrate Stripe (or Razorpay for India) for subscription billing
- [ ] Enforce plan limits on presentations, questions, and audience size server-side
- [ ] Upgrade / downgrade flows with Stripe webhooks

## 🔜 Phase 14 — Polish & Launch
- [ ] Add `/privacy` and `/terms` pages (legal content)
- [ ] SEO: sitemap.xml, robots.txt, structured data
- [ ] Performance audit: Lighthouse score target 90+
- [ ] Deploy to Vercel with `livezapp.quantumstep.in` subdomain
- [ ] Set up CI/CD with GitHub Actions
