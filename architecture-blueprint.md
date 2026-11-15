# Architecture Blueprint

## Scope and drivers

StudyPilot converts confirmed study facts into a deterministic seven-day plan in Hong Kong time and optional AI advice. The implemented slice includes complete course/task editing, weekly availability, device-local workspaces, versioned backup restoration, iCalendar export, fixed-provider personal AI keys, optional operator AI, and previewed Canvas data import with controlled personal-token self-testing.

Primary drivers are exact deadline integrity, privacy, quota ownership, graceful degradation, auditable human supervision, bounded external access and independent offline verification. Formal shared Canvas OAuth, cloud accounts, cross-device synchronization and persistent credential storage are outside this implemented slice. The team report, personal reflections and contribution material are deferred by the user's current project-only instruction.

ADR-002 records the approved local scope revision and credential lifecycle. It supersedes the former deployment-secret-only restriction without changing AI's advisory authority. Source modules and reusable components are organized under `src/` to match D8; this is a directory migration, not a replacement of the baseline interfaces.

## Components and integration contracts

1. **Web workspace — `src/app/page.tsx`.** Collects user facts, supports editing/filtering, shows validation and stale-plan feedback, holds transient connection credentials and confirms imports. It uses `parseAppData` before saving. Initial rendering is stable; storage and current time are restored after mount.
2. **Study-data boundary — `src/lib/data.ts`.** Defines validated `AppData`: courses, assignments, availability and weekly goal. Unknown fields are stripped, references and identifiers are checked, and backups serialize only these facts. It also handles confirmed Canvas merges and validated calendar export.
3. **Time and schedule — `src/lib/time.ts`, `src/lib/planner.ts`.** The pure `generateRulePlan(assignments, courses, availability, {now?})` contract calculates blocks and warnings. Hong Kong calendar arithmetic, merged time windows, exact deadlines, current-time cutoff, breaks and remaining-effort reporting are authoritative. These modules have no network, storage or credential access.
4. **AI boundary — `src/lib/ai.ts`, `src/app/api/plan/route.ts`.** The API validates facts plus optional `ai` configuration. `generateStudyPlan` first calculates the rule result, then makes at most one supported-provider request. `parseAiAdvice` accepts only a nonempty bounded summary and exactly three bounded suggestions. AI output cannot replace blocks or tasks.
5. **Canvas mapping — `src/lib/canvas-data.ts`.** Normalizes explicit source facts into the existing course and assignment types. Missing deadlines are warned and skipped. Source identifiers produce stable records; confirmed repeated merges preserve user effort/priority while refreshing source deadlines and submission state.
6. **Canvas network boundary — `src/lib/canvas.ts`, `src/app/api/canvas/route.ts`.** Supports current-user `verify` and `sync` actions only. The adapter reads `/api/v1/users/self`, active student courses and their assignments with own-submission data. It returns a pseudonymous workspace identity and normalized records for preview. Personal-token self-testing is disabled by default in production.
7. **Provider safeguards — `src/lib/provider-security.ts`.** Constrains approved HTTPS destinations, same-origin browser calls, no redirects, bounded JSON bodies, credential syntax, private response headers and same-collection Canvas pagination.
8. **Verification pipeline — `scripts/`, `test/`, `.github/workflows/ci.yml`.** Enforces schema, static and dependency checks, independent test-approval evidence, regression, fixed AI-boundary evaluation and AI-use log updates. Dedicated live evaluation remains separate and explicitly enabled.

`src/components`, `src/hooks` and `src/db` contain the existing reusable UI, hooks and unused database scaffold. No database credential vault or cloud login is implied by the scaffold.

## Authority and trust boundaries

User-entered facts and Canvas facts are authoritative after validation and user import confirmation. The rule planner alone creates schedule blocks. Runtime AI is advisory: it may replace only summary/suggestions, cannot call tools, write Canvas data, alter a deadline, or access credentials beyond the selected API authentication header.

Browser input, Canvas text and model output are untrusted. Data schemas, response parsing and deterministic code constrain them. The server receives study facts to calculate the schedule; the AI provider receives a smaller alias-only context. Course names, task titles, source identifiers and raw free-text goals do not cross the AI-provider boundary.

Personal key mode never falls back to operator credentials. A personal provider failure returns a rule result and safe status. Server AI is a separate explicitly selected mode; rules-only is the default and consumes no AI quota.

## Credential and identity lifecycle

User-supplied keys exist only in current page memory and the current same-origin request. They are not stored in AppData, browser storage, cookies, backups, URLs, server databases or process-global caches. They are not logged or returned in API responses. Successful Canvas connection clears the visible input; refresh requires key re-entry. Disconnect clears both connection configurations and returns to the manual workspace.

All non-local credential requests require HTTPS. The server applies no-store/private response headers and uses no-store outbound requests. Deployment operators must keep reverse-proxy/body logging from collecting credentials; application checks are not a promise about infrastructure outside this repository.

Canvas identities are hashes of the approved service origin and current-user ID. Each hash selects its own device-local workspace. Switching identity aborts or invalidates older generation/sync/import work, clears the previous AI key and resets transient UI state. This provides application-level local workspace separation, not a cloud authentication service or protection against another person controlling the same browser profile.

Canvas official policy reserves manually generated tokens for self-testing and requires OAuth for applications used by others. Production personal-token testing therefore requires an explicit operator opt-in for a controlled scope. A shared production release needs approved OAuth and a separately reviewed authenticated server-side token/session design. See [Canvas OAuth overview](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth#manual-token-generation).

## Runtime AI context layers and assembly

Each independent call contains:

1. **Identity and standing constraints:** adviser identity, untrusted-input rules, no credentials, no invented tasks or schedule, alias references and the JSON output contract. The full system layer is re-injected on every call.
2. **Retrieved planning facts:** active tasks sorted by deadline, Task N/Course N aliases, deadline, remaining effort, priority and status. Raw source text and identity are omitted.
3. **Preferences and capacity:** free-text goals map to fixed categories such as exam preparation and balanced workload; availability is represented as the union's total hours.
4. **Current task:** return the specified summary and exactly three suggestions. There is no conversation history, resumable model state or tool loop to restore.

The assembler retains nearer deadlines within a conservative byte budget and reports the number omitted. Facts are limited to approximately 3,000 UTF-8 bytes (with a lower assembly threshold to reserve metadata), plus a system layer below 1,000 bytes. This is the implemented conservative budget corresponding to the planned 4,000-token envelope; it is **not exact tokenizer accounting or measured provider usage**. Critical constraints are never compacted. The deterministic planner continues to inspect every valid task even when some are omitted from advice context.

## State, retention and failure behavior

Validated study facts survive browser reloads in versioned, user-owned local storage. Connection credentials, profile display name, import preview and generated plan do not persist. The application does not promise a fixed server-side retention period because this slice creates no server-side study-data store. Local data lasts until the user removes imported data or clears the browser/site storage; downloading a backup creates a separately user-managed copy.

Malformed state is reported and retained for possible recovery instead of silently claimed as restored. Invalid backup files are rejected before applying a replacement. Every input change invalidates the current plan. Provider failure preserves manual planning and confirmed study data. See the memory design and runtime policy catalog for exact paths.

## Verification, supervision and evidence

The supervised coding workflow reads `AGENTS.md`, architecture and requirements, presents a traceable plan/test plan, obtains human approval, implements the bounded scope, and records verification and interventions. Safety changes require an ADR. The current user's approval with scope revisions is recorded honestly; it is not a fabricated independent GitHub review.

The offline suites use fixed clocks, synthetic credentials, injected provider responses and positive/negative cases. Fixed evaluation checks parsing, privacy, injection containment, task-reference bounds and unchanged authority. It is not real-model quality evidence. Live AI/Canvas tests require explicit opt-in and dedicated authorised credentials; no credential or raw course data is printed. A release claiming live integration needs actual live evidence for its selected commit and human quality review.

Observable product evidence is the result source, safe AI status, generated timestamp, unscheduled warnings, validation messages and import outcome. There is no implemented centralized request-ID/latency telemetry service; do not cite one as completed. Review evidence records actual command outcomes and browser acceptance only after execution.

## Permissions and change policy

Agents and runtime actors follow the explicit allowlists in the permission model, `.opencode/permissions.jsonc` and tool manifest. Credential files, human-only policy and production data remain denied to the coding agent. Passing local checks does not enable remote branch protection or substitute for human review.

Reopen ADR-002 for persistent keys, cloud identity/storage, unrestricted endpoints, model schedule authority, new external dependencies or formal OAuth activation. Failed invariants block dependent release; restore the previous verified module or disable the affected external adapter while preserving local data. Required GitHub branch protection, independent reviews and protected live-evaluation environments must be configured and verified separately.
