# Invariant Register

ADR-002 updates the original credential-location rule to allow user-entered keys only in page memory and the current request. It preserves deterministic schedule authority. Each fallback below is a concrete operational action, not permission to weaken a test.

## INV-001: availability containment

- **Statement/source:** no study block may escape the union of user availability; requirement INV-001.
- **Enforcer:** merged weekly windows in `src/lib/planner.ts` and shared input validation in `src/lib/data.ts`.
- **Verification:** `test/offline/planner.test.mjs` covers narrow, absent, invalid, repeated and overlapping windows, plus breaks across separate slots.
- **Fallback:** leave the unplaceable effort unscheduled and display remaining hours; never extend the slot or silently create free time.

## INV-002: AI is advisory

- **Statement/source:** runtime AI cannot create tasks, alter source deadlines or replace schedule blocks; requirement INV-002.
- **Enforcer:** rule-first `generateStudyPlan`, strict `parseAiAdvice`, task-reference bounds and advisory-only merge in `src/lib/ai.ts`; `src/app/api/plan/route.ts` validates input.
- **Verification:** provider tests and fixed evaluation reject extra plan/task fields, invalid references, malformed/truncated output and credential reflection, and compare returned blocks with the deterministic result.
- **Fallback:** discard model advice, return the intact rule result and a safe `invalid-response`, `timeout` or `unavailable` status. A real-model failure is not counted as successful AI validation.

## INV-003: no school password handling

- **Statement/source:** the application never requests, stores or transmits a CityUHK EID password; requirement INV-003.
- **Enforcer:** the connections UI accepts labelled API credentials, never a school login/password pair; Canvas personal-token self-testing policy and production default disablement are enforced by the Canvas API boundary.
- **Verification:** API tests check production disablement and safe errors; static permission checks and browser review inspect credential labels and intended flows. A masked API-key field is not an EID password field.
- **Fallback:** disable the unsupported connection and preserve manual entry, synthetic fixtures and backup import. Formal shared Canvas access requires approved OAuth.

## INV-004: request-only user credentials

- **Statement/source:** user-supplied provider credentials exist only in page memory/current request; never in persistent storage, URLs, backups, logs or responses; requirement SEC-001 and ADR-002. INV-004 is this register's enforcement label, not a separate registry requirement.
- **Enforcer:** separate connection state in `src/app/page.tsx`; allowlisted `AppData`/backup serialization; request-local provider adapters; bounded safe API errors and private no-store headers.
- **Verification:** `test/offline/data.test.mjs`, `providers.test.mjs`, `api.test.mjs` and structural checks cover backup exclusion, safe error responses, malicious credential reflection and concurrent key isolation. Browser verification covers refresh, disconnect and identity switching.
- **Fallback:** clear the affected page connection, disable external requests and retain rule planning. If a persistent exposure is found, block release and remove the persistence path; never print the exposed value in evidence.

## INV-005: no silent workload loss

- **Statement/source:** valid active effort is either scheduled or explicitly reported as unscheduled; FR-004 and QA-001. INV-005 is this register's enforcement label.
- **Enforcer:** integer-minute remaining-work calculation and warning collection in `src/lib/planner.ts`.
- **Verification:** capacity, overdue, invalid-task, quarter-hour tail and effort-conservation cases in `test/offline/planner.test.mjs`.
- **Fallback:** show precise remaining effort or invalid-record warnings and require a user change to availability, remaining work or task facts. Do not force overdue work into a false valid block.

## INV-006: current, non-overlapping, deadline-safe time

- **Statement/source:** no block starts in the past, overlaps another block or ends after its exact task deadline; requirement INV-006.
- **Enforcer:** Hong Kong time helpers, explicit planning clock, merged sorted windows, exact deadline clipping and cross-window break tracking in `src/lib/planner.ts` / `src/lib/time.ts`.
- **Verification:** frozen-clock morning/evening deadlines, partial current minutes, overlapping/adjacent windows, horizon boundaries and UTC/US-host equivalence tests.
- **Fallback:** reject an invalid clock or leave infeasible effort unscheduled. A failed temporal invariant blocks dependent release until corrected and reverified.

## External-destination and isolation constraints

SEC-002 enforces fixed approved HTTPS providers, redirects disabled, same-collection Canvas pagination, body/page/request/time limits and safe response errors. Unsafe destinations fail before a credential-bearing fetch. Tests use synthetic tokens and adversarial links.

PRIV-001 limits AI context to aliases and planning facts; raw names, titles, IDs, goal text and credentials are omitted. PRIV-002 separates Canvas local workspaces and clears transient credentials on disconnect/identity switch. A late async result from an earlier workspace is ignored. Failures preserve existing confirmed local data instead of applying a partial or cross-workspace import.
