# Context Summary — Verified Agent Marketplace

> **Purpose:** A dense, self-contained briefing of the entire project plan, written to be pasted as context input for LLMs. It compresses docs `01`–`09`. Where this conflicts with a source doc, the source doc wins. Read order of sources: `01` vision → `02` MVP → `03` strategy → `04` decisions → `05` thesis reverification → `06`/`07` office hours → `08` engineering plan → `09` P0 scaffold spec.

---

## 1. What is being built

**One sentence:** A verified marketplace where AI agents discover each other, transact, and exchange capabilities/knowledge under cryptographic identity, programmable compliance, and portable reputation — built on open standards so it cannot collapse into a walled garden.

**Positioning (hybrid):**
- **Open protocol layer underneath** — W3C DIDs, ERC-8004 (identity + reputation), ERC-8126 (verification), A2A (agent-to-agent), MCP (agent-to-tool), AP2 (mandates), x402 (settlement).
- **Commercial layer on top** — curated directory, semantic search, eval harness, escrow, arbitration, compliance gating.

**Revenue:** settlement take rate (5–10%), premium verification, eval-as-a-service, enterprise tier. Standards stay open; the venue + trust brand are the product.

**The core mental model:** standards define what is *possible*; the marketplace certifies what *actually works*. Analogy: HTTP → Amazon/App Store/GitHub/Stripe. **Trust is the spine** — Discovery filters by it, Interaction signs with it, Commerce gates payouts against it, Experience surfaces it. Verification depth is the differentiator big payment rails structurally cannot match.

---

## 2. Full architecture (the north star, doc 01)

Five layers:

| Layer | Purpose | Standards anchor |
|-------|---------|------------------|
| **Trust** | Portable identity, verification, reputation, policy, revocation | W3C DID + VC 2.0, ERC-8004, ERC-8126 |
| **Discovery** | Find the right agent fast; bias toward verified supply | AGNTCY directory pattern, A2A AgentCard |
| **Interaction** | Run A2A + agent-to-tool calls with signed provenance | A2A, MCP, `x-agent-trust` |
| **Commerce** | Mandates, settlement, escrow, dispute | AP2, x402, ACP/TAP adapters |
| **Experience** | Humans/devs/enterprises drive the system | Privy/Dynamic, OIDC, SIWE |

**Customers:** Supply = agent builders/studios, enterprises exposing capabilities, knowledge/data owners, tool/MCP providers, domain specialists. Demand = orchestrator agents, enterprises procuring agents, other agents composing skills, developers, end-users. Ecosystem = validators/auditors, compliance attesters, insurers, arbiters.

**Feature catalog** splits into "the obvious six" (registration, discovery, verification, payments, compliance, disputes) and "the under-discussed half where the moat lives" (capability schema + semantic typing, sandboxed eval/benchmark harness, versioning/provenance/SBOMs, policy negotiation, programmable SLAs, telemetry + post-trade attestation, revocation/quarantine, delegation chains, knowledge exchange, confidential compute, insurance/staking, anti-Sybil, regulatory zoning, analytics, dev portal, wallet UX, receipts/tax export).

**Full tech stack (aspirational, funded-team version):** Solidity+Foundry on Base/Polygon; W3C DID/VC; ZK (Circom/Halo2, risc0/SP1); TS indexer + viem; OpenSearch + pgvector; A2A/MCP SDKs; USDC on Base via x402 + Circle CCTP; OPA/Cedar policy; Persona/Onfido KYC; Postgres/Redis/Kafka/ClickHouse; Temporal; Next.js 15; Privy; K8s/EKS; OTel→Datadog.

---

## 3. Strategy (doc 03)

**Value prop:** turns agent-to-agent commerce from N bespoke integrations into one function call. Removes discovery cost, trust cost, integration cost, payment cost, recourse cost, compliance cost, drift cost, composition cost. For sellers: converts fixed costs (billing, legal, fraud, trust-building) into a variable take rate.

**Why the open web alone is insufficient:** no shared trust substrate, no coordinated discovery, no dispute venue, no compliance gate.

**The real competitor is NOT a standards body (AAIF) — it is Big Tech payment rails** (AP2 = Google+Coinbase, ACP = Stripe+OpenAI, TAP = Visa, x402 = Coinbase) extending into discovery + dispute. Defense: neutrality, verification depth, vertical depth, credible open exit ("leave with your DID + reputation").

**Defensibility tiers:** Structural (network effects + portable reputation, data flywheel on reputation graph, trust brand) > Earned (curation quality, eval/benchmark IP, vertical depth, dispute ops, multi-rail abstraction) > Positioning (regulatory posture, standards stewardship). NOT moats: "we use ERC-8004", "open source", "first mover", "nice SDK", "website with search". **Year-1 truth: the moat is execution speed + curation taste + community trust.**

**GTM wedge:** verticalize at launch (dev-tool agents first), curate first ~50 sellers in-house, subsidize buy-side, open self-serve only after liquidity, expand horizontally only after vertical PMF.

**Capital plan:** Seed $5–8M → Series A $20–25M → larger B. **Not a lean startup.** Acquirers: Coinbase, Stripe, Visa, Google Cloud, MSFT, Salesforce, ServiceNow.

**Top risks (ordered):** (1) incumbent compression timing — AP2+ACP merging discovery+dispute within 12–18 months [biggest market risk]; (2) two-sided cold-start execution; (3) founder-market fit (rare cross-domain team).

---

## 4. Resolved open decisions (doc 04 — binding for MVP)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Chain anchor | **Base** primary (settlement + ERC-8004); **Polygon** read-only mirror. Single chain in MVP (Base Sepolia). Wrapped behind `ChainAdapter`. |
| 2 | Wallet | **Custodial Privy embedded** default for first cohort + one-click ERC-4337 export. Enterprises = BYO-KMS / smart account from day one. Mandate signer must be wallet-agnostic. |
| 3 | OSS posture | **Open protocol, closed platform.** OSS (Apache-2/MIT): SDKs, schemas, AgentCard extensions, policy spec, eval manifest, contracts. Closed: indexer, web app, dispute console, KYC integrations, curation rules, red-team sets. BSL-1.1 held in reserve. |
| 4 | Launch vertical | **Developer-tooling agents** (code review, refactor, doc-gen, test-gen, eval). Sales-dev = second wedge ~6mo later. Data agents = post-Series-A. |
| 5 | Eval posture | **Hybrid:** wrap HELM/lm-eval-harness/OpenAI Evals/SWE-Bench/RepoBench/HumanEval as reference suites; build proprietary domain red-teams; own a signed/reproducible orchestration layer (manifest OSS, orchestrator closed). |
| 6 | AAIF | **Apply as project member post-seed**, 0.5 FTE to upstream standards, stay commercially independent. |

Explicitly *not* decided: exact pricing curve, insurance carrier, arbitrator pool composition, reputation scoring weights, knowledge-exchange license schema.

---

## 5. The critical reframe (doc 05 — thesis reverification)

**This is the most important strategic context.** An office-hours reverification concluded the thesis is **architecturally sound, demand-UNproven, and timing-sensitive.**

- "Demand for AI agents" is proven. "Demand for a *neutral agent-to-agent marketplace with verification + settlement + dispute*" is **not**. Enterprises buy agents through trusted single vendors — the mechanism that makes a neutral marketplace potentially *unnecessary*.
- The single load-bearing premise of all the vision/strategy: *"Enterprises will route mission-critical agent commerce through a neutral third-party marketplace and pay a 5–10% take rate."* **Zero behavioral evidence today.**
- Coinbase's Agentic.Market (~$55k/day ≈ $20M/yr GMV) proves a *cheap, low-trust, crypto-native* layer has demand — but that is the competitor's traction and the *opposite* of the high-trust/high-stakes flows the moat is built for. It is incumbent compression (risk #2) materializing **now**.

**The prescribed test (do BEFORE more building):** a 2-week, ~$0 demand-discovery sprint — 10 Mom-Test interviews with platform/infra leads at orgs already wiring up multiple third-party agents, plus a profile of who actually transacts on Agentic.Market. **Kill/continue criteria are explicit** (≥3/10 cite a specific recent pain; ≥2 already pay for a workaround; ≥1 offers an unprompted next step → continue).

> **Note:** doc `05` says do this before code, but the team has proceeded to engineering planning (`08`/`09`) in parallel, explicitly framing v0 as a cheap loop-proof that *generates* demand signal. Treat demand validation as an open, unresolved risk running alongside the build.

---

## 6. What is ACTUALLY being built now: Loop-Proof v0 (docs 08 + 09)

**Operating model (locked):** one human makes decisions and reads no code; AI writes everything. Customer discovery runs in parallel.

**Scope decision (locked):** **off-chain only, Stripe-only payments, no smart contracts / ERC-8004 / x402 / AP2 / ZK / key custody.** All crypto rails deferred to v1, gated on demand + a security/crypto expert hire. Rationale: a lower-capability coding model writing unsupervised Solidity/KMS/signing = irreversible fund loss; delete the dangerous surface entirely. Stripe is the regulated entity of record (no money-transmitter analysis, no HIPAA/SOC2 needed for the dev-tool vertical).

**The reframe:** *the loop is the product, not the rails.* If buyers/sellers won't transact over a Stripe call, they won't over an x402 call. Prove the loop cheap.

**v0 exit bar — a third-party buyer agent, using only SDK + docs, must:**
1. **Discover** a verified seller by capability (search).
2. **Resolve** its AgentCard and **call** it over a signed HTTP request (A2A/MCP-lite).
3. **Pay** via Stripe (funds held in escrow).
4. **Receive a signed receipt** that updates the seller's reputation.
5. **File a dispute**; an admin arbiter resolves it; Stripe releases or claws back escrow.

**The loop:** `discover → call → pay → receipt → reputation → dispute → settle`.

**Architecture:** a **modular monolith** (not microservices — premature decomposition for solo+AI), with module boundaries (`registry`, `discovery`, `commerce`, `reputation`, `disputes`, `eval*`) drawn so any can be extracted later. Principles: **boring, managed, typed, stateless, event-driven, idempotent.** The **`PaymentRail` interface** (createHold/capture/release/refund) is the one piece of forward-design — `StripeRail` now, `X402Rail` slots in later with zero changes to commerce/reputation/dispute code.

---

## 7. v0 locked tech stack (doc 09)

| Concern | Locked choice |
|---------|---------------|
| Monorepo / pkg mgr | **Turborepo + pnpm** |
| Language | **TypeScript (strict)** everywhere |
| Web | **Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui** |
| API | **Hono + @hono/zod-openapi** (OpenAPI generated from Zod) |
| Contracts/validation | **Zod** (source of truth for all I/O types) |
| ORM/DB | **Drizzle + Postgres (Supabase) + pgvector** |
| Auth | **Supabase Auth** (one vendor with DB) |
| Object storage | **Cloudflare R2** (S3 API) |
| Jobs/workflows | **Inngest** (durable functions; replaces Temporal+Kafka for v0) |
| Payments | **Stripe + Stripe Connect** (built in P3, not P0) |
| Email | **Resend** |
| Errors/metrics | **Sentry + Datadog** |
| Tests | **Vitest** (unit) + **Playwright** (E2E) |
| Hosting | **Vercel** (web) + **Railway** (api + worker) |
| CI | **GitHub Actions** |

Version rule: always install latest stable via `pnpm add`, commit lockfile, never guess versions. Search = Postgres full-text + pgvector hybrid (no OpenSearch). Cost: ~$350–550/mo lean, ~$900–1,800/mo comfortable — **AI review/grading dominates the bill, not infra.**

---

## 8. The AI-delegation governance model (doc 08 §6–7, doc 09 §6) — distinctive and load-bearing

**Roles (hard rule):**
- **HUMAN** — owns intent, scope, go/no-go. Reads no code. Receives escalations.
- **Opus 4.8 (architect)** — owns ALL architecture + EVERY decision. Writes contracts, specs, failing tests. Resolves every `DECISION-NEEDED`. Reviews every PR.
- **Composer 2.5 (implementer)** — writes code bodies + tests ONLY, against existing contracts. NEVER decides. On any decision, STOPS and hands up.
- **GPT 5.5 (grader)** — grades Opus's architecture (cross-vendor independence); weekly meta-audits Opus's code reviews.

**Method:** contract-first (Opus writes Zod schemas + OpenAPI + DB schema + signatures + failing tests; Composer fills bodies until green). Vertical slices < ~300 line diff, tests in same PR, copy existing patterns.

**Decision boundary:** a "decision" = anything defining *shape* (new type/signature/interface, new dependency, schema change, new pattern, multiple approaches, frozen-path edit). Composer only fills *behavior* into shapes Opus defined.

**Frozen paths** (Composer CI-blocked on `composer/` branches): `packages/contracts/**`, `packages/db/schema/**`, `packages/core/commerce/**`, `apps/api/**/commerce/**`, `package.json`, `pnpm-lock.yaml`, `AGENTS.md`, `STATE.md`, `GATES.md`, `specs/registry.json`, governance scripts. Identity detection = `MODEL` env > `Model:` commit trailer > branch prefix; new-symbol/dep changes require a `Spec: <id>` trailer resolvable in `specs/registry.json`.

**5-layer escalation (defense in depth, don't trust the model — trust the machine):** (1) contract-complete task dispatch makes most decisions structurally impossible; (2) `gate:frozen-paths` CI block; (3) `gate:no-new-decisions` new-symbol detector; (4) `DECISION-NEEDED` model-prompt protocol (exact emit-and-halt block); (5) compiler/test tripwire if Composer invents a shape.

**Mechanical "grade now / switch to Opus" triggers:** `STATE.md` (machine-updated, read at every session start) + blocking CI status + agent session banner — three redundant channels so no model has to *remember* a gate is due. Grades/reviews committed as auditable artifacts (`.grades/`, `.reviews/`). No path to production skips a model gate.

**Grading gates:** architecture grade (GPT 5.5 on Opus specs, all criteria ≥ 7/10); code grade (Opus on Composer PRs, no P0/P1 findings, coverage met); CI gates (typecheck/lint/test/coverage/e2e/build); weekly GPT 5.5 meta-audit.

---

## 9. v0 phases + timeline (doc 08 §9)

```
P0  scaffold              monorepo, CI, DB, auth, AGENTS.md, deploy, E2E skeleton, governance machinery
P1  registry + discovery  AgentCards, capability schema, hybrid search, read SDK
P2  SDK + signed calls     resolve/sign/call, reference seller + buyer agents
P3  commerce (Stripe)      hold/capture/release/refund, webhooks, idempotency  ← highest-risk module
P4  receipts + reputation  signed receipts, public versioned score, provenance
P5  dashboard + docs       browse/profile/billing/receipts/publisher view
P6  disputes + eval-lite    admin console, evidence locker, escrow clawback
P7  harden + launch        E2E green, obs, security pass, onboard first sellers
```

**Critical path:** P3 → P4 → P6 (money → receipts → disputes). **Realistic band: 8–10 weeks dedicated / 12–16 part-time.** Milestone gates (human + E2E) at end of P0, P3, P5, P7. AI compresses coding, NOT decisions/integration/provider setup/discovery.

**Test discipline:** `core/` ≥ 80% line coverage; **money/receipt branches 100%**; webhook signature + replay tests mandatory; E2E golden-path loop is the merge-blocking heartbeat.

---

## 10. Current status

- Docs `01`–`09` complete. Strategy, decisions, and v0 engineering plan are written and the v0 tech stack is **LOCKED**.
- **Build repo re-rooted** to the existing cloned repo `project-trillion/` (inside `Marketplace/`; `origin = github.com/akhilesh-phg/project-trillion`, branch `main`). `.env` is already provisioned with every key (Supabase, R2, Inngest, Sentry, Datadog, Resend, OpenAI, Anthropic). Stripe not needed until P3.
- Doc `09` (P0 scaffold spec) is the build contract for Composer, defining 12 ordered slices (P0-01 … P0-12; **P0-12 = the governance machinery, the most important slice**).
- **Grade history:** P0 spec v1 was graded by **GPT 5.5** → **FAIL** (min 5/10; testability 6, Composer-executability 5). Doc `09` revised to **v2** (granular per-slice contracts, real coverage tooling, gate-script fixtures, identity/`Spec:`-trailer detection, heartbeat from slice 1). **Re-grade required.**
- **Next action per doc 09 §10:** re-run the manual P0 architecture grade with GPT 5.5 → if all six criteria ≥ 7, overwrite `.grades/P0-arch.md` and approve → **then** switch to Composer 2.5 (in `project-trillion/`) to execute P0-01…P0-12. Not before.
- **Unresolved tension to keep visible:** doc `05` says validate demand (2-week interview sprint) before building; the build is proceeding in parallel as a cheap demand-signal generator. Demand for the *neutral, high-trust* marketplace remains the dominant open risk.

---

## 11. Roadmap beyond v0 (gated on demand + funding + expert hire, NOT calendar)

| Phase | Trigger | Scope |
|-------|---------|-------|
| **v0.1** | v0 live, first sellers onboarded | Eval-lite (SWE-Bench wrapper), polish, relevance tuning |
| **v1 (crypto rails)** | Demand proven AND security/crypto engineer hired | `X402Rail` behind `PaymentRail`, Base settlement, `did:pkh` wallets (Privy), signed-VC receipts |
| **v1.5** | x402 stable in prod | ERC-8004 identity anchor, on-chain reputation mirror, Polygon read-indexer |
| **v2** | Multi-hop usage observed | APS delegation chains, SINT policy enforcement, eval depth (red-team sets) |
| **v3** | Enterprise pipeline | Confidential compute (TDX/Nitro), insurance/staking, ACP/TAP adapters, SOC2/HIPAA |

**Kill/pivot:** if after v0 + 4–8 weeks of seeding you cannot get *repeat* paid loops (not one-off demos), the demand thesis is failing — pivot vertical/wedge before building v1 crypto.
