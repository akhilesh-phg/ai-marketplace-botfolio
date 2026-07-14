# P0 Scaffold Spec — the build contract for Composer (v2, granular)

> Architecture artifact authored by the **Opus 4.8 (architect)** tier. The contract Composer 2.5 implements against in P0.
> Companion to `08-loop-proof-v0-engineering-plan.md` (read §6-§7 first: roles, decision boundary, escalation, gates).
> **Status: revised after the GPT 5.5 architecture grade (`.grades/P0-arch.md`, FAIL @ min 5/10). Re-grade required before switching to Composer.**

## Changelog vs v1 (what this revision fixes)

Addresses every blocking item from `.grades/P0-arch.md`:

1. **Re-rooted** the monorepo to the existing cloned repo `project-trillion/` (was `marketplace/`).
2. **Exact implementation contracts** added for P0-01, P0-05, P0-06, P0-09, P0-10, P0-11, P0-12 (configs, route names, envelopes, CLI I/O).
3. **Coverage tooling made real**: `pnpm test:coverage`, Vitest v8 provider, explicit thresholds, and a failing-coverage acceptance check.
4. **Governance scripts now have fixtures + snapshot tests** so Composer fills code against fixed tests.
5. **Composer identity detection + `Spec:` trailer format** fully specified (branch prefix + commit trailer + `specs/registry.json`).
6. **Test heartbeat moved to slice 1**: unit+coverage+E2E harness exists from P0-01; the health E2E goes live with the API (P0-05) and is CI-blocking from then on.

---

## 0. How to use this spec

- This doc pre-decides **everything** in P0. Composer makes **zero** decisions; it executes slices §5 in order, **one branch + one PR per slice**.
- Composer cannot complete a slice without a decision (missing type, version conflict, ambiguous step, frozen-path edit) → it **stops** and emits a `DECISION-NEEDED` block (`08` §6.6) and hands back to Opus.
- **Bootstrap exception:** the automated gates are *built during* P0 (slice P0-12), so they can't gate P0 itself. P0 is reviewed **manually** (human + GPT 5.5 grade, §9). From P1 onward, gates enforce automatically.
- **Grader model:** the architecture grader is **GPT 5.5** (it produced `.grades/P0-arch.md`). The code reviewer is **Opus 4.8**. Both are referenced by env vars (`GRADER_MODEL`, `REVIEWER_MODEL`) so model ids are never hardcoded.

---

## 1. Repository + working directory (CHANGED)

- **Repo root = monorepo root = `/Users/akhilesh/Desktop/Marketplace/project-trillion/`** (the already-cloned git repo, `origin = https://github.com/akhilesh-phg/project-trillion.git`, default branch `main`).
- **All commands in this spec run with `project-trillion/` as the working directory.**
- The planning docs (`docs/00`…`09`) currently live in the parent `Marketplace/` folder. P0-12 **copies the binding contracts into the repo** at `project-trillion/docs/` (so CI and the `Spec:`-trailer gate can resolve spec ids against in-repo files). The parent `Marketplace/docs/` remains the authoring home; `project-trillion/docs/` is the committed snapshot.
- The repo already contains a `.env` (provisioned, see §2) and a `.gitignore`. Composer must **not** commit `.env`; it commits `.env.example` only and ensures `.gitignore` covers the entries in §3.3.

---

## 2. Provisioned secrets (already present in `project-trillion/.env`)

These keys are already set by the human. Composer reads them via `packages/config` only (never `process.env` elsewhere):

```
DATABASE_URL                SUPABASE_URL                SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   NEXT_PUBLIC_SUPABASE_URL    NEXT_PUBLIC_SUPABASE_ANON_KEY
R2_ACCOUNT_ID  R2_ACCESS_KEY_ID  R2_SECRET_ACCESS_KEY  R2_BUCKET  R2_ENDPOINT
INNGEST_EVENT_KEY  INNGEST_SIGNING_KEY  SENTRY_DSN  DATADOG_API_KEY  RESEND_API_KEY
OPENAI_API_KEY  ANTHROPIC_API_KEY  API_BASE_URL  NEXT_PUBLIC_API_BASE_URL
```

Stripe keys are **not** present and **not** needed in P0 (commerce is P3). `OPENAI_API_KEY` powers `grade-arch`; `ANTHROPIC_API_KEY` powers `review-code`.

---

## 3. Target file tree, package conventions, gitignore

### 3.1 Tree (Composer creates this exact shape under `project-trillion/`)

```
project-trillion/
  package.json                 # pnpm workspaces + root scripts (§4)
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  vitest.workspace.ts
  eslint.config.mjs
  .prettierrc.json
  .env  (exists)               .env.example (Composer creates)
  .gitignore (update)
  AGENTS.md   STATE.md   GATES.md          # FROZEN governance (§6)
  specs/registry.json                      # FROZEN — valid Spec: ids (§6.4)
  .grades/.gitkeep   .reviews/.gitkeep
  .github/workflows/ci.yml                 # §6.6
  scripts/
    gate-frozen-paths.ts   gate-no-new-decisions.ts
    grade-arch.ts   review-code.ts   audit-reviews.ts
    state-set.ts   session-banner.ts
    __fixtures__/                          # fixtures for gate tests (§6.5)
    *.test.ts                              # vitest tests for every script
  packages/
    config/        # env loading (zod-validated), the ONLY place process.env is read
    shared/        # Result<T,E>, AppError, zod helpers
    contracts/     # FROZEN — zod schemas, error envelope, PaymentRail, event payloads, OpenAPI builder
    db/            # FROZEN(schema/) — drizzle client, schema/, migrations/
    core/          # registry/ discovery/ commerce/ reputation/ disputes/ (stubs)
    sdk/           # generated openapi types + openapi-fetch client + health()
  apps/
    api/           # Hono server
    web/           # Next.js 15 app
    worker/        # Inngest functions
  reference-agents/
    seller-codereview/   buyer-orchestrator/   # stubs
  e2e/             # Playwright config + health heartbeat
  docs/            # committed snapshot of 08 + 09 (added in P0-12)
```

### 3.2 Package conventions (every `packages/*` and `apps/*`)

- `"type": "module"`, ESM only.
- Each package `package.json` has: `"name": "@t/<name>"`, `"exports": { ".": "./src/index.ts" }`, scripts `build` (`tsc -p tsconfig.json`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `lint` (`eslint .`).
- Each package has a `tsconfig.json` that `extends: "../../tsconfig.base.json"`, sets `"rootDir": "src"`, `"outDir": "dist"`, and TS project references to its workspace deps.
- Internal imports use the workspace alias `@t/<name>`; no deep relative cross-package imports.

### 3.3 `.gitignore` must include

```
node_modules/  dist/  .next/  .turbo/  coverage/  playwright-report/  test-results/
.env  .env.*.local  *.tsbuildinfo  .DS_Store
```

(`.env.example` is the one `.env*` file that IS committed.)

---

## 4. Root `package.json` scripts (exact)

```
"scripts": {
  "dev":            "turbo run dev",
  "build":          "turbo run build",
  "typecheck":      "turbo run typecheck",
  "lint":           "eslint .",
  "test":           "vitest run",
  "test:coverage":  "vitest run --coverage",
  "test:e2e":       "playwright test -c e2e/playwright.config.ts",
  "db:generate":    "pnpm --filter @t/db db:generate",
  "db:migrate":     "pnpm --filter @t/db db:migrate",
  "gate:frozen-paths":     "tsx scripts/gate-frozen-paths.ts",
  "gate:no-new-decisions": "tsx scripts/gate-no-new-decisions.ts",
  "grade:arch":     "tsx scripts/grade-arch.ts",
  "review:code":    "tsx scripts/review-code.ts",
  "audit:reviews":  "tsx scripts/audit-reviews.ts",
  "state:set":      "tsx scripts/state-set.ts",
  "session":        "tsx scripts/session-banner.ts"
}
```

Install latest-stable deps with `pnpm add`; **commit `pnpm-lock.yaml`**. Never hand-write version numbers. If latest-stable breaks the build, that is a `DECISION-NEEDED`, not a Composer workaround.

---

## 5. P0 slices (ordered; one branch `composer/P0-NN` + one PR each; < ~300 line diff)

Each slice lists: **Goal**, **Allowed files**, **Steps (granular)**, **Acceptance (executable)**. Composer does only what is listed.

### P0-01 — Monorepo + toolchain + test harness (heartbeat from slice 1)

**Allowed:** root config files, `packages/shared` placeholder, `e2e/`, `vitest.workspace.ts`.

**Steps:**
1. `pnpm init`; set `"packageManager": "pnpm@<latest>"`, `"private": true`, scripts from §4.
2. Create `pnpm-workspace.yaml`:
   ```
   packages: ["apps/*", "packages/*", "reference-agents/*"]
   ```
3. `pnpm add -D -w turbo typescript tsx vitest @vitest/coverage-v8 @playwright/test eslint typescript-eslint prettier`.
4. `turbo.json`:
   ```json
   { "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
       "dev": { "cache": false, "persistent": true },
       "typecheck": { "dependsOn": ["^build"] },
       "lint": {}, "test": { "dependsOn": ["^build"] }, "test:e2e": { "cache": false } } }
   ```
5. `tsconfig.base.json`:
   ```json
   { "compilerOptions": {
       "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
       "lib": ["ES2022", "DOM", "DOM.Iterable"], "strict": true,
       "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
       "exactOptionalPropertyTypes": true, "esModuleInterop": true, "skipLibCheck": true,
       "resolveJsonModule": true, "isolatedModules": true, "verbatimModuleSyntax": true,
       "declaration": true, "composite": true } }
   ```
6. `eslint.config.mjs` (flat config), rules that enforce `08` §6 conventions:
   ```js
   import tseslint from 'typescript-eslint';
   export default tseslint.config(
     { ignores: ['**/dist/**','**/.next/**','**/coverage/**'] },
     ...tseslint.configs.recommendedTypeChecked,
     { languageOptions: { parserOptions: { projectService: true } },
       rules: {
         '@typescript-eslint/no-explicit-any': 'error',
         'no-restricted-syntax': ['error',
           { selector: "MemberExpression[object.object.name='process'][object.property.name='env']",
             message: 'Read env only via @t/config.' }],
         '@typescript-eslint/no-floating-promises': 'error' } }
   );
   ```
   The `process.env` rule is exempted only inside `packages/config/**` via an override block.
7. `.prettierrc.json`: `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`.
8. `vitest.workspace.ts`:
   ```ts
   export default ['packages/*', 'scripts'];
   ```
   Root `vitest.config.ts` with coverage:
   ```ts
   import { defineConfig } from 'vitest/config';
   export default defineConfig({ test: { coverage: {
     provider: 'v8', reporter: ['text','json-summary','lcov'],
     include: ['packages/core/**/*.ts','packages/shared/**/*.ts'],
     thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } } } });
   ```
9. `packages/shared` placeholder with one pure fn `identity<T>(x:T):T` + `identity.test.ts` (100% covered) so unit+coverage are green from slice 1.
10. `e2e/playwright.config.ts` present (no webServer yet; one `expect(true).toBe(true)` placeholder spec) so `pnpm test:e2e` is green from slice 1.
11. Update `.gitignore` per §3.3; create `.env.example` mirroring §2 keys with blank values.

**Acceptance:**
- `pnpm install` clean.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm test:coverage && pnpm test:e2e` all green.
- `pnpm test:coverage` prints a coverage table (proves wiring). Tree matches §3.1 for created files.

**Approved toolchain additions (Opus ruling 2026-06-09 — now part of the contract, not deviations):**
- `pnpm-workspace.yaml` may approve dependency build scripts via the **allowlist** form (e.g. `onlyBuiltDependencies: [esbuild]`). Required because pnpm 11 blocks postinstall builds by default. Keep the list tight — only packages that genuinely fail install; do **not** blanket-enable. (Lives in `pnpm-workspace.yaml`, not `package.json`.)
- A thin root `tsconfig.json` (extends `tsconfig.base.json`, includes root config files + `e2e/`) is allowed and expected — typescript-eslint `projectService` needs it.
- `vitest.config.ts` must `exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**']` so Vitest does not execute Playwright specs.
These are toolchain plumbing, not architecture. They do not touch frozen paths.

### P0-02 — `packages/config` + `packages/shared`

**Allowed:** `packages/config/**`, `packages/shared/**`.

**Steps:**
1. `@t/config`: `env.ts` loads `.env` via `dotenv`, validates with a Zod schema covering every §2 key (server keys required; `NEXT_PUBLIC_*` optional-at-build). Export a typed `env` object. This file is the **only** place `process.env` is read (eslint override here).
2. `@t/shared`: `Result<T,E> = { ok: true; value: T } | { ok: false; error: E }`; helpers `ok()`, `err()`. `AppError` class `{ code: string; message: string; httpStatus: number; details?: unknown }`. Zod helper `parseOrError(schema, input): Result<T, AppError>`.
3. Unit tests: `env` rejects a missing required key (use a fixture object, not the real `.env`); `Result`/`AppError`/`parseOrError` 100% branch covered.

**Acceptance:** `pnpm test:coverage` green with `@t/shared` at 100%; `@t/config` exports typed `env`.

### P0-03 — `packages/db` (Drizzle + Supabase)

**Allowed:** `packages/db/**`.

**Steps:**
1. `pnpm --filter @t/db add drizzle-orm postgres`; `add -D drizzle-kit`.
2. `client.ts`: `postgres(env.DATABASE_URL)` + `drizzle()` export.
3. `schema/_meta.ts`: table `_meta { key text primary key, value text not null, updated_at timestamptz default now() }`.
4. `drizzle.config.ts` pointing at `schema/`, `migrations/` out dir, `DATABASE_URL`.
5. Package scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`).
6. Round-trip test: insert `{key:'ping',value:'pong'}`, read it back, assert. (Uses real `DATABASE_URL`; skip with a clear message if unset.)

**Acceptance:** `pnpm db:generate` produces a migration; `pnpm db:migrate` applies `_meta` to Supabase; round-trip test green.

### P0-04 — `packages/contracts` (FROZEN after this slice)

**Allowed:** `packages/contracts/**`.

**Steps:**
1. `envelope.ts`: success = the payload object directly; failure = `{ error: { code: string; message: string; details?: unknown } }`. Export Zod `ErrorEnvelope`.
2. `health.ts`: `HealthResponse = { ok: true; service: string; version: string; ts: string }` (Zod).
3. `payment-rail.ts`: interface `PaymentRail { createHold(input): Promise<Result<Hold>>; capture(id): Promise<Result<Capture>>; release(id): Promise<Result<void>>; refund(id, amount?): Promise<Result<Refund>> }` with Zod types for inputs/outputs. No implementation.
4. `events.ts`: the worker event-payload + idempotency convention (closes the grade's §3 gap): every event = `{ id: string (ulid); name: string; ts: string; idempotencyKey: string; data: unknown }`. Export `EventEnvelope` Zod + a `makeEvent()` helper signature (impl in worker).
5. `openapi.ts`: a builder that assembles an OpenAPI 3.1 document from registered Zod routes via `@hono/zod-openapi` registry; export `buildOpenApi()`.

**Acceptance:** typecheck green; `buildOpenApi()` returns a valid OpenAPI doc with the health route registered; `PaymentRail` + `EventEnvelope` exported.

### P0-05 — `apps/api` (Hono) + health E2E heartbeat (CI-blocking from here)

**Allowed:** `apps/api/**`, `e2e/health.spec.ts`, `e2e/playwright.config.ts` (webServer wiring).

**Steps:**
1. `pnpm --filter @t/api add hono @hono/node-server @hono/zod-openapi`.
2. `src/app.ts` builds an `OpenAPIHono` app. **Middleware order (exact):** `requestId → logger → cors → errorBoundary → routes`.
   - `errorBoundary`: wrap in try/catch; if `AppError`, respond `err.httpStatus` with `{ error: { code, message, details } }`; else log to Sentry (stub in P0-11) and respond `500 { error: { code:'internal', message:'Internal error' } }`.
3. Routes via `createRoute` (zod-openapi): `GET /health` → 200 `HealthResponse` `{ ok:true, service:'api', version: env.APP_VERSION ?? '0.0.0', ts: ISO }`. `GET /openapi.json` → 200 `buildOpenApi()`.
4. `src/server.ts`: `serve({ fetch: app.fetch, port: env.PORT ?? 8787 })`. Export `app` from `app.ts` for tests.
5. Unit test: `app.request('/health')` → 200, body matches `HealthResponse`.
6. `e2e/playwright.config.ts`: add `webServer` that runs `pnpm --filter @t/api dev`, `baseURL = env API_BASE_URL`. `e2e/health.spec.ts`: GET `/health` → 200, `ok:true`. **This is the heartbeat; it is required in CI on every PR from now on.**

**Acceptance:** `pnpm dev` serves `/health` 200 and `/openapi.json` 200; `pnpm test:e2e` green hitting the live health route.

### P0-06 — `apps/web` (Next.js 15 + Tailwind + shadcn)

**Allowed:** `apps/web/**`, `e2e/web.spec.ts`.

**Steps:**
1. Scaffold Next.js 15 App Router in `apps/web` (TypeScript, App Router, `src/` dir, import alias `@/*`, Turbopack dev).
2. Tailwind: install + `globals.css` with Tailwind layers.
3. **shadcn init — fixed answers (no prompts left open):** style `new-york`; base color `neutral`; CSS variables `yes`; components alias `@/components/ui`; utils alias `@/lib/utils`. Add only the `button` and `card` components.
4. `app/page.tsx`: landing with product name + one `Card` + `Button`.
5. `app/health/page.tsx`: server component fetches `env.NEXT_PUBLIC_API_BASE_URL + '/health'`, renders `ok` status in a `Card`.
6. `e2e/web.spec.ts`: load `/` (renders heading) and `/health` (shows API ok status).

**Acceptance:** `pnpm dev` renders `/` and `/health`; `/health` shows live API status; `pnpm test:e2e` green for web specs.

### P0-07 — `apps/worker` (Inngest) + event/idempotency convention

**Allowed:** `apps/worker/**`.

**Steps:**
1. `pnpm --filter @t/worker add inngest`.
2. `client.ts`: `new Inngest({ id: 'trillion', eventKey: env.INNGEST_EVENT_KEY })`.
3. `functions/hello.ts`: durable fn on event `demo/hello`, uses `EventEnvelope` from contracts, returns `{ greeted: data.name }`; demonstrates `step.run` + idempotency via `event.idempotencyKey`.
4. `serve.ts`: Inngest serve handler (Hono or Next route) for local dev.
5. Test: invoke the function with a fixture event, assert output; assert duplicate `idempotencyKey` is a no-op (mock step store).

**Acceptance:** local Inngest dev run executes `demo/hello` once; duplicate-key test green.

### P0-08 — `packages/core` stubs (5 modules)

**Allowed:** `packages/core/**` (note `commerce/` becomes FROZEN after this slice).

**Steps:** create `registry/ discovery/ commerce/ reputation/ disputes/`, each with `index.ts` exporting one pure, typed placeholder fn (e.g. `registry.describe(): ModuleInfo`) + a unit test. `commerce/index.ts` exports a `PaymentRail`-typed placeholder (no money logic yet). Keep `core/` at ≥ 80% coverage.

**Acceptance:** typecheck + `pnpm test:coverage` green; five module boundaries exist; `core/` ≥ 80%.

### P0-09 — `packages/sdk` (typed client, fixed strategy)

**Allowed:** `packages/sdk/**`.

**Steps:**
1. **Fixed client strategy:** `pnpm --filter @t/sdk add openapi-fetch`; `add -D openapi-typescript`.
2. Script `sdk:gen` = `openapi-typescript <api openapi.json url or file> -o src/generated/schema.d.ts`. Document the exact source: run the api, curl `/openapi.json` to `packages/sdk/openapi.json`, then generate. (Deterministic; no generator choice left to Composer.)
3. `client.ts`: `createClient<paths>({ baseUrl })` from `openapi-fetch`; export a `Trillion` class with `health()` calling `GET /health`, returning the typed `HealthResponse`.
4. Node test/script: `new Trillion({baseUrl}).health()` returns `ok:true` against the running api.

**Acceptance:** `pnpm sdk:gen` regenerates types; `health()` returns the typed status in a node script against the live api.

### P0-10 — Supabase Auth (fixed session strategy)

**Allowed:** `apps/web/**` (auth UI/middleware), `apps/api/**` (JWT verify, `/me`), `packages/config` (already has keys).

**Steps:**
1. **Fixed strategy:** `@supabase/ssr` cookie-based sessions in Next; API verifies the Supabase JWT (bearer) using `SUPABASE_JWT` verification via `@supabase/supabase-js` `auth.getUser(token)`.
2. Web: `lib/supabase/server.ts` + `lib/supabase/client.ts`; a `/login` page (email magic-link) and middleware that redirects unauthenticated users away from `/dashboard`.
3. Web `/dashboard` page (protected) shows the signed-in user email.
4. API protected route **contract:** `GET /me` → 401 `{error:{code:'unauthorized'}}` without a valid bearer; 200 `{ userId, email }` with one.
5. Tests: API `/me` unit test 401 vs 200 (mock `getUser`); web E2E `e2e/auth.spec.ts`: visiting `/dashboard` unauthenticated redirects to `/login`.

**Acceptance:** unauthenticated `/me` → 401, authenticated → 200; `/dashboard` redirects when logged out; tests green.

### P0-11 — Observability + reference-agent stubs

**Allowed:** `apps/api/**`, `apps/web/**`, `reference-agents/**`, `packages/config`.

**Steps:**
1. **Sentry:** init in api (`instrument.ts` imported first in `server.ts`) and web (`instrumentation.ts`), DSN from config. Add api route `GET /debug/sentry` that throws, **enabled only when `env.NODE_ENV !== 'production'`**; assert the error path returns the 500 envelope.
2. **Datadog (reduced scope per grade simplicity note):** env-wire only — `packages/shared/metrics.ts` exports a `Metrics` interface + a `NoopMetrics` default; real dd-trace deferred to v1. No Datadog runtime dependency in P0.
3. **Observability test (not dependent on external state):** unit test asserts the Sentry capture function is **called** on an unhandled error (mock the Sentry client) — proves wiring without needing a live event.
4. Reference agents: `seller-codereview/` and `buyer-orchestrator/` each a minimal package with `index.ts` stub + README describing the P2 contract. No real logic.

**Acceptance:** error path calls the (mocked) Sentry capture in test; `/debug/sentry` 500-envelopes in dev; `NoopMetrics` exported; reference-agent stubs present.

### P0-12 — Governance machinery (the guardrails)

**Allowed:** `AGENTS.md`, `STATE.md`, `GATES.md`, `specs/registry.json`, `scripts/**`, `.github/workflows/ci.yml`, `.grades/`, `.reviews/`, `docs/` (snapshot copy).

This slice is specified in full in §6. Its acceptance:
- `pnpm gate:frozen-paths` and `pnpm gate:no-new-decisions` run and their **fixture tests pass** (§6.5).
- A deliberate test PR on branch `composer/zz-frozen-probe` editing `packages/contracts/health.ts` is **blocked** by `gate:frozen-paths` in CI.
- `pnpm session` prints the `STATE.md` banner.
- `grade:arch`, `review:code`, `audit:reviews`, `state:set` run with `--help` and have unit tests with mocked model clients.
- CI workflow runs the full job list (§6.6); branch protection on `main` requires all checks.
- `project-trillion/docs/08…09` snapshot committed; `specs/registry.json` lists all P0 + planned P1 slice ids.

---

## 6. Governance machinery — exact contents

### 6.1 `AGENTS.md` (frozen)

```
# AGENTS.md — conventions all coding agents MUST follow

## Roles
Opus 4.8 = architect: owns all architecture + every decision; writes contracts, specs,
  failing tests; reviews PRs.
Composer 2.5 = implementer: writes code bodies + tests ONLY, against existing contracts;
  NEVER decides.
GPT 5.5 = grader: grades architecture; meta-audits reviews.

## The one rule
If a task needs a decision (new type/signature, new dependency, schema change, new pattern,
multiple valid approaches, or a frozen-path edit) — STOP. Emit DECISION-NEEDED. Do not guess.

## Branch + commit identity (REQUIRED, machine-checked)
- Branch name MUST start with one of: composer/ , opus/ , human/
- EVERY commit MUST include a trailer line: "Model: composer-2.5" | "Model: opus-4.8" | "Model: human"
- PRs that add a new exported symbol / dependency / DB table / env var MUST include a trailer
  "Spec: <id>" where <id> exists in specs/registry.json.

## Frozen paths (never edit on a composer/ branch)
AGENTS.md STATE.md GATES.md specs/registry.json
packages/contracts/** packages/db/schema/** packages/core/commerce/**
apps/api/**/commerce/** scripts/gate-*.ts scripts/grade-arch.ts scripts/review-code.ts
package.json pnpm-lock.yaml
(Dependency or contract changes go on an opus/ branch with a Spec: trailer.)

## Code rules
TypeScript strict, no `any`, no raw SQL interpolation, no secrets in code.
process.env only inside packages/config. All external input validated with Zod.
Errors via Result<T,E> / AppError, no silent catches.
Money logic only inside commerce/ behind PaymentRail.
Every PR: tests in the same PR, < ~300 line diff, copy an existing pattern.

## DECISION-NEEDED format  (paste verbatim, then stop)
DECISION-NEEDED
  task: <slice id>
  blocked-by: dependency | contract-change | ambiguous-test | multiple-approaches | frozen-path
  context: <what I was implementing>
  the-fork: <the choice I cannot make>
  options-i-see: A) ... B) ...   (observed, NOT chosen)
  why-i-cant-decide: <rule this hits>
  STOP: handing to Opus.

## Session start ritual
Run `pnpm session` first; obey any HUMAN ACTION REQUIRED banner before doing anything else.
```

### 6.2 `STATE.md` (frozen; updated ONLY by `scripts/state-set.ts`, never hand-edited)

Initial content:
```
phase: P0 - scaffold
slice: P0-01 monorepo-toolchain
status: SPEC
owner-model: opus
next-gate: p0-architecture-grade (manual, GPT 5.5)
HUMAN-ACTION-REQUIRED: true
last-arch-grade: .grades/P0-arch.md (FAIL, min 5/10, re-grade pending revision)
open-escalations: []
```

### 6.3 `GATES.md` (frozen) — gate definitions

```
gate:frozen-paths       composer/ branch editing a frozen path -> FAIL ("ESCALATE TO OPUS")
gate:no-new-decisions   new exported symbol/dep/table/env without a valid Spec: trailer -> FAIL
gate:has-arch-grade     spec/contract PR without .grades/<id>-arch.md (all criteria>=7) -> FAIL
gate:has-review         code PR without .reviews/<id>.md (no P0/P1) -> FAIL
gate:tests              vitest not green -> FAIL
gate:coverage           core/+shared/ below thresholds (lines/branches/fns/stmts 80) -> FAIL
gate:e2e                Playwright health heartbeat not green -> FAIL
gate:build              pnpm build not green -> FAIL
gate:typecheck/lint     not green -> FAIL
```

### 6.4 Identity detection + `Spec:` trailer (closes grade §4 holes)

**Model identity resolution (precedence):**
1. `MODEL` env var (CI sets it from the PR head-branch prefix), else
2. the `Model:` trailer of the latest commit, else
3. the branch prefix (`composer/`→composer, `opus/`→opus, `human/`→human).
Resolved model is `composer` if any source says composer.

**Base-branch diff:** `BASE=$(git merge-base origin/main HEAD); git diff --name-only "$BASE"...HEAD`.

**`Spec:` trailer:** format `Spec: <id>`, `<id>` matches `^(P[0-9]+)-[0-9]{2}$` or `^contracts/[A-Z0-9_]+$`. Valid iff `<id>` is present in `specs/registry.json` (`{ "specs": ["P0-01", ... , "contracts/PAYMENT_RAIL"] }`). `gate-no-new-decisions` extracts trailers from `git log "$BASE"...HEAD --format=%B`.

**Opus-approved dependency/contract changes:** made on an `opus/` branch (not blocked by `gate:frozen-paths`) and must carry a `Spec:` trailer (so `gate:no-new-decisions` passes). This is the concrete escalation flow the grade asked for.

### 6.5 Gate/grade scripts — CLI contracts + fixtures (closes grade §1, §3, §5, §6 holes)

Each script: typed argv (via a tiny parser), reads env via `@t/config`, deterministic stdout, explicit exit codes, and a vitest test using fixtures in `scripts/__fixtures__/`.

```
gate-frozen-paths.ts
  usage: tsx scripts/gate-frozen-paths.ts [--base origin/main]
  reads: changed files (git), resolved model (§6.4), FROZEN_GLOBS (constant in file)
  exit 0: model != composer OR no frozen file changed
  exit 1: composer changed a frozen file -> stderr: "ESCALATE TO OPUS: <file> is frozen"
  test fixtures: { model, changedFiles[] } x cases (composer+frozen=fail, composer+ok=pass,
                 opus+frozen=pass). Snapshot the stderr message.

gate-no-new-decisions.ts
  usage: tsx scripts/gate-no-new-decisions.ts [--base origin/main]
  detects in the diff: added `export (type|interface|function|const)`, new dep in package.json,
                 new drizzle table, new `env.` key. If any AND no valid Spec: trailer -> exit 1.
  test fixtures: diff samples + commit-message samples; cases: new-symbol+no-spec=fail,
                 new-symbol+valid-spec=pass, no-new-symbol=pass, spec-not-in-registry=fail.

grade-arch.ts
  usage: tsx scripts/grade-arch.ts <slice-id> [--spec docs/09-...md]
  calls model env.GRADER_MODEL (OpenAI SDK, default gpt-5.5) with the §9 rubric + the spec text.
  writes .grades/<slice-id>-arch.md in the EXACT format of the existing .grades/P0-arch.md
    (Scores 1-6, min score, verdict, criterion notes, required revisions, final verdict).
  exit 1 if any criterion < 7. Updates STATE via state-set.
  test: mock the OpenAI client, assert file written + exit code on a sample model response.

review-code.ts
  usage: tsx scripts/review-code.ts <slice-id> [--base origin/main]
  sends the diff to env.REVIEWER_MODEL (Anthropic SDK, default Opus 4.8) with the 08 §7.2 rubric.
  writes .reviews/<slice-id>.md: list of findings tagged P0/P1/P2 + verdict. exit 1 if any P0/P1.
  test: mock Anthropic client; assert parsing of P0/P1 -> exit 1, only P2 -> exit 0.

audit-reviews.ts
  usage: tsx scripts/audit-reviews.ts [--sample 5]
  samples recent .reviews/* -> GRADER_MODEL meta-check for rubber-stamping -> writes
  .reviews/_audit-<date>.md. exit 0 always (advisory). test: mock client, assert file written.

state-set.ts
  usage: tsx scripts/state-set.ts --key <k> --value <v>   (the ONLY writer of STATE.md)
  validates key against the STATE schema; rewrites STATE.md. test: round-trip a key.

session-banner.ts
  usage: tsx scripts/session-banner.ts
  parses STATE.md; if HUMAN-ACTION-REQUIRED true prints
    ">>> HUMAN ACTION REQUIRED: <next-gate> <<<" to stdout and exits 0.
  test: fixture STATE.md -> snapshot banner.
```

### 6.6 `.github/workflows/ci.yml`

One workflow, `on: pull_request`. Jobs (each its own status check, all required by branch protection on `main`):

```
setup        -> pnpm install --frozen-lockfile
quality      -> typecheck, lint, build
test         -> test:coverage  (fails on coverage threshold)  [gate:tests + gate:coverage]
e2e          -> install playwright browsers, test:e2e          [gate:e2e]
gate-frozen  -> gate:frozen-paths
gate-decide  -> gate:no-new-decisions
gate-grade   -> if PR label "spec": require .grades/<id>-arch.md present & passing
gate-review  -> if PR label "code": require .reviews/<id>.md present & no P0/P1
```

CI sets `MODEL` from the head branch prefix so identity detection (§6.4) is deterministic.

---

## 7. P0 definition of done (exit bar)

- [ ] `pnpm install && pnpm typecheck && pnpm lint && pnpm build && pnpm test:coverage && pnpm test:e2e` all green locally and in CI.
- [ ] Coverage gate provably fails when a `core/` branch is left untested (verified once by a throwaway commit).
- [ ] `pnpm dev` boots web + api + worker; SDK `health()` returns `ok:true`.
- [ ] One Drizzle migration applied to Supabase; round-trip test green.
- [ ] Supabase Auth: `/me` 401 vs 200; `/dashboard` redirect when logged out.
- [ ] Sentry capture asserted via mock in test; `/debug/sentry` dev-only.
- [ ] All `gate:*` jobs run in CI; the `composer/zz-frozen-probe` PR is blocked by `gate:frozen-paths`.
- [ ] Gate/grade scripts have passing fixture tests.
- [ ] `pnpm session` prints the banner; `.grades/`, `.reviews/`, `specs/registry.json`, `project-trillion/docs/` present.
- [ ] Web on Vercel, api on Railway, both reachable.

---

## 8. What P0 explicitly does NOT include

No domain features (registration, search, payments, receipts, disputes, eval). Those are P1-P6. P0 is the skeleton + the machinery that governs how P1-P6 get built. Datadog runtime tracing is deferred to v1 (env + `NoopMetrics` only in P0).

---

## 9. P0 architecture grade rubric (manual — GPT 5.5)

Re-run after this revision. Paste this spec to GPT 5.5, score 1-10 each, **gate = all >= 7**:

1. **Correctness** — bootable, testable monorepo the loop can build on?
2. **Simplicity** — anything overbuilt vs a v0 skeleton?
3. **Scalability seams** — stateless apps, module boundaries, `PaymentRail`, Inngest event seam + idempotency convention present?
4. **Governance integrity** — do frozen paths + identity detection + `Spec:` trailer + gates make "Composer never decides" enforceable, with no holes?
5. **Testability** — coverage tooling + thresholds + failing-coverage check real; E2E heartbeat wired; gate scripts have fixtures?
6. **Composer-executability** — could a lower model implement each slice with zero ambiguity? Flag any hidden decision.

Record in `.grades/P0-arch.md` (overwrite). If any criterion < 7, hand back to Opus to revise. Do not switch to Composer until all six are >= 7.

---

## 10. WHEN TO SWITCH TO COMPOSER (the exact gate)

```
NOW        -> Opus has revised this spec per the GPT 5.5 grade.                    [done]
NEXT (you) -> Re-run the manual P0 architecture grade (§9) with GPT 5.5.
              - all criteria >= 7 -> overwrite .grades/P0-arch.md, APPROVE.
              - any criterion < 7 -> hand back to Opus. DO NOT switch yet.
THEN       -> SWITCH TO COMPOSER 2.5 in project-trillion/. It executes P0-01..P0-12
              in order, branch composer/P0-NN, one PR per slice, obeying AGENTS.md.
DURING     -> Composer emits DECISION-NEEDED or hits a frozen path -> SWITCH BACK TO OPUS.
AFTER P0   -> Manual review of P0 (bootstrap). Once merged, gates are live; P1 is automatic:
              Opus writes contract -> GPT 5.5 grades -> you approve -> Composer codes.
```

**Plain answer to "when do I switch to Composer":** the moment the re-graded `.grades/P0-arch.md` shows all six criteria ≥ 7 and you approve. Not before.
