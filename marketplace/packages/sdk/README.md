# @t/sdk

Typed HTTP client for the Trillion API (`openapi-fetch` + `openapi-typescript`).

## Regenerating types (`sdk:gen`)

Source of truth is the live API OpenAPI document:

1. Start the API: `pnpm --filter @t/api dev`
2. Snapshot the spec: `curl -s "$API_BASE_URL/openapi.json" -o packages/sdk/openapi.json`
3. Regenerate types: `pnpm --filter @t/sdk sdk:gen` (or `pnpm sdk:gen` from this directory)

`src/generated/schema.d.ts` is produced by step 3 and must not be edited by hand.
