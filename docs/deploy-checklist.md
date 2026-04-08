# Production deploy checklist

Use this when putting LiveZapp on a host (Vercel, Render, Node on VPS/cPanel, etc.). Do **not** commit secrets; set variables in the host UI or a private env store.

## 1. Repository and build

- [ ] Node **18+** on the build runner
- [ ] Install: `npm ci` (or `npm install`)
- [ ] Build: `npm run build` (must pass locally first)
- [ ] Start: `npm start` (or the host’s Next.js preset)

Optional for self-hosted Node/cPanel: enable `output: 'standalone'` in `next.config.js` and run the server from `.next/standalone` per [Next.js standalone](https://nextjs.org/docs/app/api-reference/next-config-js/output).

## 2. Public URL

- [ ] Set **`NEXT_PUBLIC_APP_URL`** to the canonical site URL (no trailing slash), e.g. `https://www.live-zapp.com`
- [ ] Used for metadata, QR/join links, and sitemap absolute URLs

## 3. Firebase (client)

Set in the host environment (all `NEXT_PUBLIC_*` are exposed to the browser):

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (Realtime Database)

## 4. Firebase Admin (server-only)

Required for: `/api/contact`, `/api/track`, promo routes, logo upload auth, admin user management, etc.

- [ ] `FIREBASE_ADMIN_PROJECT_ID` (or rely on `NEXT_PUBLIC_FIREBASE_PROJECT_ID` if matched)
- [ ] `FIREBASE_ADMIN_CLIENT_EMAIL`
- [ ] `FIREBASE_ADMIN_PRIVATE_KEY` (newline escaped as `\n` in env strings)

Alternatively on GCP: **`GOOGLE_APPLICATION_CREDENTIALS`** pointing to a service account JSON file (not committed).

## 5. PayPal (if billing is live)

- [ ] `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- [ ] `PAYPAL_CLIENT_SECRET`
- [ ] `PAYPAL_MODE` = `sandbox` or `live`

## 6. Firebase / security rules (console)

- [ ] RTDB rules deployed and tested (auth, admin paths, promo codes as intended)
- [ ] Storage rules if you use Firebase Storage for assets

## 7. Smoke tests after deploy

- [ ] Home, `/plans`, `/contact`, `/privacy`, `/terms` load
- [ ] Register / login / logout
- [ ] Create presentation, open presenter, join as participant (second device or incognito)
- [ ] Admin panel (admin user): settings, users if applicable
- [ ] `/robots.txt` and `/sitemap.xml` return expected content

## 8. Ongoing

- [ ] Re-run `npm audit` before major releases
- [ ] Rotate keys if leaked; never commit `.env.local`
- [ ] Configure email sender + deliverability (SPF/DKIM/DMARC, Firebase auth templates) per `docs/email-operations-checklist.md`

See also [launch-tracker.md](./launch-tracker.md).
