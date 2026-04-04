## LiveZapp Fix Status Audit

Date: 2026-04-04

This file tracks the fixes and change requests raised during the current redesign and testing pass, plus the current status of each.

Status legend:
- `Done`: implemented and validated at least once locally
- `In Progress`: partially implemented, still needs completion or follow-up polish
- `Pending`: not yet implemented
- `Needs Retest`: implemented, but user confirmation is still needed after latest changes

## Foundation and Stability

- `Done` Dev server startup/runtime blockers fixed
  - Added required app-router error boundaries
  - Fixed build/runtime issues around checkout/register/share flows
  - Clean build has passed multiple times

- `Done` Route-aware theme defaults
  - Light by default on public and normal app pages
  - Dark by default on admin and presenter routes

- `Done` Route frame cleanup
  - Removed stray global navbar/footer from auth, join, app, admin, and checkout flows
  - Reduced route-to-route layout collisions

- `In Progress` Codebase cleanup / consistency sweep
  - Several major regressions have been fixed
  - There are still older mixed-theme pages and legacy components left to sweep

## Branding and Logo

- `Done` New logo assets stored in `public/brand/`
  - transparent logo-only asset
  - wordmark assets
  - favicon updated

- `In Progress` Brand rollout across every route
  - Shared brand lockup has been updated
  - Main app/admin/login/join/home usage has improved
  - Some surfaces still need final polish and better scale handling

- `Pending` Home/header logo sizing improvement
  - Current logo in the header still feels too small
  - User requested less emphasis in the header and more flexible presence in the hero if needed

## Home Page

- `Done` Home visual redesign to the new light mockup direction
  - Hero, cards, pricing, contact sections moved into the new design language

- `Done` Navigation highlight follows section scroll more accurately
  - Pricing/features active state now updates better on the home page

- `In Progress` Above-the-fold density / spacing reduction
  - Page is much cleaner now
  - Still needs further tightening so feature cards appear with less scrolling on common laptop heights

## Login and Join Entry

- `Done` Login page moved away from the old blue/yellow theme
  - Theme now aligns better with the new visual system

- `Done` Join entry page (`/join`) reworked toward the new branded style

- `In Progress` Participant journey visual polish (`/join/[code]`)
  - Route exists and works
  - Screen design has improved
  - Participant live interaction states still need deeper polish to fully match the new system

## Dashboard and App Shell

- `Done` Dashboard/app shell no longer incorrectly shows admin chrome

- `Done` App shell now has a route back to the public home page

- `Done` Current-plan CTA logic corrected
  - Users on the top tier should no longer be prompted to upgrade beyond Pro
  - Top-tier action now shifts toward plan management instead of false upgrade pressure

- `In Progress` App density and whitespace reduction
  - Dashboard remains too sparse in places
  - Layout still needs tightening and better use of width

## Zapp Creation Flow

- `Pending` True wizard-only Zapp creation flow
  - Required sequence:
    - Zapp name
    - logo
    - colour theme
    - question type
    - repeated question loop on “add another”
  - This has been captured, but not fully rebuilt yet

- `Pending` Full terminology sweep from “presentation/session” to “Zapp / Go Zapp”
  - Some high-visibility strings have been updated
  - A full consistency pass is still needed across builder, dashboard, presenter, and participant flows

## Presenter and Live Flow

- `Done` Dashboard play action now routes into launch mode
  - Launch flow was changed to use `/app/present/[id]?launch=1`

- `In Progress` Pre-live presenter screen redesign
  - Major improvement from the old question-list-first screen
  - Still needs more emphasis on program details, brand, QR, and stage actions

- `In Progress` Go-live branded lobby redesign
  - Lobby now exists in a cleaner format with QR/PIN/brand details
  - User still wants it significantly larger for projector use
  - Fullscreen action needs to be even more prominent

- `Pending` Large-scale projector optimization
  - User requested roughly 2x presence
  - Lobby content needs to auto-expand much more aggressively on large displays
  - QR code should be the dominant focal element

- `Pending` Fullscreen question/live interaction screen full redesign
  - Some presenter states still show legacy old-theme elements
  - Response panels and live canvases still need full dark-theme alignment

- `Pending` Remove question-lineup emphasis from the pre-launch presenter screen
  - User wants program/Zapp details first, not the question list

## Participant Join by QR

- `In Progress` QR / join-link bug investigation
  - Root cause identified:
    - some presenter QR states still generate join URLs from local dev origins or host assumptions
    - when the dev server runs on `127.0.0.1`, phones cannot open the QR link
  - Additional issue:
    - some presenter UI still displays misleading `live-zapp.com/live` text instead of the real join path

- `Pending` Final QR/join fix rollout
  - Move all presenter QR/copy/share states to one shared join-link generator
  - Ensure QR, displayed URL, and copied join link all match
  - Ensure local-device testing works when dev is run on a LAN-accessible host

## Pricing and Plans

- `Done` Shared pricing source moved closer to a single catalogue
  - Home
  - `/plans`
  - in-app subscription display

- `Done` Admin pricing engine redesigned at data/rules level
  - Monthly USD as base
  - Annual list price = monthly x 12
  - Annual billed price = annual list minus discount
  - GBP and INR derived from exchange-rate logic

- `In Progress` Admin pricing panel visual redesign
  - Core pricing logic has been reworked
  - The screen still needs another visual pass to match the new admin system more cleanly

- `Needs Retest` Public pricing sync from admin edits
  - Hooking and shared catalogue work were implemented
  - User needs to confirm the latest save now updates home and `/plans` reliably in every case

- `Pending` Checkout pricing full unification
  - Checkout still needs final alignment with the admin-configured pricing engine

## Admin Area

- `Done` Admin shell and overview moved toward the new dark control-panel style

- `In Progress` Admin subpage sweep
  - Some pages have been upgraded
  - Several admin subpages still show older internal styling or mixed visual layers

## Performance and Deployment

- `Done` Slow startup diagnosis
  - Main problem was compile/runtime loops during error states, not raw server startup time

- `Done` Next.js stack clarified
  - Stack remains Next.js + React + TypeScript + Firebase + Tailwind

- `Done` Hosting requirement clarified
  - Current app still requires a Node-capable runtime
  - Standard cPanel hosting without Node support cannot host it as-is

## Immediate High-Priority Pending Items

- Fix participant QR scan flow end-to-end
- Enlarge and projector-optimize the pre-live branded lobby
- Rework the pre-launch presenter screen so it emphasizes Zapp details, QR, brand, and stage actions instead of the question lineup
- Make the home/header logo treatment feel intentional and properly scaled
- Finish the true Zapp creation wizard
- Complete the mixed-theme sweep across presenter/live/admin secondary screens
