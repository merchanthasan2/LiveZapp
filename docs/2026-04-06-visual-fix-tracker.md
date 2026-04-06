# Visual Fix Tracker

Date: 2026-04-06

This tracker logs UI defects and polish requests raised during live testing so nothing gets missed between iterations.

## Incoming Requests

- [x] Fullscreen presenter QR frame looked rectangular/off-center.
  - Fixed by enforcing square white QR frames in presenter lobby + fullscreen join slide.

- [x] Sidebar `Sign out` looked like old faded styling.
  - Fixed in both app sidebar and admin sidebar with updated visual tokens.

- [x] Logged-in `/plans` page looked like old visuals / low-contrast text.
  - Fixed by moving pricing screen typography/surface styling to the current light editorial palette and updated plan-card emphasis.

- [x] Global center-alignment polish across mobile and desktop shells.
  - Applied to app shell, admin shell, participant screens, and presenter screens.

- [x] Admin panel stuck on `Loading analytics overview...`.
  - Refactored admin stats loading to RTDB-first with timeout fallback and added explicit retry/error state on `/admin`.

- [x] Admin experience should default to light mode.
  - Updated admin shell + overview visuals to light-first styling and removed `/admin` dark-default theme behavior.

- [x] Add mandatory purchase address re-confirmation controls.
  - Added global checkout policy in Admin Settings + per-user override in Admin Users, and enforced checkout re-save before payment when enabled.

- [x] Show `Upgrade your plan` in profile menu for all non-Pro plans.
  - Updated profile dropdown CTA visibility and label logic (hidden only for Pro).

- [x] Add reduced-screen side-menu option in dashboard mode.
  - Added mobile hamburger side drawer in app shell while preserving bottom navigation.

- [x] Reconcile stale `live` statuses on dashboard cards.
  - Added live-session reconciliation during dashboard hydration and routed true-live cards to presenter controls.

- [~] Remove remaining yellow/gold accent residues from shared theme.
  - Completed pass for navbar/footer and admin financial palette.
  - Remaining sweeps tracked for home hero/legacy accent components where yellow was historically used as primary brand tone.

- [x] Fix admin typography scale inconsistency (oversized sidebar/menu text).
  - Normalized admin shell sidebar width and font scale for links, actions, and sign-out controls.

- [~] Admin plans page had dark legacy surface + card overflow/misalignment.
  - Converted plans/pricing panel to light-admin surfaces, improved responsive card grid, and added wrapping guards for long values.
  - Added entitlement editing controls (feature flags + export format overrides) alongside limit edits.

- [x] Clarify exchange-rate source + expose last-sync + sync-on-demand control.
  - Added admin rate sync endpoint (`/api/admin/pricing-rates`) and UI controls with source and synced timestamp metadata in pricing engine.

- [~] User administration lacked full backend control path.
  - Added secured admin manage endpoint (`/api/admin/users/manage`) for role/plan/password/verification/reset/delete/sync actions.
  - Users page wired with sync-missing-users control and new drawer actions.
  - Pending final verification after new Firebase project credentials are applied.

- [x] Add Google account based authentication option.
  - Added `Continue with Google` on `/login` using Firebase Google provider popup auth and improved sign-in error messaging.

- [x] Dev runtime chunk error (`Cannot find module './1682.js'`) after iterative changes.
  - Resolved by clearing stale `.next` artifacts, removing stale port-3000 process, and relaunching a clean Next dev server instance.

- [x] Default option seed text required manual deletion in question editor.
  - Updated quiz/poll option inputs so seeded labels like `Option A` auto-clear on first focus and behave like placeholders during editing.

- [x] Question builder flow felt too long; missing visible next-question action near option controls.
  - Set quiz/poll default options to one response, and moved `Next question` action into the editor directly below response settings (including below poll `Allow multiple selections`) in both create and edit flows.

## Next UI Checks

- Validate `/plans` in both logged-in and logged-out states on mobile + desktop.
- Validate sidebar actions (`Admin`, `Sign out`) hover and contrast in light + dark modes.
- Validate presenter lobby layout at laptop and projector widths after centered-shell updates.
- Validate checkout with global address confirmation ON + OFF.
- Validate checkout with per-user address confirmation override ON + OFF.
- Validate dashboard stale `live` cleanup against sessions with missing/inactive `live_sessions` records.
