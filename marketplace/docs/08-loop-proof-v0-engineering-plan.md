# Loop-Proof v0 — Engineering Plan (AI-Delegated Build)

> Deliverable for the architecture planning pass. Companion to `01`–`07`.
> Operating model assumed throughout: **Composer 2.5 writes all code, a human only makes decisions, customer discovery runs in parallel.**
> Scope decision (locked): **Loop-Proof v0** — off-chain only, Stripe-only payments, no smart contracts / ERC-8004 / x402 / ZK. All crypto rails deferred until a human security/crypto expert is in the loop.

---

## 0. Why this doc exists (and what changed from `02`)

`02-mvp-blueprint.md` is a good plan for a **funded 13-person team**. It bakes in x402, ERC-8004, AP2 signing, Temporal, and Kafka. Under the real operating model (one human + a lower-capability coding model + ongoing discovery), that plan inverts the risk: it spends the first quarter on the surfaces most dangerous for an AI to write unsupervised, before anyone has proven two parties want to transact.

This doc re-cuts the MVP into the smallest build that proves the **marketplace loop**:

```
discover  ->  call  ->  pay  ->  receipt  ->  reputation  ->  dispute  ->  settle
```

with **zero blockchain**. Every box above can be proven off-chain. Crypto rails become a *v1* upgrade, gated on demand and on an expert hire.

The single most important reframe: **the loop is the product, not the rails.** If buyers and sellers don't transact when it's a Stripe call, they won't transact when it's an x402 call either. Prove the loop cheap.

---

## 1. Feasibility check and workarounds (to-do #1)

### 1.1 Verdict

Technically feasible — every component exists in the wild, nothing needs inventing. The real risk is not "can it be built," it is **"can this operator build this scope this way."** Three binding constraints, and the workaround for each:

| # | Constraint | Why it bites | Workaround (baked into v0) |
|---|-----------|--------------|----------------------------|
| 1 | **Operating-model mismatch.** Composer 2.5 is fast and cheap but lower-capability. | Great at CRUD/UI/API glue. Dangerous on Solidity escrow, KMS, signing flows, ZK — where one bug = irreversible fund loss or a trust-killing exploit, reviewed by a non-coder. | **Delete the dangerous surface entirely.** No contracts, no key custody, no on-chain settlement in v0. Stripe owns the money movement (PCI, fraud, payouts, refunds). The AI never writes code that can lose funds. |
| 2 | **Cold-start before demand.** Discovery isn't done. | Building trust/dispute/eval/crypto infra before proving transactions happen is boil-the-ocean. | v0 is a vertical slice that *generates demand signal*. Instrument the loop so discovery and build inform each other weekly. |
| 3 | **Capital model.** Docs assume $5-8M seed, 6 squads. | Solo + AI is a different universe; parallel swimlanes assume parallel humans. | Sequence the work as one dependency chain an AI can walk, with grading gates instead of squad reviews. |

### 1.2 Bonus: the workaround also dodges the slowest landmines

Going off-chain in v0 removes, not just defers, the worst regulatory drag:

- **No crypto custody** -> no money-transmitter analysis for the wallet path.
- **No on-chain settlement** -> Stripe is the regulated entity of record.
- **Dev-tool vertical (per `04`)** -> no PHI, no PII at scale, no financial regulator, no HIPAA/SOC2 needed to launch.

EU AI Act and KYC/AML still need a lawyer eventually, but none of it blocks v0.

### 1.3 The two feasibility caveats that remain

1. **AI-built code accrues invisible debt.** A lower model produces code that *works on the happy path* and quietly skips edge cases. The grading loop (§7) and the contract-first method (§6) exist specifically to convert that risk into a managed process.
2. **AI does not compress the non-coding work.** Stripe Connect verification, ToS/legal, seller onboarding, integration debugging, and your own decision latency are not faster because Composer is fast. The timeline (§9) accounts for this honestly.

---

## 2. v0 product scope — the loop, in and out (to-do #2)

### 2.1 The exit bar (what must work)

A buyer agent, built by someone outside the team using only the SDK + docs, must:

1. **Discover** a verified seller agent by capability (search).
2. **Resolve** its AgentCard and **call** it over a signed HTTP request (A2A/MCP-lite).
3. **Pay** for the call via **Stripe** (funds held in escrow).
4. **Receive a signed receipt** that updates the seller's **reputation** score.
5. **File a dispute**; an **admin arbiter** resolves it and Stripe **releases or claws back** escrow.

If a third party can do that loop unattended, v0 succeeded.

### 2.2 In scope vs out of scope

| Layer | In v0 | Out (deferred) |
|-------|-------|----------------|
| **Identity** | `did:web` AgentCards, platform-issued agent API keys, manual seller KYC (a form + human review) | ERC-8004, on-chain agentId, DID:pkh wallets, ZK claims |
| **Discovery** | Capability schema, hybrid search (Postgres full-text + pgvector), AgentCard resolver, read SDK | OpenSearch, federated directories, AGNTCY |
| **Interaction** | TS SDK: resolve + sign + call; signed-header auth (`x-agent-trust`-style, platform key, **not** a wallet) | Go/Rust SDKs, APS delegation chains, mTLS |
| **Commerce** | Stripe Connect: per-call charge, escrow hold, payout on success, refund/clawback on dispute, idempotency, webhooks | x402, AP2 mandates, smart-contract escrow, multi-rail |
| **Reputation** | Signed receipts -> public, versioned score, provenance UI | On-chain reputation registry, attestation VCs |
| **Quality** | Eval-lite: run one benchmark suite against an agent, publish a signed result (optional, can slip to v0.1) | Temporal orchestration, red-team harness, proprietary domain evals |
| **Experience** | Next.js dashboard (browse, profile, billing, receipts, publisher view) + docs portal | Mobile, advanced merchandising, leaderboards |
| **Ops** | Admin dispute console + evidence locker (object storage) | Automated arbitration, insurance/staking |

### 2.3 Scalability baked in from day one (your explicit requirement)

v0 is a **modular monolith**, not microservices, but the boundaries are drawn so any module can be extracted into a service later without a rewrite:

- **Stateless app** behind a load balancer -> horizontal scale is a config change.
- **Managed serverless Postgres** (read replicas when needed) -> no DB ops.
- **Event-driven core** via a durable job runner (same decoupling Kafka gives you, fully managed) -> receipts, reputation recompute, eval runs, and dispute timers are all events, not inline calls.
- **Idempotency keys** on every payment/receipt write -> safe retries, exactly-once settlement semantics.
- **End-to-end typed contracts** (DB schema -> API -> SDK) -> the system is machine-checkable, which is the single biggest lever for reliable AI codegen.
- **Edge-cached directory reads** -> the read-heavy path scales independently of writes.

The rule: **boring, managed, typed, stateless.** That combination is what lets a lower model build something that survives load.

---

## 3. v0 architecture

### 3.1 System diagram

```
                          +------------------------------------------+
   Humans / Devs          |              EXPERIENCE                  |
  (browser, CLI)  ------>  |  Next.js Dashboard   +   Docs Portal    |
                          +---------------------+--------------------+
                                                |
   Buyer / Seller agents                        |  (typed HTTP, OpenAPI)
   (via TS SDK)  ------------------------------> |
                                                v
   +---------------------------------- API SERVICE (modular monolith) -------------------------+
   |                                                                                           |
   |  [registry]      [discovery]      [commerce]      [reputation]     [disputes]   [eval*]   |
   |   AgentCards      search/resolve   Stripe escrow   receipts+score   arbiter      bench*   |
   |       \              |                 |               |               |           |       |
   |        \             |                 |               |               |           |       |
   +---------\------------|-----------------|---------------|---------------|-----------|-------+
              \           |                 |               |               |           |
               v          v                 v               v               v           v
        +-------------------------------------------------------------------------------------+
        |  Postgres (+pgvector)   |  Object storage (R2/S3)  |  Durable jobs (Inngest)        |
        |  agents, capabilities,  |  evidence locker,        |  receipt->reputation recompute |
        |  receipts, reputation,  |  eval traces             |  dispute SLA timers, eval runs |
        |  disputes, users        |                          |  webhook fan-out               |
        +-------------------------------------------------------------------------------------+
                          |                                        |
                          v                                        v
                 +-----------------+                      +-----------------------+
                 |  Stripe Connect |                      |  Auth + Email + Obs   |
                 |  (escrow/payout)|                      |  (managed providers)  |
                 +-----------------+                      +-----------------------+

   * eval module is optional in v0; can ship in v0.1 without blocking the loop.
   NO blockchain. NO smart contracts. NO key custody.
```

### 3.2 The loop as a data-flow (the heartbeat to test)

```
1. Buyer SDK  -> GET /agents?capability=code-review        (discovery)
2. Buyer SDK  -> resolve AgentCard (did:web)               (registry)
3. Buyer SDK  -> POST /calls  {agentId, payload, payment}  (commerce: create PaymentIntent, hold escrow)
4. API        -> forwards signed request to seller endpoint (interaction)
5. Seller     -> returns result                            (interaction)
6. API        -> on success: capture charge, hold in escrow, emit ReceiptCreated event
7. job runner -> sign receipt, write receipt, recompute reputation   (reputation)
8. (happy)    -> after hold window: release escrow -> seller payout   (commerce)
   (dispute)  -> buyer POST /disputes -> admin resolves -> release OR refund/clawback
9. profile    -> reputation score updates with clickable receipt provenance
```

Every numbered step is a tested codepath in §8.

### 3.3 Why a monolith, not the `02` microservice split

`02` lists 6 backend services. For a solo + AI build that is premature decomposition: 6 deploy targets, 6 CI configs, 6 sets of inter-service auth, distributed-tracing overhead — all accidental complexity (Brooks). One typed app with clean module boundaries gives you 90% of the future flexibility at 10% of the operational cost. Extract a service the day a module actually needs independent scaling, not before.

---

## 4. Tech stack (to-do #6, part 1) — chosen for AI-friendliness + scale

Selection criteria, in order: **(1)** dense training data so Composer 2.5 makes fewer mistakes, **(2)** type-safety end to end, **(3)** managed/serverless so there's no infra to operate, **(4)** a clean upgrade path to the `07` stack later.

| Concern | v0 choice | Why | Later upgrade path |
|---------|-----------|-----|--------------------|
| Repo | **Turborepo monorepo (TypeScript)** | One language, one toolchain, shared types across app + SDK. Best case for AI codegen consistency. | Same repo grows; extract services as packages -> apps. |
| Web | **Next.js 15 (App Router) + Tailwind + shadcn/ui** | Matches `07`; huge training corpus; great AI output quality. | Unchanged. |
| API | **Hono (TS) service, OpenAPI + Zod** | Portable (Node now, edge later), tiny, type-safe, generates the SDK contract. | Add gRPC internally if needed; matches `07` REST/GraphQL intent. |
| ORM/DB | **Drizzle ORM + Postgres (serverless) + pgvector** | SQL-first, edge-safe, type-safe, scales on serverless. (Tradeoff: Prisma has more AI training data but a heavier serverless story — see Decision D-C.) | Same Postgres; add read replicas, then ClickHouse for analytics per `07`. |
| Jobs/workflows | **Inngest** | Durable functions without running infra. Replaces Temporal + Kafka for v0 with one managed dependency. TS-native, AI-friendly. | Swap to Temporal/Kafka at the `07` scale if volume demands. |
| Auth | **Supabase Auth** (bundled with DB) or **Clerk** | Minimize vendor count for a solo operator; managed, drop-in. | OIDC (Ory) + SIWE per `07` when enterprise lands. |
| Payments | **Stripe + Stripe Connect** | The entire money flow (escrow hold, payout, refund, clawback, PCI) without writing financial code. | Add x402/AP2 as a *parallel* rail in v1, behind a `PaymentRail` interface. |
| Object storage | **Cloudflare R2** (S3 API) | Cheap, S3-compatible, evidence locker + eval traces. | Add Object Lock + Merkle anchoring at v1. |
| Search | **Postgres full-text + pgvector hybrid** | No separate search cluster; good enough to ~100k agents. | OpenSearch per `07` when relevance tuning demands it. |
| Observability | **Sentry (errors) + Datadog (metrics/traces)** | Datadog MCP is already enabled in this workspace. | Unchanged; add Langfuse/Helicone for eval telemetry at v1. |
| Email | **Resend** | Transactional email for receipts/disputes/onboarding. | Unchanged. |
| Hosting | **Vercel (web) + Railway or Render (API + worker)** | Managed, zero-ops, scales horizontally. | K8s/EKS per `07` only if you outgrow PaaS. |

**`PaymentRail` interface is the keystone decision.** Define `PaymentRail` (createHold, capture, release, refund) in v0 with a single `StripeRail` implementation. When the crypto expert arrives, `X402Rail` slots in behind the same interface with zero changes to commerce/reputation/dispute code. This is the one piece of forward-design worth paying for now.

---

## 5. Repo layout (the scaffold Composer builds into)

```
project-trillion/                # Turborepo monorepo = cloned repo root (github.com/akhilesh-phg/project-trillion, branch main)
  apps/
    web/                         # Next.js dashboard + docs portal
    api/                         # Hono API service (the modular monolith)
    worker/                      # Inngest functions (or co-located in api/)
  packages/
    core/                        # domain logic, pure + tested (registry, commerce, reputation, disputes)
    db/                          # Drizzle schema + migrations + typed queries
    sdk/                         # public TS SDK (resolve, sign, call, pay)
    contracts/                   # Zod schemas + OpenAPI spec (the source of truth)
    shared/                      # types, errors, result helpers
    config/                      # tsconfig, eslint, tailwind presets
  reference-agents/
    seller-codereview/           # a real seller agent for E2E tests + demos
    buyer-orchestrator/          # a real buyer agent for E2E tests + demos
  e2e/                           # golden-path Playwright/Vitest loop test
  AGENTS.md                      # conventions the AI MUST follow (see §6.3)
```

`packages/core` is pure domain logic with no I/O, which makes it trivially testable and the safest place to demand high coverage from the AI.

---

## 6. Delegating all coding to Composer 2.5 (to-do #3) — the method

This is the crux. A lower-capability model succeeds when the *environment* does the thinking the model can't. The method has six pillars.

### 6.0 Finalized roles (hard rule, non-negotiable)

```
HUMAN        owns intent, scope, go/no-go. Receives escalations. Reads no code.
OPUS 4.8     owns ALL architecture + EVERY architectural decision. Writes contracts,
             specs, failing tests. Resolves every DECISION-NEEDED. Reviews every PR.
COMPOSER 2.5 writes code bodies + tests ONLY, against existing contracts.
             NEVER decides. On any decision, STOPS and hands up to Opus.
GPT 5.5      grades Opus's architecture; meta-audits Opus's code reviews.
```

The rest of §6 and §7 exist to make "Composer never decides" true in practice, not just in intent. You cannot trust a lower model's self-assessment of what is a decision, so the enforcement is structural + CI, not the model's judgment.

### 6.1 Contract-first, not prompt-first

The failure mode of AI coding is ambiguity. Kill it by writing the contract before the code:

```
Opus 4.8 (architect)            Composer 2.5 (implementer)
  writes:                          fills in:
  - Zod schemas + OpenAPI    --->  - route handlers against fixed types
  - DB schema (Drizzle)      --->  - queries against fixed schema
  - function signatures       --->  - function bodies
  - acceptance tests (failing) -->  - code until tests pass
```

Composer never decides shape. It fills bodies between fixed types and failing tests. The compiler and the test suite are its guardrails. A type error or a red test is unambiguous feedback a fast model can iterate on cheaply.

### 6.2 Vertical slices, tightly sized

Work units are thin end-to-end slices, never horizontal layers. Each slice:

- is **one user-visible capability** (e.g. "POST /agents registers an AgentCard"),
- ships with its **tests in the same PR**,
- is **< ~300 lines of diff** (Composer degrades on large diffs),
- **copies an existing pattern** in the repo (the scaffold seeds the patterns).

### 6.3 Hard guardrails (`AGENTS.md` + CI)

The repo enforces what the model can't be trusted to remember:

- `AGENTS.md`: naming, error handling (`Result` type, no silent catches), idempotency rules, the `PaymentRail` interface, "never write money-moving logic outside `commerce/`", "all external input through Zod."
- CI gates **every** PR: typecheck, lint, test, coverage threshold (start 80% on `core/`), `pnpm build`, and a **forbidden-pattern check** (no `any`, no raw SQL string interpolation, no secrets in code, no `process.env` outside `config/`).
- **No PR merges with a red gate. Ever.** This is the non-negotiable that keeps AI debt from compounding.

### 6.4 The human's actual job

You (the decision-maker) do four things, and only these four:

1. **Approve specs** before Composer codes (the architecture gate, §7).
2. **Resolve decisions** Composer/Opus surface (the `AskUserQuestion`-style choices).
3. **Approve milestone gates** (does the slice meet the exit bar?).
4. **Run discovery** and feed real-user signal back into scope.

You do not read every line. The grading loop reads the lines for you.

### 6.5 The decision boundary (what Composer may never touch)

A "decision" is anything that defines *shape*. Composer only fills *behavior* into shapes Opus already defined.

| Composer-allowed (behavior) | Opus-only (decisions / shape) |
|-----------------------------|-------------------------------|
| Fill a function body to a fixed signature | Define/change any public signature or interface |
| Write tests to given acceptance criteria | Decide what the acceptance criteria are |
| Build a UI component to a given spec | Choose component contracts, data shape, or routes |
| Wire within an established repo pattern | Introduce a new pattern, module, or boundary |
| Use an already-approved dependency | Add or upgrade any dependency |
| Write a Drizzle query against the schema | Change the DB schema / migrations |
| Implement against the `PaymentRail` interface | Anything inside `commerce/` money logic |
| Read types from `contracts/` | Edit anything in `contracts/` |

**Frozen paths** (Composer is CI-blocked from editing these — they encode decisions):

```
packages/contracts/**        # Zod + OpenAPI = the type/API contract
packages/db/schema/**        # data model + migrations
packages/core/commerce/**    # money logic
apps/api/**/commerce/**      # money endpoints
package.json, pnpm-lock.yaml # dependencies
AGENTS.md, STATE.md, GATES.md# governance
```

If a Composer task *requires* changing a frozen path, that is the signal that the task contained a hidden decision. It routes to Opus (§6.6), it does not get "figured out" by Composer.

### 6.6 Escalation — how Composer passes decisions to Opus (5 enforcement layers)

Defense in depth. Don't trust the model; trust the machine.

1. **Structural impossibility.** A Composer task is only dispatched when its contract is complete: fixed types/signatures in `contracts/`, failing tests, explicit file list, and a "do not modify" list. With no missing shape, there is no decision to make. *(This is the primary control. The next four are nets.)*
2. **Frozen-paths gate (CI, blocking).** `gate:frozen-paths` fails any Composer-authored PR that edits a frozen path, with the message: `ESCALATE TO OPUS — this change defines shape.`
3. **New-symbol detector (CI, blocking).** `gate:no-new-decisions` scans the diff for a new exported type, new public signature, new dependency, new table, or new env var. Any hit → PR labeled `contains-decision` → merge blocked → routed to Opus.
4. **DECISION-NEEDED protocol (model instruction).** Composer's system prompt forbids guessing. When blocked, it must emit this exact block and halt:

```
DECISION-NEEDED
  task:              <slice id>
  blocked-by:        dependency | contract-change | ambiguous-test | multiple-approaches | frozen-path
  context:           <what I was implementing>
  the-fork:          <the specific choice I cannot make>
  options-i-see:     A) ...  B) ...      (observed, NOT chosen)
  why-i-cant-decide: <which rule in §6.5 this hits>
  STOP: handing to Opus. No code written for this fork.
```

5. **Compiler/test tripwire.** If Composer invents a shape to avoid escalating, it breaks the frozen contract → red typecheck/test → caught at CI. The contract is the trap.

Layer 1 prevents ~most decisions. Layers 2-3 catch the rest mechanically. Layers 4-5 catch the long tail. No single layer is trusted alone.

---

## 7. Model-grading checkpoints (to-do #5)

The point: no single model is trusted to grade its own work. Higher-capability models grade lower ones, and a different vendor periodically meta-grades the grader.

### 7.1 The grading stack

```
  TIER 0  Human            sets intent, scope, decisions, milestone go/no-go
            |
            v
  TIER 1  Opus 4.8         produces architecture, specs, contracts, failing tests
            |  graded by
            v
          GPT 5.5          adversarial architecture review (different vendor = real independence)
            |              scores against rubric -> human approves or sends back
            v
  TIER 2  Composer 2.5     implements code against fixed contracts + tests
            |  graded by
            v
          Opus 4.8         per-PR code review: correctness, security smell,
            |              contract adherence, test quality, edge-case coverage
            v
  TIER 3  Automated QA     CI gates + E2E golden-path + a higher model runs the
            |              live app as a user (functional QA)
            v
  META    GPT 5.5          weekly: spot-audits a sample of Opus's code reviews
                           (catches the grader drifting / rubber-stamping)
```

### 7.2 Rubrics and pass thresholds

**Architecture grade (GPT 5.5 on Opus 4.8 specs)** — score 1-10 each, gate = all >= 7:

- Correctness: does the design actually close the loop?
- Simplicity: is anything overbuilt vs the v0 exit bar?
- Scalability: stateless? idempotent? event-driven where it counts?
- Security posture: trust boundaries explicit? no money logic an AI could break?
- Testability: are the failing tests real and complete?
- Contract clarity: could Composer implement with zero ambiguity?

**Code grade (Opus 4.8 on Composer 2.5 PRs)** — gate = no P0/P1 findings, coverage met:

- P0: security/data-loss/money-movement bug, or a contract violation. Blocks merge.
- P1: missing edge case with a real failure mode, or weak/fake tests. Blocks merge.
- P2: style/readability. Logged, non-blocking.

**On fail:** kick back to the implementer with the specific finding. If two kickbacks don't fix it, escalate the *task* to Opus 4.8 to implement directly. If the architecture itself is wrong, escalate to the human.

### 7.3 Cadence and gates

| Checkpoint | Frequency | Grader -> Gate |
|------------|-----------|----------------|
| Spec review | per slice, before coding | GPT 5.5 -> human approves |
| PR review | every PR | Opus 4.8 -> CI + Opus must pass |
| Milestone gate | per phase (§9) | Human, with E2E green |
| Meta-audit | weekly | GPT 5.5 samples Opus reviews |
| Architecture re-grade | every 2-3 weeks | GPT 5.5 re-checks the whole design as it grows |

This is also your **test discipline** under the skill's "systems over heroes" principle: the gates work at 3am with a tired operator, because the machine enforces them.

### 7.4 Gate state machine + human notifications — how the agent says "grade now" or "switch to Opus"

The whole governance system fails if it relies on a model *choosing* to mention that a gate is due. So the trigger is mechanical: a `STATE.md` file the agent must read at every session start, plus CI gates that physically block merges until the right model has acted.

**Model-routing flow (every work item walks this):**

```
                         +----------------------+
   New work item  -----> |  Contract exists?    |
                         |  (types + failing    |
                         |   tests + file list  |
                         |   in contracts/)     |
                         +----+------------+----+
                         no  |             | yes
                             v             v
                   +-----------------+   +--------------------------+
                   | OPUS writes      |  | COMPOSER implements      |
                   | contract + tests |  | bodies against contract  |
                   +--------+--------+   +------------+-------------+
                            |                         |
                            v                         v
                   +-----------------+   +--------------------------+
                   | GPT 5.5 GRADES  |   | CI GATES: typecheck,     |
                   | architecture    |   | test, coverage, E2E,     |
                   | (gate >= 7)     |   | frozen-paths, new-symbol |
                   +--------+--------+   +-----+----------------+---+
                            |              pass|         fail |  decision-smell
                       human approve          |              v
                            |                 |     +--------------------+
                            |                 v     | DECISION-NEEDED     |
                            |        +----------+   | -> route to OPUS    |
                            |        | OPUS     |   +--------------------+
                            |        | reviews  |
                            |        | PR (P0/P1|
                            |        | block)   |
                            |        +----+-----+
                            +----> MERGE <-+
```

**`STATE.md` (machine-updated, human-readable, read at every session start):**

```
# STATE.md   (do not hand-edit; agents update; humans read)
phase:              P3 - commerce
slice:              COM-04 capture-charge-idempotent
status:             CODING        # SPEC | GRADING | CODING | REVIEW | BLOCKED | DONE
owner-model:        composer      # opus | composer | gpt | human
next-gate:          opus-pr-review
HUMAN-ACTION-REQUIRED: false
last-arch-grade:    .grades/COM-04-arch.md   (GPT 5.5: 8.3/10, 2026-06-06)
open-escalations:   []            # filled with DECISION-NEEDED blocks
```

**The notification — three redundant channels so it cannot be missed:**

1. **Blocking CI status** — the mechanical guarantee. A PR cannot merge until the required gate artifact exists and passes. This does not depend on any model remembering.
2. **`STATE.md` flag** — `HUMAN-ACTION-REQUIRED: true` plus `next-gate` names exactly who must act.
3. **Agent session banner** — every Composer/Opus session opens by reading `STATE.md` and, if action is due, printing one of:
   - `>>> HUMAN ACTION REQUIRED: SWITCH TO OPUS — DECISION-NEEDED on COM-04 <<<`
   - `>>> HUMAN ACTION REQUIRED: RUN ARCHITECTURE GRADE (GPT 5.5) on SPEC COM-05 before any coding <<<`
   - `>>> HUMAN ACTION REQUIRED: MILESTONE GATE P3 — review E2E + approve <<<`

**CI-required checks (the gates that make grading non-skippable):**

| Check | Applies to | Fails unless |
|-------|-----------|--------------|
| `gate:frozen-paths` | Composer PRs | no frozen path touched |
| `gate:no-new-decisions` | all PRs | no new symbol/dep/table/env without an Opus spec ref |
| `gate:has-arch-grade` | spec/contract PRs | `.grades/<slice>-arch.md` exists, score >= 7 (GPT 5.5) |
| `gate:has-review` | code PRs | `.reviews/<slice>.md` exists, no P0/P1 (Opus 4.8) |
| `gate:tests` / `gate:coverage` / `gate:e2e` | all PRs | tests green, coverage met, golden-path E2E green |

**Trigger → who acts → how the human learns:**

| Trigger | Routes to | Human notified via |
|---------|-----------|--------------------|
| New slice has no contract | OPUS (write contract) | STATE `SPEC` + banner |
| Opus spec written | GPT 5.5 (grade) then human | `gate:has-arch-grade` block + banner |
| Composer emits DECISION-NEEDED | OPUS | STATE `BLOCKED` + open-escalations + banner |
| Composer PR hits frozen path / new symbol | OPUS | `gate:frozen-paths` / `gate:no-new-decisions` block |
| Composer fails same task twice | OPUS (implements directly) | banner + escalation log |
| Composer PR ready | OPUS (review) | `gate:has-review` block |
| Phase boundary | HUMAN (milestone gate) | STATE `next-gate` + banner |
| Weekly | GPT 5.5 (meta-audit Opus reviews) | scheduled job + report artifact |

**Concrete grading commands (run by you, or wired into CI with API keys):**

```
pnpm grade:arch <slice>     # calls GPT 5.5, writes .grades/<slice>-arch.md, sets STATE
pnpm review:code <pr>       # calls Opus 4.8, writes .reviews/<pr>.md, sets STATE
pnpm audit:reviews          # weekly GPT 5.5 meta-audit of a sample of .reviews/*
```

Grades and reviews are committed as artifacts (`.grades/`, `.reviews/`), so "are we actually grading?" has an auditable answer: the artifact either exists and passed, or the merge is blocked. There is no path to production that skips a model gate.

---

## 8. Test strategy + coverage map (the heartbeat)

There's no code yet, so this is the coverage **the plan requires Composer to deliver**, branch by branch. The skill's iron rule: this map is mandatory, and any regression-class gap is a critical, non-optional test.

```
CODE PATHS                                          USER / AGENT FLOWS
[+] core/registry                                   [+] Discover -> call -> pay -> receipt
  register()        [REQUIRED] valid + dup + bad-card    [REQUIRED ->E2E] full happy loop, unattended
  resolveCard()     [REQUIRED] found + 404 + stale
[+] core/discovery                                  [+] Dispute -> refund
  search()          [REQUIRED] match + empty + rank      [REQUIRED ->E2E] file -> admin resolve -> Stripe refund
[+] core/commerce  (highest risk module)            [+] Payment failure UX
  createHold()      [REQUIRED] success + card-decline     [REQUIRED] decline -> clear error, no orphan receipt
  capture()         [REQUIRED] success + idempotent-retry [REQUIRED] double-submit -> exactly-once settle
  release()         [REQUIRED] after window + early-block [REQUIRED] slow seller -> timeout -> auto-refund
  refund()/clawback [REQUIRED] full + partial + clawback
  webhook handler   [REQUIRED] valid sig + replay + bad sig
[+] core/reputation                                 [+] Reputation provenance
  onReceipt()       [REQUIRED] recompute + ordering       [REQUIRED] score links to underlying receipts
  score()           [REQUIRED] formula v1 + zero-history
[+] core/disputes                                   [+] Empty / boundary states
  file()/resolve()  [REQUIRED] open + resolve + SLA-timer  [REQUIRED] zero agents, zero receipts, huge result
[+] sdk                                             [+] Third-party integration
  sign()/call()/pay [REQUIRED ->E2E] reference agent loop  [REQUIRED] external dev completes loop from docs only

TARGET: core/ >= 80% line + 100% of money/receipt branches.  E2E golden-path green is the merge-blocking heartbeat.
[->E2E] = integration test, not unit.   No [->EVAL] in v0 (eval module is optional).
```

Three rules that matter most:

1. **The money path (`core/commerce`) gets 100% branch coverage and idempotency tests.** This is the one place a bug costs real money even with Stripe doing the heavy lifting (double-charge, orphaned escrow, missed refund).
2. **The E2E golden-path loop is the heartbeat.** It runs in CI on every PR. If it goes red, nothing merges. It is the single best defense against an AI silently breaking integration.
3. **Webhook signature + replay tests are mandatory** — the most common Stripe-integration security hole.

---

## 9. Timelines (to-do #4)

### 9.1 The honest model of "AI-fast"

Composer compresses **coding**. It does not compress **decisions, integration debugging, external-provider setup, or discovery.** So the timeline is gated by the human's review/decision throughput and by a few stubbornly sequential dependencies (Stripe Connect verification, ToS, seller onboarding), not by typing speed.

Assumption: one focused human, ~5 days/week, decision latency under a day, grading loop running. If the human is part-time, multiply by ~1.5-2x.

### 9.2 v0 phases

```
WEEK   1    2    3    4    5    6    7    8    9    10
P0  [scaffold ]                                            monorepo, CI, DB, auth, AGENTS.md, deploy, E2E skeleton
P1       [registry+discovery]                              AgentCards, capability schema, hybrid search, read SDK
P2            [SDK + signed calls]                         resolve/sign/call, reference seller+buyer agents
P3                 [commerce: Stripe escrow ]              hold/capture/release/refund, webhooks, idempotency
P4                     [receipts + reputation]             signed receipts, public score, provenance
P5                          [dashboard + docs ]            browse/profile/billing/receipts/publisher view
P6                               [disputes + eval-lite]    admin console, evidence locker, escrow clawback
P7                                    [harden + launch]    E2E green, obs, security pass, onboard first sellers

  Milestone gates (human + E2E): end of P0, P3 (money path), P5 (full loop visible), P7 (launch-ready).
  Critical path: P3 -> P4 -> P6 (money -> receipts -> disputes). Staff your attention there.
```

**Realistic band: 8-10 weeks dedicated, 12-16 weeks part-time.** Add 1-2 weeks of buffer for Stripe Connect verification and a basic ToS/privacy policy (use a template + a lawyer review, do not let the AI write legal).

### 9.3 Roadmap beyond v0 (each phase gated, not scheduled)

Gate on **demand signal + funding + the expert hire**, not on the calendar:

| Phase | Trigger to start | Scope |
|-------|------------------|-------|
| **v0.1** | v0 loop live, first sellers onboarded | Eval-lite suite (SWE-Bench wrapper), polish, relevance tuning |
| **v1 (crypto rails)** | Demand proven AND security/crypto engineer hired | `X402Rail` behind the existing `PaymentRail` interface, Base settlement, `did:pkh` wallets (Privy), signed-VC receipts |
| **v1.5** | x402 stable in prod | ERC-8004 identity anchor, on-chain reputation mirror, Polygon read-indexer |
| **v2** | Multi-hop usage observed | APS delegation chains, SINT policy enforcement, eval depth (red-team sets) |
| **v3** | Enterprise pipeline | Confidential compute (TDX/Nitro), insurance/staking, ACP/TAP adapters, SOC2/HIPAA |

The `02` deferred list maps cleanly onto v1-v3. Nothing is lost; it's resequenced behind proof and expertise.

---

## 10. Required subscriptions / tech-stack costs (to-do #6, part 2)

Monthly USD, early-stage. "Lean" = free/cheap tiers while volume is tiny; "Comfortable" = paid tiers for real reliability. **AI model usage dominates the bill, not infra.**

| Category | Service | Purpose | Lean | Comfortable |
|----------|---------|---------|------|-------------|
| **AI - coding** | Cursor (Composer 2.5) | the implementer | $20 | $60-200 |
| **AI - review** | Anthropic (Opus 4.8) | per-PR code review + architecture | $100 | $300-600 |
| **AI - grading** | OpenAI (GPT 5.5) | architecture grade + meta-audit | $50 | $150-300 |
| Infra - web | Vercel | dashboard + docs hosting | $0-20 | $20+usage |
| Infra - API | Railway or Render | API + worker | $5-20 | $20-50 |
| Infra - DB | Supabase or Neon | Postgres + pgvector (+ auth if Supabase) | $0-25 | $25-100 |
| Infra - jobs | Inngest | durable workflows | $0 | $50-200 |
| Infra - storage | Cloudflare R2 | evidence/eval traces | $0-5 | $5-15 |
| Auth | Clerk (if not Supabase) | user auth | $0-25 | $25 |
| Payments | Stripe + Connect | money flow | $0 + 2.9%+30c | usage |
| Errors | Sentry | error tracking | $0-26 | $26-80 |
| Metrics | Datadog | metrics/traces (MCP enabled) | $0-15 | $15-100 |
| Email | Resend | transactional email | $0-20 | $20 |
| Domain | registrar | domain | ~$1.50 | ~$1.50 |
| Repo/CI | GitHub | code + Actions | $0-4 | $4-20 |
| KYC | Persona/Onfido | **deferred** (manual at v0) | $0 | $0 |
| **TOTAL** | | | **~$350-550/mo** | **~$900-1,800/mo** |

Notes:
- The AI line items are usage-based; heavy review/grading days spike them. Budget for the *comfortable* AI numbers because the grading loop is what keeps quality up.
- Stripe charges per-transaction, not subscription; it nets against marketplace revenue.
- Vendor consolidation matters for a solo operator: **Supabase (DB+auth+storage+vector) cuts 2-3 vendors**. Weigh that against Clerk's nicer auth UX (Decision D-E).

---

## 11. Risks specific to an AI-built, off-chain v0

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Composer ships happy-path-only code, edge cases silently missing | High | Contract-first failing tests + Opus P1 gate on edge coverage + 100% money-branch rule |
| Grader (Opus) rubber-stamps over time | Medium | GPT 5.5 weekly meta-audit of a review sample |
| Stripe Connect integration bug (double-charge, orphan escrow) | Medium | 100% branch coverage + idempotency keys + webhook replay tests + the money path is the most-reviewed module |
| "It works in dev" integration drift | Medium | E2E golden-path is merge-blocking on every PR |
| Building the loop nobody wants | Medium | Discovery runs in parallel; instrument every loop step; kill criteria (§13) |
| AI invents a non-existent API / hallucinated package | Medium | Lockfile + CI build gate + dense-training-data stack choices |
| Secrets leaked into code by the AI | Low-Med | Forbidden-pattern CI check + `process.env` only in `config/` + secret scanning |
| Legal/ToS written by AI | Low if avoided | Template + human lawyer; AI explicitly forbidden from legal text |

---

## 12. NOT in scope (explicitly deferred) and What already exists

**NOT in scope for v0** (each one-liner is the reason):
- Smart contracts / ERC-8004 / x402 / AP2 / ZK — dangerous for AI-unsupervised coding; no demand proof yet.
- Temporal + Kafka — Inngest covers v0's durability needs with zero ops.
- Go/Rust SDKs — TS only; add when external demand appears.
- OpenSearch / ClickHouse — Postgres covers v0 search + analytics.
- Microservice split — modular monolith until a module needs independent scale.
- Insurance/staking, confidential compute, delegation chains, SINT runtime — all v2+, gated on usage.
- Mobile clients — web-first.
- Automated dispute arbitration — manual admin console at v0.

**What already exists (reuse, don't rebuild):**
- The entire `01`-`07` thinking is the product/strategy substrate; this doc is the *engineering* cut, not a re-derivation.
- Stripe Connect already implements escrow, payouts, refunds, PCI, fraud — do not build any of it.
- Inngest already implements durable retries/workflows — do not build a job runner.
- `did:web` + JSON Schema already give verifiable AgentCards off-chain — do not touch a chain.
- Supabase/Clerk already implement auth — do not roll your own.
- Public eval suites (SWE-Bench/HumanEval) already exist — wrap, don't author, when eval lands.

---

## 13. Definition of done + kill criteria

**v0 is done when:**
- [ ] E2E golden-path (discover -> call -> pay -> receipt -> reputation -> dispute -> settle) runs unattended in CI and on staging.
- [ ] A third-party dev completes the loop from docs + SDK only (recorded).
- [ ] `core/` >= 80% coverage; money/receipt branches 100%.
- [ ] Observability dashboards green for 7 consecutive days.
- [ ] Security pass: secrets, authz, rate limits, webhook sigs, PII handling reviewed.
- [ ] >= 10-50 curated dev-tool sellers onboarded; first real paid settlements flowing.

**Kill / pivot criteria (decide before you're emotionally invested):**
- After v0 + 4-8 weeks of seeding, if you cannot get **repeat** paid loops (not one-off demos), the demand thesis is failing — pivot the vertical or the wedge before building v1 crypto.
- If the grading loop's AI cost per shipped feature stays higher than the value of the feature, the operating model needs a human engineer, not more AI.

---

## 14. Decisions to confirm

These don't block the plan but they fork the scaffold. My recommendation in bold; override any.

| # | Decision | Recommendation | The real tradeoff |
|---|----------|----------------|-------------------|
| D-A | Repo shape | **Turborepo monorepo, TS everywhere** | More setup now vs. shared types + one toolchain (big AI-codegen win). |
| D-B | API framework | **Hono service + Next web** | Two deploy targets vs. portability + clean SDK contract. (Alt: all-in-Next route handlers = one target, less portable.) |
| D-C | ORM | **Drizzle** | Drizzle = serverless/edge scale; Prisma = more AI training data, fewer codegen errors, heavier serverless. |
| D-D | Job runner | **Inngest** | One managed dep covering Temporal+Kafka's v0 role. |
| D-E | Auth + DB vendor | **Supabase (DB+auth+storage+vector)** | Fewest vendors for a solo op vs. Clerk's nicer auth UX (then DB = Neon). |
| D-F | Eval-lite in v0 | **Defer to v0.1** | Keeps the loop the focus; eval is the wedge but not the loop. |
| D-G | Grading vendors | **Opus 4.8 reviews code, GPT 5.5 grades architecture + meta-audits** | Cross-vendor independence vs. higher combined AI spend. |

---

## 15. Summary

- **Feasible**, but only by deleting the dangerous surface: v0 is off-chain, Stripe-only, no contracts, no key custody.
- **Scope** = the marketplace loop end-to-end, modular monolith, scalability baked in via stateless + managed + typed + event-driven.
- **AI delegation (finalized):** Opus 4.8 owns all architecture and every decision; Composer 2.5 writes code bodies + tests only and never decides. Composer escalates via 5 enforced layers (contract-gated tasks, frozen-paths CI gate, new-symbol detector, DECISION-NEEDED protocol, compiler tripwire). A `STATE.md` state machine + CI-required grade/review artifacts tell the human, mechanically, when to run a grade or switch to Opus — three redundant channels, no model has to remember.
- **Timeline** = 8-10 weeks dedicated / 12-16 part-time for v0; roadmap to crypto rails (v1+) gated on demand + a security-expert hire, not the calendar.
- **Cost** = ~$350-1,800/mo, dominated by AI review/grading, not infra.
- **The one piece of forward design worth paying for now:** the `PaymentRail` interface, so x402 slots in behind Stripe later with no rewrite.
