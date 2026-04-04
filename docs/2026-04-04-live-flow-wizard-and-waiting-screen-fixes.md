# Live Flow + Wizard Fixes
Date: 2026-04-04

## Scope completed in this pass
- Enforced question-builder wizard behavior in Create Zapp flow.
- Added question-count limit enforcement based on active plan limits.
- Improved question-step UI to show used vs allowed question slots.
- Fixed participant text mojibake in core visible labels/placeholders.
- Upgraded participant waiting screen with presenter branding and rotating welcome messages.
- Added explicit back navigation in presenter fullscreen/top bar.
- Exposed back-to-builder action on live pre-start nav for all breakpoints.

## Files changed
- app/app/create/page.tsx
- app/join/[code]/page.tsx
- app/app/present/[id]/page.tsx

## Behavior changes
- Create Zapp:
  - Entering the Questions step with zero questions auto-opens the type picker.
  - Add-question actions are disabled when plan max is reached.
  - Wizard and sidebar now show question usage as `{current}/{max}`.

- Participant join/wait:
  - Name-entry and wait-state broken character text corrected.
  - Wait state now shows presenter brand (logo/name) when available.
  - Rotating excitement copy added while waiting for start.

- Presenter:
  - Fullscreen top bar now includes a Back action to return to builder.
  - Pre-live nav Back to builder is no longer desktop-only.

## Validation
- `npx.cmd tsc --noEmit` passed.
