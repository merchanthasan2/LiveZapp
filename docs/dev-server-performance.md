# Dev server performance (slow `next dev`)

**Status:** backlog — tracked as DEV-1 in [task.md](./task.md).

## What we are seeing

The LiveZapp repo can feel slow when starting or first loading the app under `npm run dev`, compared to other Next.js apps on the same machine.

**What to measure:** The problem is **not** mainly how long it takes for `next dev` to print “ready” (that step is usually quick). What matters is **first route compile** after the server is up and **time to first paint** when you open `/` or `/app/dashboard` in the browser—those are what feel slow in practice.

## Likely contributors (checklist)

1. **Cold compile** — First request after `next dev` starts triggers Webpack/Turbopack to compile many routes and dependencies; this is normal but can feel like “the app is slow.”
2. **Windows + antivirus** — Real-time scanning of `node_modules`, `.next`, and the project folder adds I/O latency. Excluding the repo path (or `node_modules` / `.next`) from Defender can help *only if* your org policy allows it.
3. **Path with spaces** — A workspace path like `D:\Vibe Code\Live-Zapp v01` can occasionally cause tooling edge cases; moving the repo to a path without spaces is a good A/B test if problems persist.
4. **Heavy client bundles** — Firebase client SDK, Recharts, Framer Motion, PayPal JS increase compile and HMR work. This is expected; code-splitting and lazy imports are follow-ups if profiling shows hot spots.
5. **Turbopack** — Next.js 14 supports `next dev --turbo` for faster dev bundling in many apps. Use `npm run dev:turbo` to try it; if something breaks, fall back to `npm run dev` and note the route/feature.

## Commands to try

| Command | Notes |
|--------|--------|
| `npm run dev` | Default Webpack dev server |
| `npm run dev:turbo` | Turbopack (often faster cold start / HMR) |

Optional: set `NEXT_TELEMETRY_DISABLED=1` in the environment to skip telemetry overhead (small).

## What “done” looks like

- Documented baseline: time from **first HTTP request** (or first navigation) to usable UI on `/` and `/app/dashboard`—**not** time from `npm run dev` to the “ready” line in the terminal.
- Decision on whether Turbopack is the default for this repo or optional.
- Any AV/path changes documented for the team (no secrets in repo).
