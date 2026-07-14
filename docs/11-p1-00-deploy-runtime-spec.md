# P1-00 Spec — Production Packaging + Runtime Contract (the deploy/runtime hardening)

> **Tier:** Architecture artifact authored by **Opus 4.8 (architect)**. The binding contract Composer 2.5
> implements against. Companion to `08-loop-proof-v0-engineering-plan.md` (roles, decision boundary, gates)
> and `09-p0-scaffold-spec.md` (the P0 scaffold this hardens).
> **Answers:** `project-trillion/docs/P1-deploy-runtime-handoff.md` (the evidence + forks; this doc makes the calls).
> **Status:** SPEC — pending GPT-5.5 architecture grade (`.grades/P1-00-arch.md`, gate = all six criteria ≥ 7)
> before any code is written. Do not switch to Composer until that grade reads `Gate verdict: PASS`.

---

## 0. The one-paragraph summary

P0 shipped and deployed, but production runs on two **throwaway interim hacks** (run TypeScript source via
`tsx` in prod; carry an explicit `:8080` in `API_BASE_URL` to coerce the bind port). Both exist because of two
prod-only defects CI never caught (F1: workspace packages export TS source, so `node dist/server.js` cannot
resolve them; F2: no `$PORT` contract). **P1-00 makes the deployed Node apps run as plain `node dist/server.js`
by bundling each deployable app (inlining workspace source), adds a real `PORT`/`APP_VERSION` runtime contract,
and adds a CI job that boots the built artifact under plain `node` and hits `/health` so F1 can never silently
return.** It is small, infrastructural, and self-verifying. It changes **zero** domain behavior.

---

## 1. Naming + sequencing ruling (Opus decision — read this first)

The handoff doc calls this work "the P1 spec." The roadmap (`08` §9.2) reserves **P1 = registry + discovery**,
and `specs/registry.json` already reserves `P1-01 … P1-06` for those domain slices. To resolve the collision:

> **Ruling: this work is `P1-00` — the infrastructure *prelude* to phase P1. It lands before `P1-01`, and it
> does NOT consume any of the `P1-01 … P1-06` slots reserved for registry + discovery.**

Rationale:

- **It is a hard prerequisite for P1-01+.** Registry + discovery will add new `packages/*` (e.g. domain
  modules, new contracts). Every new workspace package re-arms F1 (a fresh `@t/*` that exports TS source breaks
  `node dist`). Fixing the packaging *before* adding packages is the only safe order.
- **`P1-00` fits the spec-id grammar** (`^(P[0-9]+)-[0-9]{2}$` → `P1-00` is valid), sorts first, and is honest
  about scope without renumbering the roadmap or disturbing the reserved domain slots.
- **It is one cohesive change, not a phase.** Total diff is ~150 lines. It is one Composer PR behind one Opus
  enablement PR (§6), not a six-slice phase.

`registry + discovery` remains exactly where `08` and the registry put it: `P1-01 … P1-06`, after `P1-00`.

---

## 2. Problem statement (recap; full evidence in the handoff)

### F1 — `node dist/server.js` cannot run because workspace packages export TS *source*
Every `@t/*` package's `package.json` has `"exports": { ".": "./src/index.ts" }`, and barrels re-export with
`.js` specifiers (`export { … } from './env.js'`) that only resolve to `.ts` under a bundler-style resolver
(`tsx`, Turbopack, vitest). Plain `node` type-strips `packages/config/src/index.ts`, sees `./env.js`, finds no
`env.js` in `src/`, and throws `ERR_MODULE_NOT_FOUND`. **`turbo run build` + `node dist/server.js` is
structurally impossible under the current package contract.** Reproduced identically to the Railway crash.

### F2 — there is no `$PORT` contract
`apps/api/src/server.ts` derives its **bind port** from `env.API_BASE_URL` via `resolvePort()`, conflating bind
port with public URL. `apps/worker/src/server.ts` hardcodes `const PORT = 3002`. Neither reads `$PORT`, which
every 12-factor PaaS injects. There is no `APP_VERSION` in `@t/config`, so `/health` reports a hardcoded
`'0.0.0'`.

### Why CI never caught either
Dev, e2e, and vitest all run the API through `tsx` / Turbopack (bundler resolution). **Nothing in dev/CI ever
runs a compiled app under plain `node`.** F1 lives precisely in that blind spot — which is why the §5.3
regression guard is a first-class deliverable, not a nicety.

---

## 3. Architecture decisions (LOCKED — these are the Opus calls Composer must not re-litigate)

### D-1 — Production packaging: **bundle each deployable app with `tsup`, inlining only workspace source**

Chosen over the handoff's two alternatives:

| Option | Verdict | Why |
|--------|---------|-----|
| (a) `tsx`-in-prod (the interim) | **Rejected** | Ships a dev runtime + raw TS to prod; the §6 done-when explicitly forbids `tsx` in the deployed artifact; never actually makes `node` run the artifact. |
| (b) Per-package conditional exports (`development`→`src`, `default`→`dist`) | **Rejected** | Adds export-condition complexity to **every** package and **every** dev tool; would require editing `packages/contracts/**` exports (FROZEN); is exactly the class of pain that bit P0-06 (Turbopack could not resolve `@t/config` `.js` subpath exports). |
| (c) **Bundle each deployable app (tsup/esbuild), inline workspace deps** | **CHOSEN** | A bundler does the `.js`→`.ts` resolution `node` won't, inlines `@t/*` TS source into a single `dist/server.js`, leaves `tsx`/Turbopack/vitest dev paths **untouched**, yields fast cold starts and a lean image, and needs no exports gymnastics. This is the handoff's recommendation. |

**Tool: `tsup`** (a thin, dense-training-data wrapper over esbuild; esbuild is already in `allowBuilds`). Pinned
config (§5.1) — Composer copies it verbatim into `apps/api/tsup.config.ts` and `apps/worker/tsup.config.ts`.

**Inline boundary (the precise, robust rule):**

- **Inline (`noExternal`):** `/^@t\//` (all workspace packages — this is the F1 fix) **and** `dotenv` (tiny,
  pure, so the deployed artifact needs zero `dotenv` at runtime).
- **External (everything else):** `hono`, `@hono/node-server`, `@hono/zod-openapi`, `@sentry/node`,
  `@supabase/supabase-js`, `inngest`, **and `zod`**. These resolve from `node_modules` at runtime (installed by
  `pnpm install --frozen-lockfile`, which the deploy already runs).

Why external (not inlined) for the heavy/sensitive deps:

- **`@sentry/node`** uses `require-in-the-middle` + OpenTelemetry dynamic requires — bundling it is a known
  footgun. Keep it external (it is already a direct dep of `apps/api`, so it resolves).
- **`zod` MUST be a single instance.** `@hono/zod-openapi` (external) validates the `HealthResponse` schema that
  comes from `@t/contracts` (inlined). If the inlined code carried its own bundled `zod` while `@hono/zod-openapi`
  used a different external `zod`, zod-to-openapi could fail to recognize the schema (dual-package hazard).
  **Resolution: externalize `zod` and add `zod` as a direct dependency of `apps/api` and `apps/worker`** so a
  single, pnpm-deduped `zod` is shared by the app code, the inlined workspace code, and `@hono/zod-openapi`.
  (`apps/api` legitimately uses `zod` already — it re-exports `z` from `@t/contracts` — so the direct dep is
  architecturally honest, not a workaround.)
- `dotenv` and `zod` are the only previously-transitive-only third-party libs the inlined `@t/*` code imports.
  `dotenv` is inlined; `zod` is externalized + made a direct dep. After that, **every** external import in the
  bundle resolves from the app's own `node_modules`.

**Why this is safe even where the inline/external split has an edge:** D-6's regression guard boots
`node dist/server.js` in CI and fails the PR on any unresolved module. The bundler decision is therefore
**self-verifying** — if reality disagrees with this split, CI catches it on the implementing PR and Composer
escalates `DECISION-NEEDED` (it does not guess). See §7.

### D-2 — `$PORT` runtime contract (resolves F2)

- Add to the `@t/config` schema: `PORT` (optional; no universal default) and `APP_VERSION` (string, default
  `'0.0.0'`). `PORT` is `z.coerce.number()` so the platform-injected string `$PORT` becomes a number.
- **Each service binds `env.PORT ?? <service default>`** — api `?? 8787`, worker `?? 3002`. A single schema
  field with **per-service code defaults** means: on a PaaS each service uses its injected `$PORT`; locally
  `pnpm dev` runs both with distinct defaults and they never collide.
- **`API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` revert to meaning *public URL only*** (consumed by the CORS
  allowlist, the SDK, the web app, and — in P3 — Stripe webhooks). They are no longer the source of the bind
  port. This is the deferred R-6 decision, now ratified.
- **Local + CI convention:** `API_BASE_URL = http://localhost:${PORT}`. Locally and in CI the "public URL" *is*
  `localhost:PORT`, so the two coincide; in prod they diverge (Railway public `https` URL vs injected `$PORT`),
  and the api binds `env.PORT` while `API_BASE_URL` is used only for CORS/SDK.

### D-3 — `APP_VERSION` value source

`APP_VERSION` is an env var; deploy platforms inject it (recommend Railway `APP_VERSION = ${{ RAILWAY_GIT_COMMIT_SHA }}`
or a release string). Default `'0.0.0'` when unset, so local/test never break. `/health` reports `env.APP_VERSION`.
The done-when "`/health` reports a real `APP_VERSION`" is satisfied by setting the var in the deploy env.

### D-4 — Worker gains a `GET /health` route (deploy parity + guardability)

The worker app currently exposes only `/api/inngest`. To give it the **identical deploy shape** as the api (the
handoff's explicit goal) and to let the regression guard assert it the same way, add a minimal
`GET /health → { ok:true, service:'worker', version: env.APP_VERSION, ts }` to the worker's Hono app. (Reads, but
does not edit, the FROZEN `HealthResponse` shape from `@t/contracts`.)

### D-5 — Build wiring

- Change **only** `apps/api` and `apps/worker` `build` scripts from `tsc -p tsconfig.json` to `tsup`. `apps/web`
  keeps `next build`. `packages/*` keep their `tsc` build (used for `typecheck`/declarations; harmless — `tsup`
  inlines from `src`, not from package `dist`).
- `turbo`'s `build` task (`outputs: ["dist/**", ".next/**"]`) already covers the tsup output. The `^build`
  dependency order is harmless.
- `typecheck` (`tsc --noEmit`) is unchanged. `dev` (`tsx watch`) is unchanged. Turbopack (web) and vitest are
  unchanged. **Only a new prod build path is added; no existing path is altered.**

### D-6 — Regression guard (resolves the blind spot that hid F1)

A new CI job **`boot-artifact`** that: `pnpm build` → runs `node apps/api/dist/server.js` and
`node apps/worker/dist/server.js` under plain `node` (with CI's dummy env + an inline `PORT`) → curls `/health`
on each → fails the PR if either does not return `"ok":true`. This is the gate that no P0 job performed. It must
be added to branch protection's required checks.

### D-7 — Deploy configuration (replaces the interim hacks)

- **Build from the monorepo root, always** (invariant): build via a turbo filter, never a subfolder Root
  Directory. Provide `deploy/railway.api.json` and `deploy/railway.worker.json` (config-as-code, per-service
  path), each with `buildCommand = pnpm install --frozen-lockfile && pnpm turbo run build --filter=@t/<svc>` and
  `startCommand = node apps/<svc>/dist/server.js`.
- **Prefer build-time bundling over Dockerfiles** (invariant): no Dockerfile. Docker remains the documented
  escape hatch, not the P1 default.
- **The two interim Railway hacks are removed** (§3 of the handoff): the `tsx` start command and the
  `API_BASE_URL:8080` port hack both go away. `API_BASE_URL` is set to the public `https` URL (now safe — bind
  port comes from injected `$PORT`); `APP_VERSION` is set.

### D-8 — Worker production deployment stays **deferred** (P0 scope was web + api)

P1-00 makes the worker **deployable and guarded** (it builds to `dist/server.js` and CI boots it). Provisioning
the live Railway worker *service* is deferred until the worker is actually needed (P3 commerce events). The CI
regression guard still boots the worker artifact every PR so F1 cannot silently regress for it.

---

## 4. Invariants preserved (the handoff §4 "do not regress" list — each shown honored)

| Invariant | How P1-00 honors it |
|-----------|---------------------|
| Build from the monorepo root, always | `deploy/railway.*.json` use `pnpm turbo run build --filter=@t/<svc>` from repo root; no subfolder Root Directory. |
| `pnpm install --frozen-lockfile` in every deploy | Build commands keep `--frozen-lockfile`; **not** `--prod` (the build step needs `tsup`, a devDep). `pnpm-lock.yaml` + root `package.json` are touched only on the Opus enablement branch (§6). |
| Do not break dev/e2e resolution | `tsx` (dev/e2e), Turbopack (web), vitest all keep consuming package **source**. Bundling adds a *new* prod path and changes none of them. |
| Stay on managed PaaS buildpacks; no Dockerfile | No Dockerfile; `tsup` build + `railway.json` config-as-code on Nixpacks. |
| The only new edge target in P1 is the Cloudflare AgentCard resolver (its own thing) | Not part of P1-00. P1-00 touches only api + worker packaging + the config contract. |

---

## 5. Target end-state — exact file changes (Composer fills these verbatim)

> All paths relative to `project-trillion/`. Frozen-path status noted per file. Code blocks are the intended
> end state, not diffs — copy the shapes exactly.

### 5.1 `packages/config/src/env-core.ts` — add `PORT` + `APP_VERSION` (NOT frozen)

Add two fields to the `z.object({...})` schema (after `NODE_ENV`):

```ts
  PORT: z.coerce.number().int().positive().optional(),
  APP_VERSION: z.string().min(1).default('0.0.0'),
```

No other change. The `shouldSkipValidation` build-time bypass already protects `next build`/`pnpm build`.

### 5.2 `apps/api/src/server.ts` — bind `env.PORT`, delete `resolvePort` (NOT frozen)

```ts
import './instrument.js';

import { serve } from '@hono/node-server';
import { env } from '@t/config';

import { app } from './app.js';

const PORT = env.PORT ?? 8787;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
```

(`resolvePort` and the `new URL(env.API_BASE_URL)` parsing are removed entirely.)

### 5.3 `apps/api/src/app.ts` — report the real version (NOT frozen)

Delete `const APP_VERSION = '0.0.0';`. In the health handler use `env.APP_VERSION` (`env` is already imported):

```ts
app.openapi(healthRoute, (c) => {
  return c.json({
    ok: true,
    service: 'api',
    version: env.APP_VERSION,
    ts: new Date().toISOString(),
  });
});
```

### 5.4 `apps/worker/src/server.ts` + `apps/worker/src/serve.ts` — bind `env.PORT`, add `/health` (NOT frozen)

`server.ts`:

```ts
import { serve } from '@hono/node-server';
import { env } from '@t/config';

import { app } from './serve.js';

const PORT = env.PORT ?? 3002;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Worker listening on http://localhost:${info.port}`);
});
```

`serve.ts` — add a health route (and the `env` import) to the existing Hono app, above `/api/inngest`:

```ts
import { serve as inngestServe } from 'inngest/hono';
import { Hono } from 'hono';
import { env } from '@t/config';

import { inngest } from './client.js';
import { functions } from './functions/index.js';

export const app = new Hono();

app.get('/health', (c) =>
  c.json({ ok: true, service: 'worker', version: env.APP_VERSION, ts: new Date().toISOString() }),
);

app.on(['GET', 'PUT', 'POST'], '/api/inngest', (c) => {
  const handler = inngestServe({ client: inngest, functions });
  return handler(c);
});
```

### 5.5 `apps/api/tsup.config.ts` — NEW FILE (NOT frozen)

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  bundle: true,
  // Inline workspace TS source (the F1 fix) + dotenv (tiny, pure). Everything else
  // — hono, @hono/*, @sentry/node, @supabase/*, zod — stays external and resolves
  // from node_modules at runtime (pnpm install --frozen-lockfile).
  noExternal: [/^@t\//, 'dotenv'],
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
  minify: false,
});
```

`entry: { server: 'src/server.ts' }` deterministically emits `dist/server.js` (apps are `"type":"module"`).

### 5.6 `apps/worker/tsup.config.ts` — NEW FILE (NOT frozen)

Identical to 5.5 (entry is the worker's own `src/server.ts`; external set additionally externalizes `inngest`,
`hono`, `@hono/node-server`, which are worker deps — they stay external by default).

### 5.7 `apps/api/package.json` + `apps/worker/package.json` — deps + build script (NOT frozen, BUT see §6)

For **each** app: set `"build": "tsup"`; add devDep `tsup` (latest stable via `pnpm add -D`); add dependency
`zod` (latest stable, matching the workspace `zod@^4` range). **Because adding deps mutates the FROZEN
`pnpm-lock.yaml`, this edit + `pnpm install` happens on the Opus enablement branch (§6.1), not a Composer
branch.**

### 5.8 `e2e/playwright.config.ts` — target the bind port (NOT frozen)

Decouple e2e from `API_BASE_URL` (now "public URL only") by binding + hitting `env.PORT`:

```ts
import { defineConfig } from '@playwright/test';

import { env } from '../packages/config/src/env.js';

const PORT = env.PORT ?? 8787;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: 'pnpm --filter @t/api dev',
    url: `${baseURL}/health`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: { baseURL },
});
```

### 5.9 `.github/workflows/ci.yml` — env, regex generalization, regression guard (NOT frozen)

Three edits (the **regex generalization** rides the Opus enablement branch per §6.1 so it is on `main` before
the Composer PR opens; the **env line** and **`boot-artifact` job** are in the Composer PR):

1. **`env:` block** — add `PORT: '8787'` (`API_BASE_URL` is already `http://localhost:8787`, so it stays
   consistent with the bind port).

2. **Generalize the `gate-grade` and `gate-review` slug extraction** so they understand any phase, not only
   `P0`. Replace the P0-hardcoded `sed` in both jobs:

   ```bash
   SLICE_ID="${{ github.head_ref }}"
   SLICE_ID="${SLICE_ID##*/}"
   SLICE_ID="${SLICE_ID^^}"
   SLICE_ID=$(echo "$SLICE_ID" | sed -E 's/^(P[0-9]+-[0-9]+).*/\1/')
   ```

   (`composer/p1-00` → `P1-00`; `opus/p1-00-enablement` → `P1-00`; `composer/p0-03-db` → `P0-03`, unchanged.)

3. **Add the regression-guard job** (new required status check):

   ```yaml
     boot-artifact:
       needs: setup
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: pnpm
         - run: pnpm install --frozen-lockfile
         - run: pnpm build
         - name: Boot api artifact under plain node and assert /health
           run: |
             OK=""
             PORT=8787 node apps/api/dist/server.js &
             API_PID=$!
             for i in $(seq 1 30); do
               if curl -fsS "http://localhost:8787/health" | grep -q '"ok":true'; then OK=1; break; fi
               sleep 1
             done
             kill "$API_PID" || true
             test "$OK" = "1" || (echo "api artifact failed /health under plain node" && exit 1)
         - name: Boot worker artifact under plain node and assert /health
           run: |
             OK=""
             PORT=3002 node apps/worker/dist/server.js &
             W_PID=$!
             for i in $(seq 1 30); do
               if curl -fsS "http://localhost:3002/health" | grep -q '"ok":true'; then OK=1; break; fi
               sleep 1
             done
             kill "$W_PID" || true
             test "$OK" = "1" || (echo "worker artifact failed /health under plain node" && exit 1)
   ```

   The job inherits the top-level CI `env:` block (dummy, schema-valid secrets), so `@t/config` validates and
   each server boots; `PORT` is overridden inline per service. The `/health` route is static — no external
   service is needed.

### 5.10 `deploy/railway.api.json` + `deploy/railway.worker.json` — NEW FILES (NOT frozen)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile && pnpm turbo run build --filter=@t/api"
  },
  "deploy": {
    "startCommand": "node apps/api/dist/server.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

(`railway.worker.json` is identical with `@t/worker` and `apps/worker/dist/server.js`.) Each Railway service
points its "Config as code" path at the matching file. Root Directory stays the repo root.

### 5.11 `.env.example` + local `.env` (human) — port wiring (NOT frozen / `.env` is git-ignored)

`.env.example`: add `PORT=8787`, `APP_VERSION=0.0.0`, and set `API_BASE_URL=http://localhost:8787`. The human
updates the real (git-ignored) `.env` to `PORT=8787` and `API_BASE_URL=http://localhost:8787` so local `pnpm dev`
+ e2e bind and hit the same port. (Current `.env` has `API_BASE_URL=http://localhost:3001`; without this update
local e2e would hit the wrong port.)

### 5.12 Tests (NOT frozen)

- `apps/api/src/app.test.ts` — the `/health` unit test stays green because `APP_VERSION` defaults to `'0.0.0'`
  in the test env. Optionally assert `version` against `env.APP_VERSION` for precision. **Required: it must stay
  green.**
- Recommended (not required for any gate — worker is outside the coverage `include` set): add
  `apps/worker/src/serve.test.ts` asserting `app.request('/health')` → `200` with `ok:true`.
- No change to the coverage gate: `vitest.config.ts` `include` is `packages/core` + `packages/shared` only;
  P1-00 touches neither, so coverage is unaffected.

---

## 6. Governance path (how P1-00 clears every gate — Composer never decides)

Two PRs. The decision-bearing, frozen-path-touching work is Opus-owned; the mechanical body-filling is Composer.

### 6.1 PR-A — Opus enablement (`opus/p1-00-enablement`)

Opus-owned because it edits **frozen** paths and makes the dependency/registry decisions. Carries
`Model: opus-4.8` trailers (so `gate:frozen-paths` resolves model ≠ composer and passes) and a `Spec: P1-00`
trailer (so `gate:no-new-decisions` passes).

Contents:
1. **Snapshot this spec** into the repo at `project-trillion/docs/11-p1-00-deploy-runtime-spec.md` (authoring
   home stays `Marketplace/docs/`; per the `09` §1 convention the in-repo copy is the committed snapshot the
   grade gate resolves against).
2. **`specs/registry.json`** (FROZEN) — append `"P1-00"` to the `specs` array.
3. **`apps/api/package.json` + `apps/worker/package.json`** — add devDep `tsup`, dependency `zod`; run
   `pnpm install` to update **`pnpm-lock.yaml`** (FROZEN).
4. **`.github/workflows/ci.yml`** — the `gate-grade`/`gate-review` slug-regex generalization (§5.9 item 2) so
   the Composer PR's `gate-review` resolves `.reviews/P1-00.md` and any future phase works. (Lands on `main`
   *before* the Composer PR opens, avoiding a workflow-file chicken-and-egg.)
5. **`.grades/P1-00-arch.md`** — the GPT-5.5 architecture grade artifact (produced by `pnpm grade:arch P1-00
   --spec docs/11-p1-00-deploy-runtime-spec.md` or by pasting this spec to GPT-5.5), containing `Gate verdict:
   PASS`. The PR is labeled `spec` so `gate-grade` requires this file.

> Note: PR-A is the concrete realization of the handoff §5 line "Land on an `opus/` branch (architecture
> decision; Composer must not own it)." The *architecture* (deps, registry, contract decision, grade) is Opus's;
> only the mechanical code in PR-B is Composer's.

### 6.2 PR-B — Composer implementation (`composer/p1-00`)

One PR, all source edits from §5.1–5.12 **except** the frozen items handled in PR-A (registry, lockfile/deps,
the regex generalization). Labeled `code`. Carries `Model: composer-2.5` + a `Spec: P1-00` trailer.

Frozen-path proof — every file PR-B touches is **non-frozen**:

| PR-B file | Frozen? | Notes |
|-----------|---------|-------|
| `packages/config/src/env-core.ts` | No | `packages/config/**` is explicitly not frozen. |
| `apps/api/src/server.ts`, `app.ts` | No | Only `apps/api/**/commerce/**` is frozen. |
| `apps/worker/src/server.ts`, `serve.ts` | No | — |
| `apps/api/tsup.config.ts`, `apps/worker/tsup.config.ts` | No | New build config. |
| `apps/api/package.json`, `apps/worker/package.json` (build script only) | No | The `package.json` frozen glob matches the **root** file only (verified against `scripts/lib/glob-match.ts`); deps were added in PR-A. |
| `e2e/playwright.config.ts` | No | — |
| `.github/workflows/ci.yml` (env line + `boot-artifact` job) | No | Workflow file is not frozen. |
| `deploy/railway.*.json`, `.env.example`, tests | No | — |

`gate:no-new-decisions` — PR-B's added `env.PORT` / `env.APP_VERSION` usages trip the `ENV_KEY_RE`
(`/^\+.*\benv\.[A-Z0-9_]+/`) detector; the `Spec: P1-00` trailer (now valid — `P1-00` is in the registry after
PR-A) satisfies the gate. No new `export`, no lockfile change in PR-B, so nothing else trips.

`gate:frozen-paths` — model resolves to `composer`; no file in the table above matches `FROZEN_GLOBS`; **and PR-B
does not modify `pnpm-lock.yaml`** (deps already present from PR-A) — so the gate passes.

`gate-review` — PR-B is labeled `code`; Opus runs `pnpm review:code P1-00` → `.reviews/P1-00.md` with no P0/P1
findings; the (generalized) job resolves the `P1-00` slug and passes.

`quality` / `test` / `e2e` / `boot-artifact` — all green (the new build path + the new guard are exercised).

### 6.3 If reality fights the bundler split → STOP, do not guess

If `node dist/server.js` fails to resolve a module in the `boot-artifact` job (e.g. an external dep the inlined
workspace code needs that is not reachable from the app's `node_modules`), that is a **`DECISION-NEEDED`**
(`08` §6.6, `blocked-by: multiple-approaches`). Opus adjusts the `noExternal`/`external` list (and, if a new
direct dep is required, makes it on an `opus/` branch because of the lockfile freeze). Composer never edits the
inline boundary on its own.

### 6.4 Branch protection (human, like P0)

Add `boot-artifact` to the required status checks on `main` alongside the existing
`quality / test / e2e / gate-frozen / gate-decide / gate-grade / gate-review`.

---

## 7. Done-when (exit bar — traces 1:1 to the handoff §6)

- [ ] `node apps/api/dist/server.js` and `node apps/worker/dist/server.js` run the **bundled** artifact with only
      env vars set — no `tsx`, no source resolution. *(D-1, §5.5–5.6, proven by `boot-artifact`.)*
- [ ] Both services bind `env.PORT`; `API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` mean public URL only. *(D-2,
      §5.2/5.4/5.8.)*
- [ ] `/health` reports a real `APP_VERSION` (deploy env injects it; default `'0.0.0'`). *(D-3, §5.1/5.3.)*
- [ ] CI `boot-artifact` builds + boots both compiled artifacts under plain `node` and asserts `/health` — the
      F1 regression guard. *(D-6, §5.9 item 3.)*
- [ ] The §3-of-handoff interim Railway settings (the `tsx` start command and the `API_BASE_URL:8080` port hack)
      are removed; `API_BASE_URL` is the public `https` URL; `APP_VERSION` is set. *(D-7, §5.10 + the runbook.)*
- [ ] Full local + CI suite green: `pnpm install && pnpm typecheck && pnpm lint && pnpm build &&
      pnpm test:coverage && pnpm test:e2e` plus `pnpm gate:frozen-paths` and `pnpm gate:no-new-decisions`.

### 7.1 Deploy runbook (human, executed at PR-B merge — replaces the handoff §3 interim)

Per Railway service (api; worker when provisioned):
1. Point "Config as code" at `deploy/railway.api.json` (or set Build/Start in the dashboard to match it).
2. **Remove** the interim Start command `pnpm --filter @t/api exec tsx src/server.ts`.
3. Set `API_BASE_URL` to the **public `https` URL** (drop the `:8080`); the bind port now comes from the
   injected `$PORT`.
4. Set `APP_VERSION` (recommend `${{ RAILWAY_GIT_COMMIT_SHA }}`).
5. Confirm Vercel `/health` → Railway api → `ok` with the real version (the same end-to-end check P0 used).

---

## 8. What P1-00 explicitly does NOT include

- **No registry / discovery / domain features.** Those are `P1-01 … P1-06` (`08` §9.2), built *after* P1-00.
- **No live worker Railway service** (D-8 — deferred to P3; the artifact + CI guard ship now).
- **No Dockerfile, no K8s, no conditional-exports refactor** of the workspace packages.
- **No change to `apps/web`** beyond the shared `.env.example`/CI port convention (web is on Vercel, builds via
  `next build`, and was never affected by F1/F2).
- **No edits to any frozen contract** (`packages/contracts/**`, `packages/db/schema/**`,
  `packages/core/commerce/**`, the gate/grade/review scripts) — P1-00 reads `HealthResponse` but never edits it.

---

## 9. Architecture grade rubric (GPT-5.5 — gate = all six ≥ 7)

Paste this spec to GPT-5.5; score 1–10 each; record in `.grades/P1-00-arch.md` (with `Gate verdict: PASS/FAIL`)
in the format of `.grades/P0-arch.md`. If any criterion < 7, hand back to Opus — do not switch to Composer.

1. **Correctness** — does bundling actually make `node dist/server.js` run (does it close F1, including the
   `.js`→`.ts` resolution and the `@t/*` inline)? Does the `PORT`/`APP_VERSION` contract close F2 without
   conflating bind port and public URL?
2. **Simplicity** — is this the minimal durable change (no Docker, no per-package exports surgery), and is the
   `tsup` + inline-only-`@t/*` choice the simplest option that works?
3. **Scalability seams** — does P1-00 yield one identical, stateless, 12-factor deploy shape for api, worker, and
   any future extracted service?
4. **Governance integrity** — does the Opus-enablement / Composer split hold with no holes? Are the
   frozen-path (lockfile, registry), `Spec:` trailer, registry edit, and the CI slug-regex fix all correctly
   sequenced so "Composer never decides" stays true?
5. **Testability** — does the `boot-artifact` guard genuinely run the deployed artifact under plain `node` and
   assert `/health` (i.e. is the design self-verifying), and do dev/e2e stay green?
6. **Composer-executability** — could a lower model implement §5 with zero ambiguity? Is the inline/external
   boundary pinned, and is the single escalation edge (bundler resolution) routed to `DECISION-NEEDED` rather
   than guesswork?

---

## 10. Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Bundler inline/external split has an edge (a dep the inlined code needs is not runtime-reachable) | Medium | `boot-artifact` boots the real artifact and fails the PR; Composer escalates `DECISION-NEEDED`; Opus adjusts the list (D-1, §6.3). **The design is self-verifying.** |
| Dual `zod` instances break `@hono/zod-openapi` schema recognition | Low (mitigated) | `zod` is externalized and made a direct dep of api + worker → a single pnpm-deduped instance shared across app, inlined workspace, and `@hono/zod-openapi` (D-1). |
| `@sentry/node` bundling breakage | Low (avoided) | Sentry is kept external (never inlined); `instrument.ts` is a thin local file that imports the external `@sentry/node`. |
| Local e2e hits the wrong port after the contract change | Low | e2e binds + targets `env.PORT` directly (§5.8); `.env`/`.env.example`/CI standardize `API_BASE_URL=http://localhost:${PORT}` with `PORT=8787` (§5.11). |
| Adding a dep silently mutates the frozen lockfile on a Composer branch | Low | All dependency + lockfile changes are confined to PR-A (`opus/`); PR-B adds no deps and is proven frozen-clean (§6.2). |
| CI grade/review gate rejects a P1 branch (P0-hardcoded slug) | Eliminated | The slug `sed` is generalized to `^(P[0-9]+-[0-9]+)` in PR-A before PR-B opens (§5.9 item 2). |

---

## 11. Switch-to-Composer gate (the exact handoff)

```
NOW        -> Opus has authored this spec (docs/11-p1-00-deploy-runtime-spec.md).            [this doc]
NEXT (you) -> Run the §9 architecture grade with GPT-5.5.
              - all six >= 7 -> write .grades/P1-00-arch.md (Gate verdict: PASS), APPROVE.
              - any < 7       -> hand back to Opus. Do NOT switch.
THEN (Opus)-> Land PR-A (opus/p1-00-enablement): snapshot spec, registry += P1-00, add tsup+zod
              (+lockfile), generalize the CI slug regex, commit the grade. (§6.1)
THEN (you) -> SWITCH TO COMPOSER 2.5 in project-trillion/. It executes PR-B (composer/p1-00):
              all of §5.1–5.12 except the frozen items, one branch + one PR, Spec: P1-00. (§6.2)
DURING     -> Composer emits DECISION-NEEDED (e.g. bundler resolution edge) -> SWITCH BACK TO OPUS. (§6.3)
AFTER      -> Opus reviews PR-B (.reviews/P1-00.md, no P0/P1); human adds `boot-artifact` to branch
              protection (§6.4); execute the §7.1 deploy runbook; remove the interim Railway hacks.
THEN       -> P1-00 done. The next spec is P1-01 (registry), built on a now-durable deploy/runtime base.
```
