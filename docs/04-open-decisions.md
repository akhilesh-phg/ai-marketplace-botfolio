# Open Decisions — Resolved

> Deliverable for to-do `open_decisions` (plan section 15). This memo resolves the six open product / strategy decisions that gate broader engineering. Each decision states the question, the options considered, the chosen path, the rationale, the downstream implications, and the conditions under which we would revisit.

---

## 0. TL;DR

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Primary chain anchor | **Base** as primary settlement + ERC-8004 anchor; **Polygon** as a read-side mirror for cross-chain reputation portability. Single chain in MVP (Base Sepolia). |
| 2 | Default wallet model | **Custodial Privy embedded wallet** as the default for the first cohort, with a one-click **ERC-4337 smart-account export** path. **BYO-KMS or smart account from day one** for enterprises. |
| 3 | OSS posture | **Open protocol, closed platform.** SDKs, schemas, AgentCard extensions, policy-bundle spec, eval-harness manifest, and smart contracts are **OSS (Apache-2.0 / MIT)**. Indexer, web app, dispute console, KYC integrations, and curation rules are **closed source**, with a **BSL-1.1 → Apache-2 sunset** option held in reserve. |
| 4 | Vertical at launch | **Developer-tooling agents** (code review, refactor, doc-gen, test-gen, eval). Sales-development agents queued as the **second wedge** ~6 months post-MVP. |
| 5 | Eval partner | **Hybrid.** Wrap **HELM, lm-eval-harness, and OpenAI Evals** as reference suites; build **proprietary domain harnesses + red-team sets** for the launch vertical; own the **signed, reproducible orchestration layer** that anchors results to ERC-8004 reputation. |
| 6 | AAIF affiliation | **Apply as a project member** after seed close; allocate **0.5 FTE** to upstream standards work; remain commercially independent. The marketplace is not the standards body. |

---

## 1. Primary chain anchor

### 1.1 Question

Where do we anchor on-chain identity (ERC-8004), verification hooks (ERC-8126), and escrow? Base only, Polygon only, or both with bridging?

### 1.2 Options

| Option | For | Against |
|--------|-----|---------|
| **Base only** | x402 is native; USDC is canonical; AP2 (Google + Coinbase) is aligned; lowest gas; mature L2 tooling | ERC-8004 mainnet not yet live; Base Sepolia is the only short-term anchor |
| **Polygon only** | ERC-8004 already live on Amoy and approaching mainnet; cheaper writes at volume | Outside the Base-native commerce loop (x402, Coinbase, AP2); USDC is bridged; weaker enterprise mindshare |
| **Both with bridging** | Maximum optionality; native ERC-8004 on Polygon, native commerce on Base | Doubles the indexer, audit, key-management, and security surface; bridge risk; cognitive load on builders |

### 1.3 Resolution

**Base is the primary anchor. Polygon is a read-side mirror.**

- All commerce + escrow + AP2 mandates settle on **Base** (Sepolia in MVP, mainnet at GA).
- ERC-8004 identity + reputation is **anchored on Base** at GA. While ERC-8004 is not yet on Base mainnet, we deploy our own audited reference build (or wait for the canonical deployment, whichever lands first) rather than introduce cross-chain dependence.
- We run an **indexer for Polygon Amoy / mainnet** so attestations and reputation written there by other ecosystem actors are visible inside our directory. This is read-only, no bridging, no asset movement.
- The chain layer is wrapped behind a **`ChainAdapter` interface** in code so a third chain (e.g. Solana, an L2 we don't yet anticipate) can be added without touching commerce or directory services.

### 1.4 Downstream implications

- Foundry projects target Base Sepolia + Base mainnet; one configurable RPC profile per environment.
- x402 facilitator and AP2 mandate signer are configured for Base only in MVP — fewer moving parts.
- Indexer is split into a `commerce-indexer` (Base, write-path) and a `attestation-indexer` (Base + Polygon, read-path).
- Cross-chain reputation portability is a **post-MVP feature**, not a launch blocker.

### 1.5 Revisit triggers

- AP2 ships a non-EVM rail of consequence (e.g. Solana mainnet) with material enterprise adoption.
- ERC-8004 canonical deployment lands on a chain that is *not* Base.
- A material counterparty (top-10 issuer or auditor) chooses a non-Base chain as primary.

---

## 2. Default wallet model

### 2.1 Question

Should the default UX be a custodial embedded wallet (Privy / Dynamic) or a non-custodial smart account (ERC-4337) from day one?

### 2.2 Options

| Option | For | Against |
|--------|-----|---------|
| **Custodial (Privy / Dynamic)** | Lowest friction for non-crypto-natives; OAuth-style consent for AP2 mandates; fastest path to a working wallet UX | Custody liability; not credibly neutral; user has no exit signature |
| **Non-custodial smart account (ERC-4337) only** | Maximum sovereignty; session keys, paymaster, batched mandates; aligns with the "leave with your DID and reputation" promise | UX is still painful; gas-abstraction infra is non-trivial; loses 80% of buyers in week 1 |
| **Custodial-default with smart-account export** | Best onboarding *and* a credible exit | Two wallet code paths to maintain; migration UX is a real product surface |

### 2.3 Resolution

**Custodial Privy embedded wallet is the default for the first cohort, with a built-in ERC-4337 smart-account export. Enterprises use ERC-4337 smart accounts or BYO-KMS from day one.**

- Privy gives us an embedded EOA per user out of the box, hides seed phrases, and supports a one-click upgrade to an **ERC-4337 smart account** when the user is ready. This is the right shape for the cold-start cohort (developers signing AP2 mandates on a web dashboard).
- For **enterprise** tenants, we **never default to custody.** Enterprises bind a **BYO-KMS** (AWS KMS, GCP KMS, HashiCorp Vault, or HSM) to their org account; mandates are signed against a smart account they control.
- Session keys + paymaster on the smart-account side mean a buyer agent can sign hundreds of x402 micropayments under a single AP2 mandate without rebuying gas every call.
- The **exit story is non-negotiable**: at any time, a user can export their key material (custodial) or rotate signers (smart account) and continue transacting against the same DID + ERC-8004 `agentId`.

### 2.4 Downstream implications

- Privy is a dependency from week 1; we will need the enterprise tier to ship a self-custodied flow before we onboard regulated buyers.
- The mandate signer in the SDK must be **wallet-agnostic** — it takes a signer interface, not a Privy client.
- Compliance: custodial wallets put us in scope for some money-transmitter analysis in certain jurisdictions; legal review is required before we open self-serve to consumer buyers in the US.
- Documentation must be explicit about the **trust boundary** of the default wallet so we are not accused of misrepresenting custody.

### 2.5 Revisit triggers

- A category-defining regulatory event (US, EU) materially changes the custodial risk profile.
- Privy / Dynamic loses parity with smart-account UX or hits a service-level incident that erodes trust.
- We cross 10k wallets and the operational cost of custody starts to outweigh onboarding value.

---

## 3. Open-source posture

### 3.1 Question

Open-source-first (Linux model — everything public from day one) or build closed then open the protocol (App Store model)?

### 3.2 Options

| Option | For | Against |
|--------|-----|---------|
| **Fully OSS from day one** | Maximum credibility with the standards community; lowest perceived lock-in | Easier to fork; harder to fund; competitors can absorb engineering for free |
| **Fully closed** | Maximum capture of engineering value | Destroys the neutrality narrative; AAIF / W3C engagement becomes performative; enterprise procurement assumes vendor lock-in |
| **Open protocol + closed platform** | Standards work is OSS; commercial differentiators (curation, evals, dispute ops, indexer at scale) are closed | Some perception cost; some maintenance overhead splitting repos |

### 3.3 Resolution

**Open protocol, closed platform.** Concretely:

| Surface | License | Repo posture |
|---------|---------|--------------|
| AgentCard schema + extensions | **Apache-2.0** | Public, contributed upstream to A2A |
| Policy bundle spec (SINT-style) | **Apache-2.0** | Public, contributed to relevant WG |
| Eval-harness manifest format | **Apache-2.0** | Public |
| SDKs (TS, Py, Go, Rust) | **MIT** | Public, on GitHub |
| Smart contracts (ERC-8004 build, escrow, dispute hooks) | **Apache-2.0** | Public, audited, with reproducible build |
| `x-agent-trust` header reference impl | **Apache-2.0** | Public |
| Indexer (commerce + attestation) | **Closed** (consider BSL-1.1 → Apache-2 in 4 yrs) | Private |
| Web app + dispute console | **Closed** | Private |
| KYC / sanctions integrations | **Closed** | Private |
| Curation rules + red-team eval sets | **Closed** (proprietary) | Private |
| Internal benchmark harnesses | **Closed** | Private |

Rationale:

- The protocol layer is **table stakes** — defensibility lives in curation, evals, dispute ops, and the reputation graph (per the defensibility analysis in `03-business-strategy.md`).
- Open SDKs and contracts give us credible neutrality and the right to argue for inclusion in AAIF / W3C / ERC working groups.
- Closed indexer, web app, and curation rules protect the operational moat without leaking commercial work.
- We **hold BSL-1.1 in reserve** for the indexer if a well-funded competitor forks the open contracts and tries to free-ride; we do not start there because it would muddy the neutrality narrative on day one.

### 3.4 Downstream implications

- Repo strategy is set: a public `marketplace-protocol` monorepo, separate private platform repos.
- Engineering onboarding includes an explicit OSS-vs-closed boundary review per feature.
- Legal: a CLA for outside contributors to the public repos; license-header lint in CI.
- Standards engagement (decision 6) becomes credible — we are not asking AAIF to bless private specs.

### 3.5 Revisit triggers

- A well-funded competitor forks the open contracts and ships a hostile clone with material adoption.
- A standards body (AAIF, W3C, EF) requires deeper code-level contribution as a condition of stewardship.
- An enterprise customer makes contract approval contingent on full source availability — at which point we offer **source-available under NDA** rather than re-licensing.

---

## 4. Vertical at launch

### 4.1 Question

To break the two-sided cold-start, do we verticalize at launch (and on which vertical) or stay horizontal and rely on generic discovery?

### 4.2 Options

| Vertical | Seller readiness | Buyer maturity | Compliance load | Cold-start velocity |
|----------|------------------|----------------|-----------------|---------------------|
| **Dev-tool agents** (code review, refactor, doc-gen, test-gen) | High — many shipped agents already in production | High — developers tolerate alpha UX, already pay for tooling | Low | Fast |
| **Sales-development agents** (research, outreach, qualification) | Medium — many builders, fewer production-grade | Medium — sales orgs are buyers but procurement-heavy | Medium (lead-data privacy, CAN-SPAM, GDPR) | Medium |
| **Data / knowledge agents** (datasets, embeddings, RAG corpora) | Medium — licensing infrastructure not yet standard | Low at MVP — enterprise data deals are slow | High (license enforcement, watermarking, IP) | Slow |
| **Horizontal** | N/A | N/A | High (everything everywhere) | Slow — collapses to keyword search |

### 4.3 Resolution

**Developer-tooling agents are the launch vertical.** Sales-development agents are queued as the **second wedge** about six months post-MVP. Data / knowledge agents are a **post-Series-A** expansion.

Why dev-tooling:

- **Seller velocity** — production-grade code agents are shipping today (Codex, Claude Code, Cursor agents, dozens of OSS frameworks). 50 curated sellers in 8 weeks is realistic.
- **Buyer tolerance** — developers will accept alpha UX, debug protocols themselves, and report bugs constructively. They are also already paying for AI tooling.
- **Distribution channels** — GitHub, VS Code, Cursor, npm, Hacker News, dev Twitter / X — all are addressable cheaply.
- **Composition density** — code agents naturally chain (lint → refactor → test → review). Multi-agent calls are common, which exercises the delegation chain and AP2 mandate plumbing.
- **Low compliance overhead** — no PHI, no PII at scale, no financial-services regulator, no medical-board approvals. We can ship without HIPAA / SOC 2 in the first six months.
- **Honest benchmark base** — SWE-Bench, RepoBench, HumanEval, and adjacent harnesses give us a reputable scaffold for the neutral eval harness on day one.

Why **not** sales-development first:

- Lead-data privacy + CAN-SPAM + GDPR are immediate compliance work, not optional.
- Buyer procurement cycles are slow and enterprise-gated.
- Outreach quality is harder to evaluate neutrally than code-review quality, weakening the eval-harness wedge in launch month.

Why **not** data agents:

- License enforcement infrastructure (watermarking, derivative-use tracking, royalty splits) is not yet standardized and would consume the first 12 months on its own.
- Buyers are large enterprises with bespoke procurement — no cold-start velocity.

### 4.4 Downstream implications

- The MVP curation board is built from the **dev-tool seller list**; the first 50 sellers are personally onboarded.
- Eval harness ships with **SWE-Bench + RepoBench + HumanEval + an internal code-review red-team set** as the default benchmarks.
- Marketing motion is **developer marketing** (technical content, OSS, conference talks, GitHub presence), not enterprise sales.
- Two SDR-vertical seller commitments are pre-arranged for month 7 so the second-wedge launch is not from zero.

### 4.5 Revisit triggers

- A competitor verticalizes on dev-tooling 6 months ahead of us with credible curation.
- A regulator targets dev-tool agents specifically (unlikely but tracked).
- An enterprise sale of significant size from outside the dev vertical pulls the roadmap forward.

---

## 5. Eval partner posture

### 5.1 Question

Run our own benchmarks end-to-end, or partner with HELM / OpenAI Evals / lm-eval-harness / EleutherAI?

### 5.2 Options

| Option | For | Against |
|--------|-----|---------|
| **Run our own only** | Maximum control of methodology, narrative, and IP | Slow to credibility — buyers don't trust new harnesses; massive scope |
| **Partner only** | Instant credibility (HELM, lm-eval-harness, OpenAI Evals carry real signal) | No proprietary moat; we are an aggregator of someone else's work |
| **Hybrid — partner + own** | Borrow credibility on reference suites; build moat on orchestration + domain red-teams | Higher engineering cost; methodological responsibility for both |

### 5.3 Resolution

**Hybrid.** The strategy has three layers:

1. **Reference suites (partnered)** — HELM, lm-eval-harness, OpenAI Evals, SWE-Bench, RepoBench, HumanEval. We **wrap, run, and publish** results in a reproducible harness. We do **not** modify the underlying benchmarks; we report them faithfully. This is what gets us trust on day one.
2. **Domain harnesses (proprietary)** — internal code-review red-team sets, prompt-injection stress tests, license-leak detection, doc-gen factuality probes, refactor regression suites. These are what buyers cannot get anywhere else and form the eval moat.
3. **Orchestration layer (proprietary, but partly open)** — **signed, reproducible runs** anchored to ERC-8004 reputation, with content-addressed inputs, sealed traces, attested execution receipts. The **manifest format is OSS** (per decision 3) so anyone can run a benchmark against any registered agent and produce a verifiable result; the **orchestrator and the curated benchmark catalog are closed.**

This gives us:

- Day-one buyer trust via reference suites.
- A real moat via domain red-teams that competitors must rebuild.
- An infrastructure story (signed + reproducible + anchored on-chain) that big-rail competitors cannot match without re-architecting their evaluation stack.

### 5.4 Downstream implications

- Eval harness ships in MVP weeks 8–10 (per `02-mvp-blueprint.md`) with at least one reference suite (SWE-Bench) and one proprietary red-team set.
- We engage HELM / EleutherAI for **technical liaison** (not commercial partnership) to ensure faithful execution.
- Eval results are stored as **signed Verifiable Credentials** with a hash of the harness manifest, the seed, the agent version, and the eval logs.
- A small "Eval Council" of 2–3 independent reviewers signs off on methodology updates quarterly. This is governance, not engineering.

### 5.5 Revisit triggers

- HELM or OpenAI Evals shifts to a non-permissive license or restricts third-party hosting.
- A competitor establishes a more credible neutral eval brand and we have to acquire or partner aggressively.
- A proprietary harness produces a result that we cannot defend methodologically — at which point we publish the methodology and let it become a reference suite.

---

## 6. AAIF affiliation

### 6.1 Question

Apply to AAIF (the Agentic AI / standards foundation referenced in the plan) as a project, or stay independent and contribute back informally?

### 6.2 Options

| Option | For | Against |
|--------|-----|---------|
| **Apply as a project member** | Direct seat at the table on standards evolution; reputational halo; credible neutrality narrative; access to working-group drafts pre-publication | Membership cost (fees + FTE time); some governance overhead; perceived alignment may be a constraint with non-AAIF buyers |
| **Stay independent + contribute back** | Maximum freedom; no fees; no governance constraints | No seat at the table; later to specs; weaker neutrality story; no shared brand |
| **Both — stay independent commercially, contribute as a project member** | Best of both worlds | Requires explicit internal discipline to avoid commercial entanglement |

### 6.3 Resolution

**Apply as a project member after seed close. Stay commercially independent.**

Concretely:

- **Apply in month 2–3 post-seed**, once the contracts and AgentCard schema work is mature enough to contribute usefully. Applying before that is performative.
- **Allocate 0.5 FTE** explicitly to upstream standards work — in practice, the protocol-engineering lead splits their week between our public repos and AAIF working groups.
- **Sign the AAIF code-of-conduct + IP framework**, but do **not** route product roadmap decisions through the foundation. The marketplace is a venue, not a standards body.
- **Public contributions accumulate in the public protocol repo** (per decision 3); commercial differentiation stays in the closed platform.
- **Mirror Cloudflare's IETF posture** — visible, generous contributor; uncompromised commercial entity.

Why apply rather than stay independent:

- Standards stewardship is a **real, if positioning-only, moat** (per `03-business-strategy.md`).
- The cost (membership + 0.5 FTE) is small relative to the optionality of being at the table when ERC-8004, ERC-8126, AP2, and A2A iterate.
- Buyer procurement decks read better with an AAIF affiliation than without.
- The standards body's structural inability to compete commercially (per the incumbent-threat analysis) means **affiliation is upside-only** for us strategically.

Why not stay independent and contribute back informally:

- "Informal contribution" decays — without an institutional commitment, the FTE never quite ships the PR.
- We lose the right to call ourselves a neutral participant in standards work.
- The window where AAIF is shaping the foundational specs is small; missing it costs years.

### 6.4 Downstream implications

- Hiring spec includes "comfortable representing the company in AAIF / W3C / ERC working groups" for the protocol-engineering lead.
- Q3 of year 1 has a budgeted line item for AAIF membership fees and travel to working-group meetings.
- A small **standards-engagement charter** lives alongside the engineering README — what we will and will not commit to in AAIF, who can speak for the company in a working group, conflict-of-interest rules.

### 6.5 Revisit triggers

- AAIF governance shifts in a way that materially constrains commercial participants (e.g. a non-commercial-use rider).
- A competing standards body emerges with more practical weight, at which point we evaluate dual membership.
- Our 0.5 FTE allocation is consistently overrun (signal that we should hire a dedicated standards lead).

---

## 7. Decisions → implementation impact

The six resolutions above flow into the MVP plan as follows. This table is the contract between this decision memo and `02-mvp-blueprint.md`.

| Decision | First file / surface touched | First week |
|----------|------------------------------|------------|
| Base as primary chain | Foundry project scaffold; `ChainAdapter` interface; x402 facilitator config | Week 1 |
| Privy default + smart-account export | Web app wallet hook; SDK signer interface | Week 2 |
| Open-protocol, closed-platform repo split | Public `marketplace-protocol` repo + license headers; private platform repos | Week 1 |
| Dev-tooling vertical | Curated-seller pipeline (50 sellers); SWE-Bench / RepoBench in the eval harness | Weeks 1–8 |
| Hybrid eval harness | Reference-suite wrappers (SWE-Bench first); one proprietary red-team set; signed-VC result format | Weeks 8–10 |
| AAIF apply post-seed | Standards-engagement charter; protocol-lead JD update; budget line for fees | Month 2 |

---

## 8. What we explicitly did *not* decide here

These remain open and are explicitly **deferred** to later memos so we do not pretend to more certainty than we have:

- **Pricing curve** — the 5–10 % take-rate range is set; the precise rate, segmented by transaction size and vertical, requires real settlement data.
- **Insurance carrier choice** — which underwriter (if any) backs the catastrophic-failure pool. Defer until first-loss data exists.
- **Dispute arbitrator pool composition** — human-only at MVP; the mix of human + automated + DAO-style at scale is a year-2 question.
- **Reputation scoring weights** — receipt count, dispute outcomes, eval results, age, KYC tier. The functional form will be tuned against the first 90 days of live data.
- **Knowledge-exchange license schema** — defer to post-MVP; cataloged in the feature backlog.

These are listed so that future contributors do not assume silence equals resolution.

---

**Status.** This memo closes plan section 15. The six decisions are binding for MVP design and engineering scope. Changes to any of these decisions require an explicit follow-up memo in `/docs/` and an update to the trigger-conditions section above.
