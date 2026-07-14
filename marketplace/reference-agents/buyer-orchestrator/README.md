# buyer-orchestrator (P2 reference agent stub)

P0 placeholder for the buyer-side reference agent.

## P2 contract (planned)

- Registers as a buyer agent in `@t/core` registry.
- Discovers seller listings via `@t/core` discovery and composes multi-step jobs.
- Emits orchestration events through the worker `EventEnvelope` convention.
- No real orchestration logic in P0 — implementation lands in P2.
