gate:frozen-paths       composer/ branch editing a frozen path -> FAIL ("ESCALATE TO OPUS")
gate:no-new-decisions   new exported symbol/dep/table/env without a valid Spec: trailer -> FAIL
gate:has-arch-grade     spec/contract PR without .grades/<id>-arch.md (all criteria>=7) -> FAIL
gate:has-review         code PR without .reviews/<id>.md (no P0/P1) -> FAIL
gate:tests              vitest not green -> FAIL
gate:coverage           core/+shared/ below thresholds (lines/branches/fns/stmts 80) -> FAIL
gate:e2e                Playwright health heartbeat not green -> FAIL
gate:build              pnpm build not green -> FAIL
gate:typecheck/lint     not green -> FAIL
