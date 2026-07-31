# CLAUDE.md

Guidance for Claude Code working in this repo — both interactive sessions and the GitHub Action triggered by `@claude` mentions on issues/PRs.

## What this is

A PWA for anonymously reporting illegally double-parked cars in Boston, plus a dashboard with a live heat map and pattern metrics (peak hour/day, top streets, volume trend). Two packages:

- `server/` — Express + TypeScript + Prisma API, Postgres (no PostGIS needed — reports are plain lat/lng floats)
- `web/` — React + Vite PWA (report flow + dashboard), Mapbox GL for maps/geocoding

## Before implementing an issue: check for ambiguity first

Before writing code for a functional or non-functional requirement issue, check whether it's actually implementable as specified:

- **Functional requirements** need concrete, testable acceptance criteria. If they're vague, contradictory, or could reasonably be built multiple conflicting ways, don't guess.
- **Non-functional requirements** need a measurable target and a stated verification method. If either is missing, don't invent a number.

If something is ambiguous or underspecified, **post a comment on the issue asking specific clarifying questions and stop** — do not open a PR or push commits until a human has responded in the thread. When invoked again (e.g. after a reply), re-read the full issue thread, including your own earlier questions and the human's answers, before deciding whether to proceed or ask further follow-ups.

## Workflow for implementing an issue

Follow `CONTRIBUTING.md`. In short: branch off `main` as `issue-<number>-<slug>`, implement with tests, then open a PR containing `Closes #<number>` and a test plan.

**Before opening the PR, always run, and don't open the PR if any of these fail:**

```bash
cd server && npm test && npx tsc --noEmit
cd web && npm test && npx tsc --noEmit
```

## Testing patterns already established in this repo

- **Backend routes** (`server/src/routes/*.test.ts`): Vitest + Supertest, with Prisma fully mocked via `vi.doMock` after `vi.resetModules()` per test — required because the rate limiter on `POST /api/reports` keeps state in a module-level singleton, so reusing one import across tests lets earlier tests silently consume later tests' quota. See `reports.test.ts` for the pattern.
- **Frontend logic** (`web/src/**/*.test.ts`): plain Vitest, no DOM.
- **Frontend components** (`web/src/**/*.test.tsx`): Vitest + React Testing Library. Components using `mapbox-gl` (`MapPinStep`, `HeatMap`) need it mocked — jsdom has no WebGL. See `MapPinStep.test.tsx` for the `vi.hoisted` + `vi.mock("mapbox-gl", ...)` pattern.
- **E2E** (`web/e2e/*.spec.ts`): Playwright, with all network calls (our API + Mapbox) mocked via `page.route` — deliberately hermetic, doesn't need Docker/Postgres running. Not yet wired into CI; run manually with `npm run test:e2e` in `web/`.

## A timezone bug worth not reintroducing

`server/src/routes/stats.ts` computes peak hour/peak day/the trend chart's date bucketing using `America/New_York` explicitly via `Intl.DateTimeFormat`, not the server's own local clock. This app is Boston-only, and the server's clock is UTC on Render but happened to be Eastern in local dev — using `getHours()`/`getDay()`/`toISOString()` directly silently drifted by 4-5 hours once deployed. Any new date/time bucketing in this codebase should follow the same explicit-timezone pattern, not assume the server's local time.

## Local dev environment quirks

- `web/vite.config.ts` and `server/src/index.ts` both fall back to HTTPS via a local mkcert cert at `certs/` (gitignored) if present, for testing on a phone over Wi-Fi where geolocation requires a secure context. Neither requires it — both fall back to plain HTTP if `certs/` doesn't exist, which is the case in CI and on a fresh clone.
- Node 20 is the target here specifically — some devDependencies (Vitest, jsdom) are pinned below their latest majors because those require Node 22+, which this environment doesn't have.
