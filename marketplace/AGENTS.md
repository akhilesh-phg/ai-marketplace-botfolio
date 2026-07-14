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
