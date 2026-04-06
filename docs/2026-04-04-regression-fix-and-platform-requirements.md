# 2026-04-04 Regression Fix + Platform Requirements

## What was fixed in this pass
- Removed forced admin redirect after login and home auth-return flow.
- Default post-login flow now lands on `/app/dashboard` for all users.
- Kept admin as explicit destination via admin links.
- Updated app shell visuals to dark-first and removed layout overlap behavior.
- Updated shared theme tokens to reduce old blue/yellow bias and use purple-led primary styling.
- Verified production build passes.

## Current Tech Stack
- Framework: Next.js 14 (App Router)
- UI: React 18 + TypeScript
- Styling: Tailwind CSS + global CSS tokens/utilities
- Auth/Data: Firebase Authentication + Firebase Realtime Database
- Storage: Firebase Storage
- Charts/Animation: Recharts + Framer Motion
- Payments: PayPal (via Next.js API routes)

## Deployment Requirements
Because this app uses:
- Next.js server runtime (App Router)
- Next.js API routes (`/api/*`) for payment + other server logic

you need a Node-capable runtime in production.

### If cPanel has no Node.js support
You cannot run this app directly there as-is.

### Recommended hosting options
1. Vercel (easiest for Next.js)
2. VPS (Ubuntu + Node + PM2 + Nginx)
3. Any platform supporting Node serverless/functions + Next.js runtime

## Build Status
- `npm run build` passed on 2026-04-04 after the above fixes.
