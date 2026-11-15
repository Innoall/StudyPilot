# Permission Model

Default for coding-agent roles is no file read, write or network access outside explicit allowlists. Runtime application permissions are described separately from coding tools; accepting a user key in the application does not authorise a coding agent to read real keys.

## Runtime actors

- **Browser workspace — `src/app/page.tsx`:** may read/write its validated local study workspace, hold user-entered connection settings in page memory, and call same-origin `/api/plan` and `/api/canvas`. It may not obtain operator environment secrets, persist keys, or read another cloud user's state. Canvas hash workspaces separate local data but do not supply cloud authentication.
- **Rule planner — `src/lib/planner.ts` and `src/lib/time.ts`:** may read normalized in-memory facts and an explicit clock, and return blocks/warnings. Network, storage, environment credentials and AI authority are denied.
- **Data boundary — `src/lib/data.ts` and `src/lib/canvas-data.ts`:** may validate/normalize passed records and create backup/calendar text. It cannot contact providers or read credentials. Caller confirmation is required before applying replacement or Canvas merge.
- **AI adapter — `src/lib/ai.ts`:** may use the selected request-local key or explicitly chosen operator configuration for one fixed-provider HTTPS chat request. Its context consists only of aliases, task timing/effort/status, aggregate capacity and fixed preference categories. Raw source text/identities, Canvas credentials, tools and schedule writes are denied.
- **Canvas adapter — `src/lib/canvas.ts`:** may use the requesting user's token for approved-host HTTPS GET requests to current-user profile, active student courses and their assignments/own-submission facts. It cannot submit work, alter grades, mutate courses, access arbitrary URLs, follow redirects, or persist credentials. Personal-token access is controlled self-testing and is disabled by default in production.
- **Operator configuration:** may set explicit Canvas host allowlists and separate server AI configuration, plus deliberately opt into controlled production self-testing. This is not an OAuth approval or a cloud login system. Public shared quota needs deployment authentication and operational limits outside the current app.

## Coding-agent roles and file boundaries

`AGENTS.md`, the static build prompt, the tool manifest and `.opencode/permissions.jsonc` are the executable/configuration entry points. Current source lives under `src/`; legacy `app/**` and `lib/**` entries in the JSONC exist only for baseline compatibility, not as duplicate active source.

- **Planner:** repository read/search of `AGENTS.md`, `Prompt.md`, the architecture blueprint, `docs/**`, declared source/interfaces, tests and package manifests. No writes, secret reads or production-data access.
- **Builder:** approved scoped edits in `src/**`, `test/**`, `docs/**`, `prompts/**` and `README.md`; scripts, package manifests and workflow changes require the explicit approved engineering scope and review. No undeclared dependencies or external actions.
- **Verifier:** reads declared source, tests, requirements, schemas and governance; may execute local checks and write generated verification reports. It does not use real provider accounts for ordinary offline tests.
- **Release manager:** may review repository and release evidence; remote settings, publishing and live-provider actions require appropriate human authorization and configured protected environments. Missing evidence cannot be replaced with a self-signed status.

All roles are denied `.env*` values, credential stores, `production-data/**`, real passwords/tokens/keys and writes to the human-only `.opencode/rules.md`. Descriptive role permissions and JSONC rules must be enforced by the actual coding environment; committing a manifest alone does not prove a tool is restricted. The current work uses synthetic credentials in tests and does not delegate real key inspection to an agent.

## Safety-critical review paths

`src/app/api/**`, `src/lib/planner.ts`, `src/lib/ai.ts`, `src/lib/canvas.ts`, `src/lib/canvas-data.ts`, `src/lib/provider-security.ts`, schema/credential handling, prompts, verification scripts, workflow files, architecture and permission policies require human review. Credential retention, external destinations, OAuth, AI authority or planner invariants require an ADR and updated positive/negative evidence.

Branch protection and code-owner/reviewer rules must be configured on GitHub. Current local code and tests do not assert those remote settings are enabled. The CI approval gate retrieves actual independent review evidence rather than trusting an editable JSON `approved` flag.
