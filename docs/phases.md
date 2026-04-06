# LiveZapp - Phased Roadmap

## Completed foundation work

### Phase 1 - Scaffold and design system
- Next.js 14 App Router setup
- Tailwind design tokens and shared utilities
- TypeScript, Jest, and build configuration

### Phase 2 - Shared layout and marketing pages
- Global layout, navbar, footer
- Home page, plans, about, and contact pages

### Phase 3 - Auth and account entry
- Login and register flows
- Firebase Auth bootstrap
- Protected app/admin layouts

### Phase 4 - Core app shell and realtime data
- Dashboard backed by RTDB services
- Presentation CRUD and question CRUD
- Join-code generation and admin config persistence

### Phase 5 - Presentation builder
- Multi-step create flow
- Question editors for quiz, poll, Q&A, word cloud, and feedback
- Inline/live preview panel inside the builder

### Phase 6 - Live session engine
- Presenter view with realtime controls and results
- Participant join-by-code flow
- Leaderboard support for quiz sessions

### Phase 7 - Admin tooling
- Traffic analytics dashboard with date filtering
- Admin overview stat cards via `AdminStatsService`
- Users, sessions, promos, plans, SEO, and financial admin pages

### Phase 8 - Payments baseline
- PayPal order endpoints
- Plan limit enforcement in backend services

### Phase 9 - Test and tooling baseline
- Jest smoke tests for navbar and pricing preview
- Shared Jest setup/mocks
- Checked-in ESLint configuration

---

## Open work

### Product / UX
- Decide whether the current inline builder preview is sufficient or if a dedicated pre-live review step should be added

### Billing lifecycle
- Add webhook-backed upgrade/downgrade lifecycle handling

### Launch checklist
- Add `/privacy` and `/terms`
- Add `robots.txt` and `sitemap.xml`
- Run Lighthouse/performance polish toward the 90+ target
- Finalize deployment to the production domain
- Add CI/CD automation
