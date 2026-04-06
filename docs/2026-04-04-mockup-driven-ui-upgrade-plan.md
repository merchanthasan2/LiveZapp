# Mockup-Driven UI Upgrade Plan

Date: 2026-04-04

## Scope
- Core routes: `/`, `/login`, `/join`, `/app/dashboard`, `/app/present/[id]`
- Admin routes: `/admin` and all `/admin/*`
- Visual policy: Home light-primary; app/admin dark-first

## Key Decisions
- Preserve all existing behavior and data/service contracts.
- Replace remaining legacy blue/yellow hardcoded styling with semantic tokens/classes.
- Rebuild admin chart/card/table compositions to align with provided mockups.
- Keep light mode functional fallback for app/admin; prioritize dark polish there.

## Implementation Tracks
1. Design system consolidation in `app/globals.css`.
2. Core visual upgrades (`/login`, `/join`, `/app/dashboard`, presenter shell tuning).
3. Admin shell rebuild in `app/admin/layout.tsx`.
4. Admin overview rebuild in `app/admin/page.tsx`.
5. Apply shared shell and rebuilt chart/table compositions to remaining admin pages.

## Validation
- `npm run build` passes.
- Auth/join/presenter/dashboard/admin critical actions remain intact.
- Mobile + desktop responsive checks for updated screens.

