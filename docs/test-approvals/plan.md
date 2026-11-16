# Test plan for StudyPilot project completion

Date: 2026-11-16, Asia/Hong_Kong. The user authorised the previously presented implementation and 18-case test plan with scope revisions: defer team allocation and the report; add personal Canvas Access Token and AI-key connections. The original reply is preserved in `current.json`; no independent reviewer or approval time is invented.

## Approved scenarios and extensions required by the user's revision

- Fixed Hong Kong clock; current-day cutoff; exact deadline containment; merged overlapping availability; capacity and effort conservation; completed/overdue/no-capacity cases; 100-task benchmark.
- Complete course/task/availability editing; changed inputs invalidate the previous plan; valid persistence and backup restore; invalid dates, hours, IDs, references and corrupt backups rejected without overwriting data.
- Canvas first import, repeated import and source updates; invalid/missing deadlines and references handled explicitly.
- AI accepted JSON; unconfigured, timed-out, non-2xx, malformed and oversized responses safely fall back; extra authoritative fields cannot change the deterministic plan.
- Context allowlist and synthetic prompt injection; no private identifiers or credentials enter model context or backups; at most one billed request per generation.
- Personal-key failure never falls back to another user's or server-funded quota; personal keys and Canvas tokens last only in memory, are not logged, and are cleared on disconnect/refresh.
- Canvas uses only allowlisted HTTPS GET endpoints; pagination and redirects cannot leak tokens to another host; timeout and request bounds prevent uncontrolled synchronisation.
- API invalid JSON/data returns a safe 400; manual/offline planning remains usable without providers.
- Positive/negative schema and governance checks; deliberate invalid advice detected by the fixed evaluation; responsive browser acceptance of the main workflows.

## Future pull-request evidence

1. Commit executable tests and this plan before implementation. The approved commit must contain no application, prompt, package, workflow or script implementation changes relative to the PR base.
2. Ask an independent collaborator to submit an `APPROVED` GitHub review on that exact commit with `[TEST-PLAN APPROVED]` in the review body.
3. Keep the approved tests and plan unchanged while implementing. Record the actual review ID and exact commit in `current.json`.
4. The merge gate retrieves the real review from GitHub, checks reviewer independence, the tests-only ancestor, unchanged test blobs and review/implementation chronology. It does not trust a JSON status flag.
5. Changed test requirements require a fresh test-plan review. Tests-only proposals may pass before implementation so the review can be obtained.

The current interactive development session cannot manufacture a past GitHub review. A maintainer must review the governance bootstrap and this session's evidence before adopting the automated policy on the protected base branch. This exception is visible and is not reported as a passing merge gate.

## Approved Canvas/AI runtime correction — 2026-11-16

The user approved the separate concrete repair and test plan with “批准修复并测试”. The eight approved cases cover successful Canvas mapping/client identification, rejection of every standard HTTP redirect without forwarding credentials, successful AI advisory-only behavior, AI redirect failure without shared quota, actual adapter execution inside workerd with synthetic intercepted responses, an unauthenticated network-path check, the complete regression/build gates, and user-controlled personal-token reconnection. No real AI quota or agent-visible personal credential is needed.

The correction preserves no-store caching and every existing destination, credential, pagination and authority invariant. Runtime compatibility tests supplement existing injected Node fetch tests so unsupported RequestInit options fail during offline verification. Personal-account verification is recorded separately from synthetic success. The implementation decision and its rationale are in ADR-002.

## Approved readability and spacing maintenance — 2026-11-16

Before implementation, the user received the concrete execution and acceptance plan at `/Users/niubili/Documents/Codex/2026-11-16/new-chat/outputs/StudyPilot-readable-layout-plan.md` and explicitly replied “是”. This approval covers larger typography and reduced whitespace across the five existing pages and editing dialogs, with CSS-only changes and no new dependencies, request contracts or credential-policy changes. Existing Canvas/AI transport corrections must be preserved.

The scope supports QA-001 and the existing FR-001/FR-002/FR-003/FR-004/FR-005/FR-006 workflows. It does not introduce a new feature or invent a registered typography requirement. Positive acceptance checks compare readable body, label, button and form text, useful desktop content width, and reduced card/heading/empty-state gaps. Negative checks cover long synthetic course/task text, wrapped messages, backup-button groups, time/date controls, focus outlines and dialogs without clipping or whole-page horizontal overflow at 320px and 390px. Desktop and laptop layouts are checked at 1440px and 1280px.

Verification reruns requirement/schema and structural validation, type checking, lint, all existing offline and fixed evaluation tests, and a production build. Browser acceptance uses an isolated synthetic workspace and makes no real provider calls. No new implementation-mirroring test source or `current.json` schema change is proposed. The first fresh verification passed, and synthetic responsive checks were observed; exact evidence is in `docs/validation-evidence.md`. Final re-verification after minor CSS refinements completed with exit 0, 65 offline tests, 13 evaluations and all required checks passing. The prior revision's passing results are not evidence for this styling revision. This chat approval is separate from the independent GitHub review required for a future governed merge.
