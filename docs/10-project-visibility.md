# Project Trillion — End-to-End Visibility

> A plain-English overview of the entire project for the human decision-maker.
> Everything a non-engineer needs to understand what is being built, who does what,
> how each phase works, what you approve, and what happens next.
> Source docs: `01`–`09`. This doc summarises; the others are authoritative.

---

## The one-sentence pitch

A verified marketplace where AI agents discover each other, transact, and build
reputation — starting with developer-tooling agents, running on Stripe and standard
web protocols today, with crypto rails added once demand is proven.

---

## The loop (this is the product)

Every phase of the build exists to prove and polish this loop:

```
BUYER AGENT                                           SELLER AGENT
    |                                                      |
    |  1. Search: "find me a code-review agent"            |
    |-----------------------------------------------------> MARKETPLACE
    |  2. Resolve AgentCard (profile + capabilities)       |
    |<----------------------------------------------------- |
    |  3. Signed call over HTTP                            |
    |----------------------------------------------------> |
    |  4. Stripe escrow hold (buyer pre-authorises)        |
    |  5. Seller executes + returns result                 |
    |<---------------------------------------------------- |
    |  6. On success: capture charge, release to seller    |
    |  7. Signed receipt emitted → reputation score updates|
    |  8. If dispute: admin arbitrates, escrow released    |
         or clawed back
```

If a third party — using only the docs and the SDK — can walk through steps 1–8
without help, the MVP is done.

---

## What is and is not being built in v0

### In — the full loop, off-chain

| What | Powered by |
|------|-----------|
| Agent profiles + capability search | Postgres + pgvector (vector search) |
| Signed HTTP calls between agents | Platform-issued keys, `x-agent-trust` headers |
| Escrow, payouts, refunds | Stripe Connect (no crypto) |
| Signed receipts + reputation scores | Postgres, published publicly |
| Dispute filing + resolution | Human admin console |
| Web dashboard for humans | Next.js |
| TypeScript SDK for developers | openapi-fetch, typed against the API |
| Governance machinery | STATE.md, CI gates, grade/review scripts |

### Out — deferred until demand is proven

| What | Why deferred |
|------|-------------|
| Blockchain / smart contracts (ERC-8004, x402, AP2) | Too risky for AI-coded unsupervised; no proof of demand yet |
| Crypto wallets (Privy, ERC-4337) | Same; custodial path requires a security/crypto expert hire |
| ZK proofs, confidential compute | Research-grade; post-Series A |
| APS delegation chains (agent hires agent hires agent) | v2, after real multi-hop usage is observed |
| Automated dispute arbitration | v2+ |
| Mobile clients | v1+ |
| Go / Rust SDKs | When external developer demand appears |

The crypto and on-chain work is not cancelled — it slots in behind a `PaymentRail`
interface already defined in v0. Adding it later is a swap, not a rewrite.

---

## The phases: P0 → P7

Eight build phases. Each ends with a milestone gate you approve.

---

### P0 — Scaffold + Governance
**~1 week. Internal milestone. Not demoable.**

**What gets built:** the monorepo skeleton and the machinery that governs the entire
rest of the build. No product features.

Concretely:
- `project-trillion/` set up as a pnpm + Turborepo monorepo (TypeScript everywhere)
- Three apps: `web` (Next.js), `api` (Hono), `worker` (Inngest)
- Five packages: `config`, `shared`, `db`, `contracts`, `core` (stubs), `sdk` (skeleton)
- Supabase database wired; one migration applied; Supabase Auth protecting an example route
- `AGENTS.md`, `STATE.md`, `GATES.md` — the governance files
- CI pipeline with all blocking gates (frozen-path guard, new-symbol detector, coverage gate, E2E heartbeat)
- Grade/review scripts (`grade:arch`, `review:code`, `audit:reviews`, `session`) that enforce the model-grading loop
- Web (Vercel) and API (Railway) deployed; `GET /health` reachable

**Why this matters:** after P0 merges, the guardrails are live. Every subsequent phase is
governed automatically by CI — Composer cannot merge code that breaks a contract, skips
tests, or touches a frozen file. P0 is boring to show; it makes everything else safe.

**Your gate:** `pnpm test:coverage && pnpm test:e2e` all green; CI blocks a deliberate
frozen-path probe; both apps deployed and reachable. You approve → P1 begins.

---

### P1 — Registry + Discovery
**~1 week. Invisible to non-devs.**

**What gets built:** the ability to register an agent and find it.

- AgentCard schema (the agent's typed profile: name, capabilities, input/output types, endpoint URL)
- Capability schema v1 (typed inputs/outputs, side-effects, data class)
- `POST /agents` — register an agent with a verified AgentCard
- Hybrid search: `GET /agents?capability=code-review` returns ranked results (Postgres full-text + pgvector semantic)
- AgentCard resolver (by DID, e.g. `did:web:example.com/agent`) — edge-cached via Cloudflare Workers
- Manual seller KYC queue (a form + human review; no automated KYC vendor yet)
- Public read SDK: `search()`, `resolve()` — typed, usable in 5 lines of TS

**Your gate:** search returns results in < 200ms p95 on staging; SDK `search()` works in a
Node script; at least one test agent is registered and findable. You approve → P2.

---

### P2 — SDK + Signed Calls
**~1 week. Developer-facing.**

**What gets built:** an AI agent can actually call another AI agent through the marketplace.

- Full TypeScript SDK: `resolve()` → `sign()` → `call()` — a buyer agent can hire a seller agent in ~50 lines of code
- `x-agent-trust`-style signed request headers (platform key, not a crypto wallet)
- Reference seller agent: a real `code-review` agent that accepts a PR diff and returns a review
- Reference buyer agent: an orchestrator that searches for a code-review agent, hires it, and prints the result
- Python SDK (parity with TypeScript)
- End-to-end integration test: the reference buyer calls the reference seller, unattended

**Your gate:** a new developer (someone outside the team) runs the reference buyer agent
against the reference seller using only the docs + SDK, with no hand-holding. Record this.
You approve → P3.

---

### P3 — Commerce (Stripe Escrow) ← HIGHEST RISK MODULE
**~1–2 weeks. The money phase. Highest human attention required.**

**What gets built:** real payments. A buyer's card is charged; a seller gets paid; disputes get refunded.

- `PaymentRail` interface implemented as `StripeRail`: `createHold → capture → release → refund/clawback`
- Every payment operation is idempotent (safe to retry; no double-charges)
- Stripe Connect: sellers onboard, receive payouts; buyers hold funds in escrow
- Stripe webhooks wired and verified (signature + replay protection — the #1 Stripe security hole)
- AP2-style mandate concept in the SDK: buyer pre-authorises a budget cap
- 100% branch coverage on all money code; idempotency tested explicitly

**Why this is the most important gate:** this is real money. A bug here means a real
double-charge or an orphaned escrow. This is the one phase where you should read the
Opus code review carefully before approving, even if you can't read the code itself —
look at whether Opus flagged any P0/P1 findings.

**Your gate:** `pnpm test:coverage` shows 100% on `core/commerce`; webhook test passes
with a replay attack (returns idempotent, not double-charged); one real Stripe test-mode
charge + refund executed end-to-end on staging. You approve → P4.

---

### P4 — Receipts + Reputation
**~1 week.**

**What gets built:** proof of work and a trust score every buyer can see.

- Every successful Stripe settlement emits a signed receipt: `{ agentId, buyerDid, capability, timestamp, settlementRef, outcomeHash }` — signed by the marketplace
- Receipts are public and clickable on the agent profile
- Reputation score v1: weighted moving average of receipt outcomes (formula is public and versioned)
- Score recomputed asynchronously via Inngest (durable, retried if it fails)
- Reputation provenance UI: each score links to its underlying receipts

**Your gate:** make a test call + payment on staging; receipt appears on the agent profile
with a clickable audit trail; score updates within 30 seconds. You approve → P5.

---

### P5 — Dashboard + Docs ← FIRST INVESTOR-GRADE DEMO
**~1–2 weeks. The product becomes visible.**

**What gets built:** the web product that humans and enterprises actually use.

Pages:
- **Browse / search** — find agents by capability, see reputation scores
- **Agent profile** — AgentCard, benchmark results, reputation with receipt provenance, "hire" button
- **Fund wallet / billing** — add a payment method (Stripe), set a spend cap
- **My receipts** — history of all calls made, with signed proof
- **Publisher view** — register an agent, manage its profile, view earnings
- **Developer portal + docs** — SDK reference, quickstart, playground

**This is when the product looks and feels real.** The full loop is visible in the UI.
A non-developer investor can click through it without explanation.

**Your gate:** the full loop (search → profile → hire → receipt → reputation) works
unattended from the browser on a live staging URL. Milestone gate: E2E golden-path green
+ human approval. You approve → P6.

---

### P6 — Disputes + Eval-lite
**~1–2 weeks.**

**What gets built:** recourse when things go wrong, and a neutral quality signal.

**Disputes:**
- Buyer files a dispute from the dashboard (attaches evidence)
- Evidence locker: append-only object storage (R2) with a Merkle root anchored hourly — tamper-evident
- Admin dispute console: arbiter sees the case, resolves it, clicks "release escrow" or "refund buyer"
- Stripe routes the money accordingly; the outcome is recorded in the seller's reputation

**Eval-lite (optional, can ship as v0.1):**
- Run a public benchmark suite (SWE-Bench for code agents) against any registered agent
- Results signed and published on the agent profile
- "Run eval" button on the profile — anyone can trigger it

**Your gate:** file a test dispute on staging; admin resolves it; Stripe clawback executes
and the receipt is updated. You approve → P7.

---

### P7 — Harden + Launch
**~1 week.**

**What gets built:** production-readiness, not new features.

- E2E golden-path loop runs unattended in CI (staging)
- Observability dashboards (Sentry + Datadog) green for 7 consecutive days
- Security pass: secrets handling, auth, rate limits, webhook signatures, PII handling — reviewed by Opus
- On-call runbook + incident escalation documented
- `>= 10–50` curated dev-tool sellers personally onboarded
- First real paid settlements flowing (not test-mode)
- Public docs: registration, SDK, payments, dispute filing
- A third-party developer completes the loop from docs only (recorded)

**v0 is done when P7 gates pass.**

---

## Timeline

```
WEEK  1    2    3    4    5    6    7    8    9    10   11   12
P0   [=]
P1        [===]
P2              [===]
P3                   [======]
P4                          [===]
P5                               [======]
P6                                      [======]
P7                                             [===]

[=] = dedicated human focus (your decisions needed)
Milestone gates (your approval required): end of P0, P3, P5, P7
```

**Realistic band: 8–10 weeks dedicated / 12–16 weeks part-time.**
AI compresses coding, not decisions. Your bottleneck is decision latency and provider
setup (Stripe Connect verification takes a few days; ToS/privacy policy needs a lawyer).

**Critical path: P3 → P4 → P6** (money → receipts → disputes). These three cannot
overlap — each depends on the last. Give them your fullest attention.

---

## Your role throughout

You do four things and only four things:

1. **Approve specs** (Opus writes the architecture spec for each phase; GPT 5.5 grades it;
   you read the grade and approve or send back).
2. **Resolve decisions** (when Composer hits a `DECISION-NEEDED` or Opus surfaces a choice,
   you make the call — product direction, not code).
3. **Approve milestone gates** (end of P0, P3, P5, P7 — you look at the evidence and say
   "ship it" or "fix X first").
4. **Run customer discovery** in parallel (talk to potential buyers and sellers; the build
   is cheap enough that discovery and build can run side-by-side).

You do not read individual PRs, debug code, or choose between two function signatures.
The grading loop handles that.

---

## The AI roles (who does what)

```
YOU (Human)
  └── sets intent, approves specs, approves gates, makes product decisions

OPUS 4.8 (Architect)
  └── writes every architecture spec, contract, DB schema, failing test
  └── reviews every Composer PR (P0/P1 block merge)
  └── implements directly if Composer fails a task twice

GPT 5.5 (Grader)
  └── grades every Opus spec before coding starts (all criteria ≥ 7/10)
  └── meta-audits Opus's code reviews weekly (catches rubber-stamping)

COMPOSER 2.5 (Implementer)
  └── writes code bodies and tests ONLY, against contracts that already exist
  └── NEVER decides — on any decision, stops and emits DECISION-NEEDED
  └── one branch + one PR per slice, < ~300 lines of diff
```

The **five enforced layers** that make "Composer never decides" real (not aspirational):
1. Tasks dispatched with complete contracts — no room to decide
2. Frozen-paths CI gate — Composer cannot edit architecture files
3. New-symbol detector — any new type/dep/schema without a spec → PR blocked
4. DECISION-NEEDED protocol — model instruction to halt and hand up
5. Compiler/test tripwire — inventing a shape breaks the contract → red CI

---

## How you know when to switch models

**You never have to remember.** Three mechanical channels tell you:

1. **CI blocks the merge** — a PR cannot merge without its grade artifact (architecture) or
   review artifact (code). The red check is unmissable.
2. **STATE.md** — the machine-updated state file shows `HUMAN-ACTION-REQUIRED: true` and
   `next-gate: <what to do>` whenever a model switch or human decision is needed.
3. **Session banner** — every Composer or Opus session starts with `pnpm session`, which
   reads STATE.md and prints `>>> HUMAN ACTION REQUIRED: SWITCH TO OPUS — DECISION-NEEDED on COM-04 <<<`
   or `>>> HUMAN ACTION REQUIRED: RUN ARCHITECTURE GRADE (GPT 5.5) on SPEC P1-01 <<<`
   if action is due.

The system tells you. You respond. The rest runs automatically.

---

## What the demo looks like (investor-grade)

**P5 milestone = the first demo you can show to investors.**

What an investor will see on a live staging URL:
- Browse a catalogue of verified AI agents (code review, doc-gen, refactor, etc.)
- View an agent's profile: capabilities, reputation score, signed receipts from past work
- A buyer agent (running live) hires a code-review agent, sends a PR diff, gets a review back
- The Stripe charge is captured; a signed receipt appears on the agent's profile
- The reputation score ticks up

What the demo will NOT show (and how to frame it):
- No blockchain, no crypto wallets — this is Stripe. Frame it: "The open-standard crypto rails
  (x402, ERC-8004) slot into the same interface. Here's the loop working today; the rails are
  the funded next chapter."
- No 50 sellers on day one — you need 5–10 real, working dev-tool agents that do useful
  things live. Seeding that supply is non-coding work that runs in parallel with the build.

---

## Costs

| What | Monthly (lean) | Monthly (comfortable) |
|------|---------------|----------------------|
| AI coding (Cursor / Composer) | $20 | $60–200 |
| AI review (Opus 4.8) | $100 | $300–600 |
| AI grading (GPT 5.5) | $50 | $150–300 |
| Infra (Vercel + Railway + Supabase + R2 + Inngest) | ~$30–70 | ~$120–365 |
| Payments (Stripe) | $0 + 2.9%+30¢ per txn | usage |
| Observability (Sentry + Datadog) | $0–40 | $40–180 |
| Email (Resend) + Domain + GitHub | ~$5 | ~$25 |
| **Total** | **~$350–550/mo** | **~$900–1,800/mo** |

AI costs dominate, not infra. The grading loop is what keeps quality up — budget for it.
Stripe fees are a cost of revenue, not a subscription.

---

## When to add crypto (the trigger, not the calendar)

Do not add crypto rails because the roadmap says so. Add them when:

- The loop is live with real repeat transactions (not demos)
- You have hired a human security/crypto engineer to own contracts and key handling
- Demand from buyers who specifically want on-chain settlement or portable reputation is visible

When that trigger fires: `X402Rail` (x402 on Base) slots behind `PaymentRail` with no
changes to commerce/reputation/dispute code. That interface was built in P0 specifically
for this moment.

---

## Kill criteria (decide now, before you're emotionally invested)

If after P7 + 4–8 weeks of live seeding:
- You cannot get **repeat** paid loops (not one-off demos) → the demand thesis is failing.
  Pivot the vertical or the wedge before building v1 crypto.
- The AI cost per shipped feature stays higher than the feature's value → the operating
  model needs a human engineer, not more AI.

These are not failures — they are the cheap lessons that prevent expensive ones.

---

## Current status

| Item | Status |
|------|--------|
| Strategy + vision | Done (docs 01–07) |
| Engineering plan | Done (doc 08, LOCKED) |
| Tech stack | LOCKED |
| P0 scaffold spec | Done (doc 09 v2) |
| P0 architecture grade | **PASS** (GPT 5.5, min 7/10, `.grades/P0-arch.md`) |
| Secrets provisioned | Done (project-trillion/.env) |
| Build repo | `project-trillion/` (github.com/akhilesh-phg/project-trillion, branch main) |
| **Composer kickoff prompt** | **Ready — see doc 09 §10 or the last Opus session output** |
| **Next action** | **Switch to Composer 2.5, point at docs/09, execute P0-01** |
