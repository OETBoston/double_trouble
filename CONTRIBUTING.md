# Requirements & contribution workflow

This project tracks functional and non-functional requirements as GitHub Issues, and implements each one on its own branch with matching test cases. This doc describes that loop end to end.

## 1. File a requirement

Open a new issue and pick one of three templates:

- **Functional requirement** — new or changed user-facing behavior. Write it as a user story with concrete, testable acceptance criteria.
- **Non-functional requirement** — a quality attribute (performance, accessibility, security, reliability, privacy, usability). State the current behavior, the measurable target, and how it'll be verified.
- **Bug report** — something broken, with repro steps and expected vs. actual behavior.

Acceptance criteria / verification steps should be concrete enough to become the test plan later — e.g. "the dashboard's custom date range filter uses the browser's local timezone, not UTC" rather than "fix the date bug."

## 2. Branch per issue

Once an issue is ready to work, branch off the latest `main`:

```bash
git checkout main && git pull
git checkout -b issue-<number>-<short-slug>
```

Example: `issue-42-neighborhood-filter`.

One issue per branch, one branch per PR. If a requirement turns out to need splitting, split the issue first rather than mixing unrelated work into one branch.

## 3. Implement with tests

Add or update tests alongside the implementation — that's what makes the issue's acceptance criteria/verification steps checkable rather than just a claim:

- Backend logic/routes → `server/src/**/*.test.ts` (Vitest + Supertest, see existing tests for the mocked-Prisma pattern)
- Frontend pure logic → `web/src/**/*.test.ts` (Vitest)
- Frontend components → `web/src/**/*.test.tsx` (Vitest + React Testing Library)
- Full user flows → `web/e2e/*.spec.ts` (Playwright, network mocked — run manually with `npm run test:e2e` in `web/`, not yet wired into CI)

Run locally before opening a PR:

```bash
cd server && npm test && npx tsc --noEmit
cd web && npm test && npx tsc --noEmit
```

## 4. Open a PR linked to the issue

Push the branch and open a PR against `main`. The PR template will prompt you to:

- Write `Closes #<issue-number>` — this auto-closes the issue when the PR merges, and makes the link visible from both sides.
- Copy the issue's acceptance criteria into the test plan and check them off.

GitHub Actions CI (`.github/workflows/ci.yml`) runs the backend and frontend Vitest suites plus a type-check on every PR automatically. A failing check means something regressed — fix it before merging, don't merge around it.

## 5. Merge

Once CI is green and the PR is reviewed, merge it. The issue closes automatically via the `Closes #` link.

### Optional: enforce this with branch protection

To make CI a hard gate instead of a courtesy check, turn on branch protection for `main`:
**Settings → Branches → Add rule** → require a pull request before merging, and require the `server` and `web` status checks to pass before merging. This has to be done in the GitHub UI (or via API with a token) — it's not something a config file in the repo can set.
