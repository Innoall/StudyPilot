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
