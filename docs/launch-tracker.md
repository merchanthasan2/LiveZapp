# LiveZapp — Launch tracker

Single place to see **done** vs **still open** for go-live readiness. For phase history see [task.md](./task.md).

| Area | Status | Notes |
|------|--------|--------|
| Legal: `/privacy`, `/terms` | Done | [app/privacy/page.tsx](../app/privacy/page.tsx), [app/terms/page.tsx](../app/terms/page.tsx); footer links already pointed here |
| SEO: `sitemap.xml` | Done | [app/sitemap.ts](../app/sitemap.ts) — includes public marketing + legal URLs |
| SEO: `robots.txt` | Done | [app/robots.txt/route.ts](../app/robots.txt/route.ts) — RTDB override with [lib/site.ts](../lib/site.ts) `DEFAULT_ROBOTS_TXT` fallback |
| API security (Admin RTDB, Bearer on upload/redeem, contact rate limit) | Done | See prior hardening commits |
| Dependencies | Partial | `npm audit fix` applied where safe; remaining items often need `npm audit fix --force` (major bumps). Re-run `npm audit` before releases. |
| Production deploy | Pending | Set `NEXT_PUBLIC_APP_URL`, Firebase Admin, PayPal, target host (e.g. Vercel / VPS) |
| Dev server slowness (DEV-1) | Pending | [dev-server-performance.md](./dev-server-performance.md) |
| Ongoing polish | Optional | Mobile, animations, admin vs app theme consistency |

**Last updated:** 2026-04-07
