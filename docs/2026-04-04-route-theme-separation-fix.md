# Route Theme Separation Fix

Date: 2026-04-04

## What We Fixed

- Added route-aware theme defaults in `lib/contexts/ThemeContext.tsx`
  - standard site and app routes default to light
  - admin and presenter routes default to dark
  - theme preference now persists separately for standard and immersive route groups

- Added `components/RouteFrame.tsx`
  - centralizes when global navbar/footer should render
  - removes unwanted shared chrome from login, register, join, admin, app, and checkout flows
  - avoids extra top padding on routes that provide their own shell

- Updated `app/layout.tsx`
  - root layout now delegates page chrome to `RouteFrame`

- Updated `components/Navbar.tsx` and `components/Footer.tsx`
  - hardens route exclusions so admin/app/join/auth screens do not accidentally inherit site chrome

- Updated `app/globals.css`
  - switched the global baseline from dark-first to light-first
  - dark mode remains available through the `.dark` class

- Updated `app/app/layout.tsx`
  - presenter routes now bypass the regular app shell
  - standard app routes use a light-first dashboard shell by default
  - removed redundant floating mobile create button to reduce duplicate navigation chrome

- Updated `app/app/dashboard/page.tsx`
  - dashboard now follows the shared theme context instead of being hardcoded dark
  - card, text, filter, modal, and action treatments now adapt correctly in light and dark

## Validation

- `npm run build` passes successfully after the changes.

## Remaining Follow-Up

- `app/app/create/page.tsx`
- `app/app/create/[id]/page.tsx`
- `app/app/settings/page.tsx`
- several admin subpages still need full component-level restyling to match the finalized mockup language perfectly

The route/theme foundation is now corrected, which makes those remaining page-level visual refinements safer to do without reintroducing chrome and navigation regressions.
