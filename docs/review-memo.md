# Local implementation review memo — 2026-11-16

This is the coding agent's local review and verification record, not an independent human PR approval. No PR was created or merged during this implementation.

## Scope and specification alignment

The user reviewed the full execution/test plan and requested project work without five-person allocation or Report.md, with user-supplied Canvas tokens and personal AI keys/quotas. The exact scope-revision message is preserved in `docs/test-approvals/current.json`. ADR-002 records credential, temporal-rule and source-directory decisions. There are now 23 machine-readable requirements with traceability.

Implemented: manual course/task CRUD; priority/status changes and filters; editable weekdays/time windows; strict Hong Kong deadlines; conflict-free seven-day scheduling; data validation; preview-confirm backup/Canvas import; local workspace isolation; calendar export; personal/server/rules AI selection; request-local keys; bounded real read-only Canvas self-testing adapter; validated advisory AI; fixed evaluations and engineering gates. All application source is under `src/`.

## Architecture, security and efficiency

The planner has no storage/network/environment access. AI can only supply validated advisory strings; schedule blocks remain deterministic. Personal mode does not borrow shared quotas. Context excludes source names, raw titles, free-text goals and identifiers. Destinations and pagination are constrained, redirects rejected, request sizes/time/request count bounded, provider errors sanitized and responses private/no-store. Keys are absent from persisted study data and backups; identity switches clear previous keys and pending edits.

The independent automated review identified four lifecycle/race issues during development. Their fixes and browser checks are recorded in the bug diary. This record does not claim a human security sign-off.

## Verification evidence

Environment: Node.js 24.22.1, macOS arm64. Tests use fixed clocks and synthetic credentials. Current verification commands and exact final totals are summarized in `docs/validation-evidence.md`.

Production build, types, lint, supported JSON Schema validation, structural/credential/dependency checks and the prior plus new offline suites must pass. The original 4 tests were extended rather than discarded. Live tests are opt-in and are recorded as skipped when no dedicated credentials are supplied. Browser acceptance uses the real local UI and rule API; external Canvas identity responses in isolation tests are mocked.

## Open operational conditions

- Real Canvas access and real model behavior have not been validated in this run. Token self-testing is not approved multi-user OAuth login.
- A maintainer must bootstrap trusted CI verifiers, configure protected branches, require the named checks and independent reviews, and configure a protected live-evaluation environment before claiming governed remote release readiness.
- The stricter tests-before-implementation GitHub gate needs actual independent review history. The chat authorization is not represented as a GitHub review.
- The final course process report, personal reflections, contributions and five original transcripts remain outside this user-approved implementation scope.

## Verdict

**Local implementation: self-verification recorded; independent human review pending.**

**Remote release / full submission: CHANGES REQUIRED** until external integration evidence and human governance conditions are satisfied. Do not convert skipped live tests or this memo into an APPROVE signature.

## Follow-on visual redesign and GitHub publication preparation

Date: 2026-11-16, Asia/Hong_Kong. The user requested a more polished interface and source upload to their Innoall GitHub account. The working copy is now a separate user-selected project folder; inherited source history is retained. The intended repository is `https://github.com/Innoall/StudyPilot`. This paragraph records authorised intent, not successful repository creation, upload or deployment.

The visual work is restricted to the workspace page and styling. Existing deterministic planning, personal-key lifetime, provider quotas, local identity isolation and import confirmation must remain intact. Fresh static, regression, evaluation, build and browser checks are required for the visual revision; the earlier validation record applies to the preceding implementation and must not be reused as proof that new styling passed.

Publication preparation updates README clone instructions to the intended repository and makes the macOS launcher's optional bundled-Node fallback relative to the current user's home directory. No source credential file is read or added. Secret-pattern review reports candidate file paths only, never matching values. Standard ignores cover local environment files, dependencies, build caches, logs, runtime state and task work/output folders; inherited history still requires separate inspection before publication.

Preparation checks completed for this follow-on revision: launcher syntax (`zsh -n`) and whitespace checks passed; ignore rules cover environment files, dependencies, build/runtime folders, logs and work/output artifacts, with none of those artifacts tracked. A file-path-only scan of current source and 12 inherited commits found no candidates for provider-key prefixes, Canvas token shape or private-key markers. Environment and npm credential-file values were deliberately excluded; a pattern scan is not proof that every possible secret is absent.

The copied project defaults to the portable execution profile and package/lock root versions agree at 0.2.0. Development/build/start scripts locate their project relative to their own module paths. The former unconditional Wrangler `npm start` was incompatible with a portable vinext build. The profile-aware launcher now runs `vinext start` for ordinary clones, forwarding supported port/hostname arguments, and retains Wrangler plus private runtime setup for managed Worker builds. New integration tests exercise the installed CLI's successful help and failed invalid-port paths; actual build/production HTTP validation remains a separate release check until recorded.

Initial source upload does not establish that the independent test-review gate or branch protection has passed. Trusted CI verification scripts must first exist on the reviewed protected base branch. Future implementation PRs require actual tests-only approval evidence; `current.json` contains no invented independent review. Protected live evaluation and real model/Canvas evidence remain separate operational conditions.

**Current follow-on verdict: publication preparation in progress; final tests, browser acceptance, upload result and remote CI must be recorded after they occur.** This is a coding-agent self-review note, not a human APPROVE signature.
