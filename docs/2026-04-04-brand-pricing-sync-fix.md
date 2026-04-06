# Brand And Pricing Sync Fix

## Scope

- Replace the shared square wordmark usage with a transparent logo-plus-text lockup.
- Stop the home hero from sitting under the fixed header.
- Redesign the admin pricing panel around a single pricing engine.
- Make admin price changes propagate to home, plans, and app pricing views through the shared Firebase pricing catalogue.

## What Changed

### Brand

- `components/BrandLockup.tsx`
  - Switched from the non-transparent `livezapp-logo-w-text.png` image to a controlled lockup made from:
    - `/brand/livezapp-logo-only.png`
    - rendered `LiveZapp` text
  - Added hard size constraints so the logo cannot spill out of headers.

- `app/admin/layout.tsx`
  - Reduced the admin sidebar brand size from `lg` to `sm`.

- `app/app/present/[id]/page.tsx`
  - Replaced the direct old wordmark image with `BrandLockup`.

### Home Header And Spacing

- `app/page.tsx`
  - Increased top padding below the fixed nav.
  - Added section scroll offsets for `features`, `pricing`, and `contact`.
  - Tightened some vertical spacing to reduce the feeling of content hiding under the header.

### Shared Pricing Source Of Truth

- `lib/hooks/useCurrency.ts`
  - Fixed broken currency symbols.
  - Added realtime Firebase subscription to `admin/pricing`.
  - Pricing updates can now flow through to open client views without waiting for stale cache expiry.

- `app/admin/plans/page.tsx`
  - Rebuilt the pricing area into a rule-based pricing engine.
  - USD monthly values are now the editable base.
  - Annual list price is derived as `monthly * 12`.
  - Annual billed price is derived from the annual discount percentage.
  - GBP and INR are generated automatically from the same engine.
  - Saving writes:
    - `admin/pricing`
    - `admin/pricingMeta`
  - Existing plan limit editing remains available in the redesigned page.

## Current Rule

- Base currency: `USD`
- Annual list: `monthly * 12`
- Annual billed: `annual list * (1 - discountPercent / 100)`
- Converted currencies:
  - `GBP = USD * rate`
  - `INR = USD * rate`

## Notes

- This addresses the earlier mismatch where the admin panel edited one currency while public pages still read stale per-currency rows.
- Checkout pricing still needs a separate follow-up pass if we want its displayed amounts and billing metadata to be driven from the same admin engine end to end.
