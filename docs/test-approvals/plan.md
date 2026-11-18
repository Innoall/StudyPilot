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

## Approved Canvas UX revision — 2026-11-18

The concrete execution plan and 20 scenario groups were presented at `/Users/niubili/Documents/Codex/2026-11-16/new-chat/outputs/StudyPilot-Canvas-UX-plan-2026-11-18.md` before implementation. The approval question explicitly included both implementation and tests. The user replied “是”. `current.json` preserves this interactive approval; it does not create an independent GitHub review or authorise remote publication/deployment.

ADR-003 records the bounded contract changes: two-hour imported effort is explicitly provisional until confirmed; selected-task effort updates are atomic; the first confirmed import can authorise same-identity automatic sync only for the current page connection; local source-field corrections and exclusions survive sync; current work is the default view while saved history remains recoverable. Credential persistence, OAuth policy, provider request restrictions, AI authority and deterministic schedule constraints do not change. Tests use synthetic data/credentials and fixed clocks; the coding agent must not inspect real student records or keys or make billed AI calls.

The following approved groups are implementation targets. Passing results must be recorded only after the checks and browser scenarios are actually run.

1. **FR-002/006:** new source tasks have a provisional two-hour value and unconfirmed marker; explicit confirmation of two hours or a changed value confirms correctly.
2. **FR-002 negative:** title/status edits do not implicitly confirm effort; invalid, non-finite, blank or out-of-range hours reject an entire batch without partial mutation.
3. **FR-002 batch scope:** per-task and common-value updates affect selected tasks only; course/view filtering, unselected/deleted records, empty selection and cancel cannot cause unintended writes.
4. **FR-007 compatibility:** legacy Canvas hours remain unchanged and need review when no marker exists; manual tasks keep existing behaviour; new backups preserve review/correction metadata.
5. **FR-007/SEC-001 negative:** malformed metadata, excessive exclusion lists and invalid references reject safely; unknown credential fields are removed and session authorisation/keys are absent from backups.
6. **FR-006 idempotence:** repeated sync creates no duplicates and retains confirmed effort/priority; an unchanged response reports no updated facts and does not stale the current plan.
7. **FR-006 local corrections:** labelled title/deadline/course/status corrections survive source updates; unmodified fields follow the source and restoring Canvas values removes the corresponding override.
8. **FR-006 negative:** records without overrides follow valid source deadline/submission changes; invalid or incomplete responses do not partially rewrite local state.
9. **FR-001/002/006 exclusions:** deleted imported tasks/courses do not return on sync; removing an exclusion permits later import; course removal leaves no orphan task and manual records are not accidentally overwritten.
10. **FR-006 default import scope:** new expired/completed assignments are skipped unless explicitly included; future unfinished records and add/update/skip counts remain correct.
11. **FR-002/006 exact time:** freeze instants before, at and after a Hong Kong deadline, including cross-day and non-Hong-Kong host-timezone cases.
12. **FR-002 views:** Upcoming, Overdue, Completed and All compose with course, search, compatible status and effort-review filters; hidden counts and completed navigation do not mislead.
13. **FR-006 existing history:** a source extension returns saved overdue work to Upcoming; submission-state changes still update existing historical work; source absence alone never deletes saved records.
14. **FR-006/009 session sync:** only a confirmed first-import choice enables automatic application; a visible idle connected page checks when five minutes are due, while manual sync can run immediately.
15. **FR-006/009 negative timing:** cancelled first preview, disabled sync, hidden/disconnected page and an interval not yet due send no automatic request; click/timer/visibility events cannot overlap or loop requests.
16. **PRIV-002 races:** disconnect, identity change, backup restore and reconnection invalidate old work; delayed responses cannot cross workspaces or overwrite intervening local edits; open editors/batch dialogs defer application.
17. **QA-001 failures:** timeout, rate limit, unauthorised and malformed responses retain existing data; unauthorised/rate-limited automatic work pauses for explicit retry and safe errors expose no credentials/raw records.
18. **INV-001/002/006/COST-001 regression:** filters and provisional metadata cannot alter time constraints or silently lose saved effort; automatic sync makes no AI request and generates no schedule.
19. **Synthetic browser flow:** preview/default scope, import/session sync, batch hours, local correction, deletion/resync, restoration, historical/completed views and rule-plan regeneration.
20. **Synthetic browser negatives/responsiveness:** invalid hours, cancellation, empty results, sync failure/no-op, keyboard labels and long titles; desktop 1440px and 800/390/320px widths without whole-page horizontal overflow.

Write executable positive/negative cases before the corresponding implementation. Add pure-domain coverage in `test/offline/canvas-ux.test.mjs`, preserve the earlier 65 offline tests and 13 fixed evaluations, and supplement these with session-controller/API checks and the specified synthetic browser acceptance. Full verification is `npm run verify`: requirement schema, structure, types, lint, all offline tests, fixed evaluation and complete build. Live tests remain a separate opt-in and skips are not successes. Do not weaken a failing invariant or manufacture the independent pre-implementation review required by the future governed PR workflow.

Rollback first disables session sync and returns to explicit previewed imports. Preserve the earlier uncommitted verified work and local study data; export a current backup before source downgrade because older versions may discard new optional metadata on save. Actual run counts, unresolved limitations and any user interventions belong in `docs/validation-evidence.md` and `docs/review-memo.md` after observation.
