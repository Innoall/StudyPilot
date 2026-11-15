# Validation evidence — 2026-11-16

Environment: macOS arm64, Node.js 24.22.1. This record describes local verification; no remote deployment or paid provider call is included.

## Completed checks

- `npm run verify`: passed, including actual requirements-schema validation (strict supported subset), structural/credential/dependency checks, TypeScript, ESLint, 56 offline regression tests, 13 fixed evaluation/prompt-consistency tests and production build.
- `npm ls --depth=0`: exit 0. The existing developer installation contains extraneous cached packages; no new dependency was added and the lockfile's declared dependency set is unchanged.
- `git diff --check`: passed before final packaging.
- Planner benchmark: 100 assignments, 14 windows, 30 runs; final measured p95 0.19 ms on this environment versus the 200 ms requirement. This is a local benchmark, not a production latency promise.
- `npm run test:live`: six tests explicitly skipped because no dedicated opt-in or credentials were provided. Zero real provider requests were made; skipped tests are not counted as passes.

## Browser acceptance

Chrome headless at 1440×1100 and 390×844. The actual local application and rule API were used for manual coursework and planning. External Canvas responses were intercepted with synthetic identities for isolation tests. All 13 cases below passed, and the main-flow run recorded zero page errors.

1. Add a course and assignment through the actual dialogs.
2. Generate a nonempty rule schedule through the real `/api/plan`; exact Hong Kong time blocks display and calendar export enables.
3. Reload restores study facts; task editing saves and invalidates old plans.
4. Canvas preview/confirmation selects a separate local workspace, using a synthetic response.
5. Personal Canvas and AI keys do not appear in localStorage values.
6. Switching synthetic Canvas identity clears the previous user's AI mode/key and token field.
7. Disconnect restores the manual workspace without mixing imported Canvas records.
8. Downloaded backup contains the correct version and study facts, without credentials.
9. Mobile navigation and task controls work without page-level horizontal overflow.
10. Changing AI provider clears an unsaved key before another provider can receive it.
11. Switching identity closes an already-open editor from the prior workspace.
12. A delayed backup read released after disconnect cannot open an import in another workspace.
13. A cancelled Canvas request cannot overwrite the disconnected session's message/state.

Screenshots were visually inspected: readable desktop schedule, mobile controls, no overlapping text or unintended page overflow. The raw local QA logs and screenshots are retained in this chat's work/output area; this summary distinguishes mocked provider checks from real local UI behavior.

## Required external evidence

Real Canvas permission/API behavior, real model usefulness and billing, production OAuth, remote CI runs, protected environments/branches and independent human review were not established by these checks. Opt-in live tests and documented CI configuration are provided to gather those facts without manufacturing evidence.
