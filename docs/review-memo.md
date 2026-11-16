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

### Visual refresh validation

The subsequent user-authorised presentation update passed 58 offline tests, 13 fixed evaluations, type/lint/schema/structure and production build checks. Portable `npm start -- --port 5180` served both the homepage and provider readiness endpoint with HTTP 200, then stopped. Browser review used separate synthetic coursework at 1440/1920px and all five pages at 390px. A hidden file-input CSS overflow was found and corrected; the final Connections page measured 390px total width. There was no new business logic or credential-policy change in this presentation work.

## Approved Canvas/AI transport correction

The user approved the concrete repair/test plan before safety-related adapter changes. Workerd does not implement `redirect: "error"`; both adapters now use manual redirects and reject non-success responses before parsing. Canvas adds a truthful application User-Agent to avoid the upstream missing-client rejection. Pinning Worker compatibility date `2026-05-15` selects no-store support; the emitted Worker config retains the pin. Destinations, no-follow behavior, credentials, quotas, current-user scope and deterministic authority retain their prior contracts.

Review and verification include actual adapters inside workerd with fully synthetic intercepted outbound responses, plus all five redirect statuses, safe authentication failure and unchanged AI fallback schedules. The complete verification passed 65 offline tests, 13 fixed evaluations, schema/structure/type/lint and build. The running local API now reaches Canvas with a synthetic key and returns safe 401, rather than a local unsupported-option exception. See the validation record for the temporary upload-staging lint interference and its recoverable cleanup.

The user then reported a successful personal-account preview, and safe UI inspection observed import confirmation. Only success text was inspected, with no course contents or credentials collected. This establishes that controlled personal connection/import worked in this local session. It does not establish shared production OAuth, real AI quality/billing or dedicated live-suite completion. The repair has not been committed, uploaded or deployed remotely; independent human review and the previously deferred operational conditions remain pending.

## Approved typography and spacing maintenance — 2026-11-16

The user requested larger text throughout the site and less unused space. The concrete execution, test and rollback plan was presented at `/Users/niubili/Documents/Codex/2026-11-16/new-chat/outputs/StudyPilot-readable-layout-plan.md`; the user explicitly approved it with “是” before code changes. This local revision changes only `src/app/globals.css`: text sizes, content/card spacing, control sizing and responsive wrapping. No function, component interface, data contract, provider request, credential lifecycle, dependency or deterministic scheduling behavior is changed.

The review scope is QA-001 plus the existing course, assignment, availability, plan, AI advice and Canvas connection interfaces under FR-001/FR-002/FR-003/FR-004/FR-005/FR-006. The visible controls and dialogs must remain operable after increasing font sizes. Independent read-only review identified narrow header actions, fixed filter columns, time inputs, long buttons, portalled dialogs and hidden file-input styles as priority responsive acceptance checks. Existing uncommitted Canvas/AI transport fixes are outside this styling patch and must remain intact.

**Current verification state: final complete verification passed.** The first `npm run verify` completed with exit 0: 23 requirements, 65 offline tests, 13 fixed evaluations, structural validation, types, lint and production build. Synthetic browser acceptance covered all five tabs at 1440/1280/1024/800/390/320px without document-level horizontal overflow. At 320px the task editor was internally 286px wide with 286px scroll width, a long synthetic task title saved, task selectors used readable 16px single-column controls, and 19:00/22:00 time values remained readable. A rule plan generated with `aiStatus: disabled`, making no real AI call. Read-only review follow-up increased the base section heading to 22px and icon controls to 44px; the final complete verification after these minor CSS refinements completed with exit 0 and the same counts. The existing user-controlled Canvas verified state, personal CityU AI selection and last-generation success were still visible after validation; no credential values or study records were inspected. This memo is a coding-agent scope and risk review, not an independent human approval or a remote publication claim.
