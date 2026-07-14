# P1 deploy/runtime handoff — read before speccing

> **Audience:** the Opus 4.8 agent who will write the P1 spec.
> **Status:** P0 milestone (api on Railway, `GET /health` reachable) is unblocked by an
> **interim, throwaway** config (see §3). The durable fix is a P1 decision — do NOT treat
> the interim as the design. This note is the evidence + the forks; you make the calls.
> **Origin:** surfaced while provisioning the Railway api deploy (the last P0-13 human task).

---

## 1. What broke, and why CI never caught it

Provisioning `apps/api` on Railway exposed two prod-only defects. Both pass every gate
today because **nothing in dev/CI ever runs a compiled app under plain `node`** — dev,
e2e, and vitest all run the API through `tsx`/Turbopack (bundler-style resolution).

### F1 — Workspace packages export TypeScript *source*, so `node dist/...` cannot run them
Every `@t/*` package exports source, not build output:
- `packages/{config,shared,contracts,sdk,core,db}/package.json` → `"exports": { ".": "./src/index.ts" }`
- `apps/api/package.json` → `"exports": { ".": "./src/app.ts" }`
- `packages/config/src/index.ts` re-exports with a `.js` specifier: `export { … } from './env.js';`

When the compiled `apps/api/dist/server.js` imports `@t/config`, Node resolves to
`packages/config/src/index.ts`, type-strips it (Node 22.22 does this by default), sees
`./env.js`, and there is **no `env.js` in `src/`** (only `env.ts`; the compiled `env.js`
sits in `dist/`, which the `exports` map never points to). Reproduced locally — identical
to the Railway crash:
```
node  → ERR_MODULE_NOT_FOUND: .../packages/config/src/env.js imported from .../packages/config/src/index.ts
tsx   → resolves fine, proceeds to env validation
```
`tsc` *does* emit `packages/config/dist/env.js`, but the `exports` map sends consumers to
`src/`, so the build output is dead weight. **Implication:** `turbo run build` +
`node dist/server.js` is structurally impossible with the current package contract.

### F2 — No `$PORT` contract (this is the deferred R-6 decision)
- `apps/api/src/server.ts` binds the port parsed from `env.API_BASE_URL` (`resolvePort`),
  conflating *bind port* with *public URL*.
- `apps/worker/src/server.ts` hardcodes `const PORT = 3002;` — doesn't read env at all.
- Neither reads `$PORT`. Railway/Render (and every 12-factor PaaS) **inject `$PORT`**. So
  every Node service needs a per-service hack today.
- Related: `@t/config` has no `APP_VERSION`; `/health` version is hardcoded `'0.0.0'`.
  (HANDOFF.md §4 P0-13 "Open decision for Opus (R-6)" is exactly this.)

---

## 2. The three things to fold into the P1 spec

1. **Production packaging** (resolves F1). Pick the runtime model for deployed Node apps:
   - **(a) tsx-in-prod** — run source via `tsx` (the interim, see §3). Cheapest; ships TS +
     a dev runtime to prod. Fine at P0–P1 scale, weak long-term.
   - **(b) Per-package conditional exports** (`development`→`src`, `default`→`dist`) + build
     each package. Restores `node dist`, but adds export-condition complexity to every
     package *and* every dev tool — you already hit this class of pain in P0-06 (Turbopack
     could not resolve `@t/config` subpath `.js` exports).
   - **(c) Bundle each deployable app** (tsup/esbuild) into a self-contained `dist/server.js`
     with workspace deps inlined → plain `node dist/server.js` works, fast cold start, lean
     image, zero exports gymnastics. **Recommended** — cleanest and most scalable, and it
     keeps `tsx` for local dev untouched.
2. **`$PORT` runtime contract** (resolves F2). Add `PORT` (+ `APP_VERSION`) to the
   `@t/config` schema; `apps/api` and `apps/worker` bind `env.PORT`; `API_BASE_URL` /
   `NEXT_PUBLIC_API_BASE_URL` revert to meaning *public URL only* (used by CORS allowlist,
   SDK, web, and Stripe webhooks in P3). One identical deploy shape for api, worker, and any
   future extracted service.
3. **A regression guard.** Add a CI job that **builds and runs the deployed artifact under
   plain `node`** and hits `/health`. F1 existed precisely because no gate did this. Without
   it, the bug silently returns the next time a package is added.

---

## 3. Current interim state on Railway (all throwaway — remove when the spec lands)

`apps/api` service, dashboard-only (no repo changes):
- **Root Directory** = repo root (non-negotiable invariant — pnpm workspaces cannot build
  from a subfolder; this was the original `EUNSUPPORTEDPROTOCOL workspace:*` failure).
- **Install:** `pnpm install --frozen-lockfile` (must keep devDeps — `tsx` is a devDep; do
  **not** use `--prod`/`--omit=dev`).
- **Start:** `pnpm --filter @t/api exec tsx src/server.ts` (runs source, sidesteps F1).
- **Port:** `API_BASE_URL=…:8080` + Railway target port 8080 (sidesteps F2, no code change).
- **Vars:** all `.env` keys set (the API hard-fails boot if any required var is missing).

Every one of these lines is deleted/replaced by the durable design.

---

## 4. Invariants the spec MUST preserve (don't regress these)

- **Build from the monorepo root, always.** Per-service config selects the target via a
  turbo filter; never set Railway "Root Directory" to an app subfolder.
- **`pnpm install --frozen-lockfile` in every deploy.** `pnpm-lock.yaml` and root
  `package.json` are **frozen paths** — deploys must never mutate them.
- **Do not break dev/e2e resolution.** `tsx` (dev/e2e), Turbopack (web), and vitest all
  consume package *source* today. Option (c) bundling leaves this path alone; option (b)
  must keep a `development`/source export condition or it breaks every dev tool.
- **Stay on managed PaaS buildpacks.** `docs/08` is LOCKED: Vercel (web) + Railway/Render
  (api + worker), "zero-ops… K8s only if you outgrow PaaS," and "extract a service only when
  a module needs independent scaling." → prefer **build-time bundling over Dockerfiles**;
  Docker is the documented escape hatch, not the P1 default. Keep deploy targets minimal
  (web → Vercel; api + worker → Railway; the only new edge target in P1 is the Cloudflare
  Worker AgentCard resolver, which is its own thing — not part of this packaging decision).

---

## 5. Governance path for the spec (so it clears the gates)

- Land on an **`opus/`** branch (architecture decision; Composer must not own it).
- **New env vars** (`PORT`, `APP_VERSION`) trip `gate:no-new-decisions` → the PR needs a
  `Spec: <id>` trailer and `<id>` registered in `specs/registry.json`. Note `specs/registry.json`
  is itself a **frozen path**, so the registry edit must be on the `opus/` (or `human/`) branch.
- If the PR is labeled `spec`, `gate-grade` requires `.grades/<id>-arch.md` containing
  `Gate verdict: PASS` (GPT-5.5 grades before coding).
- Editable without frozen-path conflict: `packages/config/**` (config is **not** frozen),
  `apps/api/src/server.ts`, `apps/worker/src/server.ts`, app `package.json`s (the frozen
  `package.json` glob matches only the **root** file — verified against
  `scripts/lib/glob-match.ts`), and any new build config / `railway.json`. Still frozen and
  off-limits: `packages/contracts/**`, `packages/db/schema/**`, `packages/core/commerce/**`,
  `apps/api/**/commerce/**`, the `scripts/gate-*.ts` / grade / review scripts.

## 6. Done-when (acceptance signals to bake into the spec)

- `node` runs the **built/bundled** artifact for `apps/api` and `apps/worker` with only env
  vars set — no `tsx`, no source resolution.
- Both services bind `env.PORT`; `/health` reports a real `APP_VERSION`.
- A CI job builds + boots the compiled artifact and asserts `/health` (the F1 regression guard).
- The §3 interim Railway settings (tsx start, `API_BASE_URL:8080` port hack) are removed.
