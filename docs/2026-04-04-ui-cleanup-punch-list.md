# UI Cleanup Punch List

Date: 2026-04-04

This file tracks regressions and unfinished theme/flow issues discovered during live testing so they do not get lost while implementation continues.

## In Progress

- Refactor new Zapp creation to a true wizard flow:
  - Name
  - Logo
  - Colour theme
  - Question type / question loop
- Save per-Zapp branding in the creation flow.
- Reduce oversized whitespace in app/create and add atmospheric purple fill where canvases feel empty.
- Tighten shared app-shell spacing so pages do not feel overly sparse.
- Home hero and features stack has been tightened, but continue checking above-the-fold density on laptop heights.
- Public home pricing, `/plans`, and in-app subscription display now need to stay aligned to the shared pricing catalogue during follow-up changes.

## Presenter / Live Flow

- Pre-live presenter screen has been rebuilt, but keep testing for any remaining old-theme components.
- Fullscreen presenter join screen has had a palette sweep; continue checking for layout polish and any hidden legacy states.
- After clicking `Go Live`, the flow is chaotic:
  - should emphasize presenter branding
  - should show QR code cleanly
  - should show presentation/Zapp name
  - should show presenter logo / branding
  - should feel polished before questions begin
- Fullscreen presenter/live interaction screens need full visual alignment with the new dark branded system.
- Response panels / live interaction canvases still show old bright white blocks against the dark stage.
- Word cloud / live response surfaces need dark-theme visual integration.
- Participant live interaction screen (`/join/[code]`) has had a palette sweep, but still needs a deeper visual polish pass to fully match the new design language.

## Core Theme Sweep

- Plans page still shows mixed old/new theme styling.
- Pricing shown on the public home page and pricing shown from the dashboard are not aligned.
- Pricing tiers and amounts are supposed to be customizable by a Superadmin from the admin panel.
- Home pricing, in-app pricing, and admin-configured pricing must use the same source of truth.
- Public pricing and in-app pricing also need the same visual theme and tier structure.
- Checkout still uses static plan pricing logic and needs to be aligned with admin-configured pricing before pricing can be considered fully unified.
- Home page hero/features stack is too tall.
- The first-screen composition should be tightened so the four feature cards are more likely to appear without requiring users to scroll past the hero.
- Continue sweeping for any remaining blue/yellow legacy remnants.
- Continue checking for mixed old/new components during route-to-route testing.

## Validation Notes

- Avoid running `next build` while the dev server is actively being used for testing; it can corrupt `.next` dev chunks.
- Use safe validation while the user is testing, then do a clean build only after stopping dev.
