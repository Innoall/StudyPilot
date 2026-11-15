# Trace Matrix

Registry: `docs/req/requirements.yaml`, version 0.2.0, 23 entries. Paths below refer to current `src/` modules. This matrix maps evidence; it does not mark pending browser/live/remote checks as passed. Actual run results belong in the review memo.

The completed 2026-11-16 local test/build and 13-scenario browser run is documented in `docs/validation-evidence.md`. Canvas isolation in that browser run used synthetic intercepted responses; six live tests skipped. This distinction applies to the evidence rows below.

| Requirement | Enforcing component | Test or evidence | Runtime signal / verification limit |
|---|---|---|---|
| FR-001 | `src/app/page.tsx`, `src/lib/data.ts` | `test/offline/data.test.mjs`; browser create/edit/delete and cascade confirmation | Validation message and confirmed edit; browser acceptance recorded separately |
| FR-002 | Workspace task forms, `src/lib/data.ts`, `src/lib/time.ts` | `data.test.mjs`, `time.test.mjs`; browser CRUD/status/filter scenarios | Safe field error, updated task and stale-plan flag |
| FR-003 | Availability editor, validated local persistence | `data.test.mjs`; browser save/reload and weekday edits | Save/recovery/storage error; full browser acceptance separate |
| FR-004 | `src/lib/planner.ts` | `test/offline/planner.test.mjs` | Scheduled blocks and remaining-effort warnings |
| FR-005 | `src/lib/ai.ts`, `/api/plan` | `providers.test.mjs`, `api.test.mjs`, `test/evaluation`, opt-in `test/live/provider.test.mjs` | `source` / `aiStatus`; live success not inferred from mock responses |
| FR-006 | `src/lib/canvas.ts`, `canvas-data.ts`, `data.ts`, `/api/canvas`, import preview | `providers.test.mjs`, `data.test.mjs`, opt-in `test/live/canvas.test.mjs`; browser import | Safe sync status, warnings, preview; real account verification is opt-in |
| INV-001 | Planner merged-window loop | Narrow/absent/overlap containment tests in `planner.test.mjs` | Unscheduled warning instead of availability overflow |
| INV-002 | Strict AI parser and advisory-only merge | Provider negatives and fixed malicious-output evaluation | Invalid advice discarded; rule blocks unchanged |
| INV-003 | Explicit API-key/token UI, production Canvas self-test switch | API production-disable test; static and browser credential-flow review | Unsupported token connection disabled; no EID login flow |
| SEC-001 | Separate page connection state, AppData allowlist, request-local adapters, private API headers | `data.test.mjs`, `providers.test.mjs`, `api.test.mjs`, `verify-structure.mjs`; browser disconnect/refresh | Safe errors, no persistent key fields, key clearing; deployment logs need operator control |
| PRIV-001 | `buildAiContext` in `src/lib/ai.ts` | Payload/goal/byte-budget tests and fixed privacy evaluation | Alias-only context; omitted-task count warning |
| QA-001 | Rule-first server result and local fallback | Rule/planning/provider/API regression tests; offline browser planning | Rule-engine source remains usable during provider failure |
| PERF-001 | Pure planner with bounded fact input | Frozen benchmark: p95 for 100 assignments / 14 windows in `planner.test.mjs` | Local benchmark evidence; no centralized production latency telemetry claimed |
| COST-001 | One-call AI adapter and rules/no-task early exits | Provider call-count and quota-fallback tests; fixed evaluation | At most one request per generation; no automatic retry |
| GOV-001 | Trusted-base test review verifier, CI gates, AI-use log check | `governance.test.mjs`, workflow/script inspection, actual remote review evidence | CI status; branch protection/bootstrap/independent review must be verified remotely |
| FR-007 | `exportBackup` / `importBackup`, preview confirmation | `data.test.mjs`; browser restore/corrupt-file acceptance | Invalid file rejected before replacement; connection fields omitted |
| FR-008 | `calendarExport`, current-plan UI gate | ICS escaping/invalid-block tests in `data.test.mjs`; calendar download acceptance | Stale plan cannot be exported as current; external calendar import checked separately |
| FR-009 | Controlled `/api/canvas`, current-user adapter, disconnect UI | Production-switch/API/provider tests; opt-in live identity; browser disconnect | Token verification state, production testing disablement; no OAuth claim |
| FR-010 | Personal/server/rules configuration and AI provider presets | Provider mode, call-count, quota ownership and API tests; browser settings | Actual last `aiStatus`; personal failure never uses shared quota |
| INV-006 | Exact-clock, deadline and conflict checks in planner/time helpers | Frozen current-minute/deadline/overlap/horizon/cross-timezone tests | Infeasible work reported, never forced into invalid time |
| SEC-002 | `src/lib/provider-security.ts` and bounded adapters | Host/redirect/body/pagination/loop/concurrent-token negatives | Safe 400/401/413/429/502/503/504 outcomes; no provider-body echo |
| PRIV-002 | Hashed Canvas workspace selection and async invalidation in workspace | Concurrent adapter isolation tests; browser account switch/disconnect/late-result scenarios | New identity resets transient keys, previews and plan; browser-profile access is outside cloud isolation |
| QA-002 | Fixed evaluation plus protected opt-in live provider workflow | `test/evaluation/*.test.mjs`, `test/live/*.test.mjs`, `docs/testing.md` | Skipped live checks remain explicitly unverified; release needs actual model evidence and human quality review |

The original register's INV-004 and INV-005 enforcement labels map to SEC-001 and FR-004/QA-001 respectively; they are not additional registry entries. Formal shared OAuth, cloud accounts and persistent credential retention require a reopened ADR, revised requirements and new evidence before being marked implemented.
