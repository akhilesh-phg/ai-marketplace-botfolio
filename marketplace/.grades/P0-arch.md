# P0 Architecture Grade

Source: `docs/09-p0-scaffold-spec.md` section 9  
Spec version: v2, granular  
Gate: all six criteria must score >= 7  
Result: PASS

## Scores

1. Correctness: 9/10
2. Simplicity: 7/10
3. Scalability seams: 9/10
4. Governance integrity: 8/10
5. Testability: 8/10
6. Composer-executability: 8/10

Minimum score: 7/10  
Gate verdict: PASS. Architecture is approved for human go/no-go before switching to Composer.

## Criterion Notes

### 1. Correctness — 9/10

The revised spec now describes a bootable, testable monorepo rooted in the actual cloned repository, `project-trillion/`. It defines the tree, package conventions, root scripts, strict TypeScript settings, test harness, coverage tooling, health routes, OpenAPI generation, SDK strategy, Supabase Auth example, Inngest worker, observability hooks, and CI gate layout.

The slice order is coherent: toolchain first, shared/config foundations, DB, contracts, API, web, worker, core stubs, SDK, auth, observability, then governance. The acceptance criteria are mostly executable rather than aspirational. Remaining correctness risk is mainly operational: P0 still depends on several latest-stable package CLIs behaving as expected, so any version-level conflict must route through `DECISION-NEEDED` as specified.

### 2. Simplicity — 7/10

P0 remains intentionally heavy for a scaffold, but the heaviness is now better justified. The revision avoids domain features and defers Datadog runtime tracing to v1, keeping P0 to skeleton, health, auth example, observability proof, and governance.

The simplicity score is still capped at 7 because P0 includes Next, Hono, Supabase, Drizzle, Inngest, Sentry, Playwright, coverage, SDK generation, CI, and model-governance scripts before any product feature ships. That is a lot of bootstrap surface. It passes because the project goal is specifically to make lower-model implementation safe, and those guardrails are part of the product architecture rather than incidental complexity.

### 3. Scalability Seams — 9/10

The major seams are present and explicit: stateless web/API/worker apps, module boundaries under `packages/core`, Zod contracts as the source of truth, OpenAPI-generated SDK types, Drizzle schema isolation, `PaymentRail` before any Stripe implementation, and Inngest as the durable event seam.

The revision closes the earlier event gap by adding `EventEnvelope`, `idempotencyKey`, and duplicate-key testing in the worker slice. This is enough for P0. The only reason this is not a 10 is that real idempotency storage and production workflow replay semantics are deferred, which is appropriate for a scaffold.

### 4. Governance Integrity — 8/10

The governance model is now materially enforceable. The spec defines frozen paths, branch prefixes, `Model:` trailers, `Spec:` trailers, registry validation, model identity precedence, base-branch diff calculation, deterministic gate script CLI contracts, fixture tests, and CI jobs for frozen-path and no-new-decision gates.

The prior holes are closed:

- Composer identity no longer depends on vague authorship; it is derived from `MODEL`, commit trailer, or branch prefix.
- `Spec:` has an exact format and must resolve against `specs/registry.json`.
- Opus-approved dependency and contract changes have a concrete path: `opus/` branch plus valid `Spec:` trailer.
- Gate scripts have expected exit codes, stdout/stderr behavior, and fixture cases.

Residual risk: P0 remains a bootstrap exception, so the full enforcement loop only becomes automatic after P0-12. Also, `gate-grade` and `gate-review` are described at the CI level but their exact script bodies are less detailed than the two core decision gates. That is acceptable for P0 but should be tightened before P1.

### 5. Testability — 8/10

The revision makes testability real. `pnpm test:coverage` is now a root script, Vitest coverage uses the v8 provider, thresholds are explicit, the placeholder unit and E2E harness exist from P0-01, the live health heartbeat is wired in P0-05, and the exit bar includes proving the coverage gate fails on an intentionally untested branch.

The governance machinery also now has fixtures and snapshot expectations for gate scripts, mocked model clients for grading/review scripts, and a deliberate frozen-path probe PR. Observability testing avoids relying on external Sentry delivery by mocking capture calls.

This is strong enough to pass. It is not a 10 because some proofs still depend on manual/CI procedure rather than fully scripted local commands, especially the throwaway coverage failure and frozen-path probe PR.

### 6. Composer-Executability — 8/10

The revised spec is now implementable by a lower model with low ambiguity. Previously vague slices now pin:

- ESLint, Prettier, Turborepo, TypeScript, Vitest, and Playwright setup.
- Hono route names, middleware order, error envelope, and `app` export.
- shadcn style, base color, aliases, and component list.
- SDK generator and client library.
- Supabase Auth session strategy, protected routes, and tests.
- Sentry/Datadog P0 scope and non-network observability proof.
- Governance script CLI contracts, fixtures, trailers, identity detection, and CI jobs.

Remaining hidden-decision warnings:

- `P0-07` says `serve.ts` may use "Hono or Next route" for the Inngest serve handler. That is a real fork and should ideally be pinned before Composer starts, though it is isolated to the worker slice and unlikely to compromise the architecture.
- Some package-level `tsconfig.json` project references and per-package `package.json` details are convention-based rather than enumerated file by file. The conventions are probably enough, but Composer may still need to infer a little.
- Latest-stable dependency behavior can still surface tool-specific choices; the spec correctly routes version conflicts to `DECISION-NEEDED`.

These are warnings, not blockers. The handoff is now sufficiently constrained for P0.

## Required Revisions Before Composer

No blocking revisions required.

Recommended non-blocking cleanup before or during P0 planning:

1. Pin `P0-07` to one Inngest serve strategy instead of "Hono or Next route".
2. Add a short example of one package-level `package.json` and `tsconfig.json` so Composer can copy it exactly across packages.
3. Define the CI `gate-grade` and `gate-review` file-parsing rules with the same precision as `gate:frozen-paths` and `gate:no-new-decisions`.

## Final Verdict

The revised P0 scaffold spec passes the six-criterion architecture gate. It is still an ambitious scaffold, but the ambition is now encoded as executable contracts, tests, fixtures, and governance checks rather than left as model judgment.

Recommendation: human may approve the gate and switch to Composer 2.5 for P0 execution in `project-trillion/`, with the non-blocking cleanup items tracked as follow-up polish.
