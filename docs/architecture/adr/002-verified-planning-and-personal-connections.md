# ADR-002: Verified planning and request-local personal connections

- Status: accepted for this local implementation, with the user's scope revisions; independent PR review remains pending.
- Date: 2026-11-16, Asia/Hong_Kong.
- Sources: the execution and 18-case test plan shown before implementation; the user's response to its approval question, requesting project work without the five-person report, personal Canvas token input and personal AI keys/quotas.
- Supersedes: ADR-001 only where it limited all credentials to deployment environment variables or left Canvas mapping unimplemented. The deterministic/advisory authority split remains binding.

## Decision and contracts

Keep the baseline modules and public planner contract. Place application source under `src/app` and `src/lib` to meet D8; the existing framework components, hooks and database helper also live under `src/`. Use explicit Hong Kong calendar arithmetic and a fixed-clock option for testing. Merge availability, prohibit past starts, enforce exact deadlines, preserve breaks and account for unscheduled effort.

`parseAppData` is the common allowlist for forms, restoration, imports and the plan API. It validates identifiers, dates, effort, states, references and time windows. Backups contain validated study facts only. Imports are previewed and confirmed. Canvas merges retain user effort and priority while source deadlines and submission state update.

`POST /api/plan` accepts study facts plus an optional `ai` configuration: `rules`, `personal` or `server`. Personal mode selects a fixed supported provider, model and request-local API key, and never borrows server quota. No AI request is made for rules or an empty workload. AI output may replace only a bounded summary and exactly three suggestions. Errors preserve the deterministic plan and expose safe status codes, never provider response bodies.

`POST /api/canvas` supports `verify` and `sync`. It makes only current-user read requests to an operator allowlist, with bounded pages, counts, time, response sizes and same-collection pagination. Source profile identifiers become a pseudonymous workspace hash. The browser chooses that identity's local workspace and confirms imported records before applying them. Switching identity invalidates outstanding requests.

## Personal credential lifecycle

The user explicitly requested per-user keys. Keys are entered into masked fields and kept only in the current React page session, then sent in the body of a same-origin request over HTTPS (localhost development is the browser's local exception). The server uses them only within the current request. Keys are never in URLs, localStorage, sessionStorage, cookies, backups, server databases, logs or responses. Successful Canvas connection clears its input; disconnect clears both connections and returns to the manual workspace. Reload requires re-entry. No shared cache or process-global credential state exists.

This updates credential handling and retention deliberately; it is not an exception hidden in UI code. It does not permit the coding agent to inspect real credentials or production records. Only synthetic secrets are used in tests.

## Canvas policy boundary

Canvas explicitly says manual tokens are for testing and multi-user applications must use OAuth. Therefore personal-token access is labelled self-testing, enabled in development, and disabled in production unless the operator explicitly enables controlled testing. The implementation does not claim OAuth login or a university approval it does not have. Formal multi-user deployment requires a scoped Developer Key, approved redirect and a separately reviewed server-side token/session design.

Source: [Canvas OAuth2 Overview, Manual Token Generation](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth#manual-token-generation).

## AI context and budgeting

The always-present system layer declares adviser identity, untrusted inputs, no credential requests, no schedule authority, alias-only references and output structure. The fact layer uses Task N / Course N aliases, deadlines, effort and status. Free-text goals become fixed preference categories; raw course names, assignment titles, student identity and tokens are omitted. Context has an enforced byte cap; lower-priority tasks can be omitted with an explicit count. Do not claim exact tokenizer accounting without a tokenizer. Critical constraints are never compacted or dropped.

## Alternatives and consequences

- Persistent per-user credential vault: rejected for this slice because it needs authentication, encryption-key management, retention and deletion infrastructure.
- Browser localStorage for keys: rejected because persistence is unnecessary and expands exposure.
- Direct browser calls to third-party APIs: rejected because credentials and CORS/error behavior would bypass the controlled server boundary.
- Arbitrary AI endpoints: rejected because a browser-controlled endpoint could turn the server into a credential-bearing network proxy. Supported provider presets are fixed.
- LLM-generated schedules: rejected; exact temporal safety remains deterministic.

Users re-enter keys after refresh. Device-local workspaces do not provide cloud account authentication or cross-device synchronization. A public shared server should disable server AI or place it behind deployment authentication, configure rate limits, and use approved Canvas OAuth before advertising shared production readiness.

## Verification and reopening

Trace to FR-001..010, INV-001..006, SEC-001/002, PRIV-001/002, COST-001, QA-001/002 and GOV-001. The previously presented tests cover temporal negatives, backup rejection, request-only credentials, provider boundaries, isolation, malicious output, offline fallback and fixed evaluation. The old planner failed nine new scenarios before fixes. Record actual green results in the review memo; do not manufacture teammate approval.

Reopen this ADR for persistent keys, cloud accounts, arbitrary endpoints, model schedule authority, new dependencies or approved production Canvas OAuth. A failed safety test blocks dependent implementation and release; restore the preceding verified module or disable the affected external adapter.
