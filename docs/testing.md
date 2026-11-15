# Verification and blocking gates

This document describes executable checks and the external repository settings needed to enforce them. Passing local checks is not an independent human review, a real-provider evaluation, or proof that GitHub branch protection is enabled.

## Run the checks

Use Node.js 22.13 or newer. From a clean checkout:

```sh
npm ci
npm run typecheck
npm run lint
node scripts/validate-requirements.mjs
node scripts/verify-structure.mjs
npm run test:offline
node --experimental-strip-types --test test/evaluation/*.test.mjs
npm run build
```

The offline suite uses fixed clocks and synthetic records. It does not call Canvas or an AI provider, load `.env` files, or need credentials. Every test identifies the requirement or invariant it verifies. The production build remains a separate verification step; a successful build does not establish user-workflow correctness.

`test/evaluation/advice-cases.json` is the versioned fixed response-contract set. Its gates require all known-valid advice to be accepted, all known-invalid advice to be rejected, zero changes to authoritative plan blocks, and no prohibited synthetic identities in the model context. The evaluation calls the actual advice parser, context assembler and response merger. It includes malformed JSON, missing and empty fields, wrong suggestion count/type, malicious extra task/plan fields and injected course text.

These are deterministic boundary evaluations. They deliberately use synthetic model responses and therefore do not establish that a real model gives useful advice. Real model checks and a human usefulness review are separate release requirements.

## Six blocking gates

1. **Test approval.** On implementation PRs, `scripts/verify-test-approval.mjs` retrieves the actual GitHub review identified by `docs/test-approvals/current.json`. It requires an independent human collaborator, a submitted `APPROVED` review with `[TEST-PLAN APPROVED]`, an exact tests-only commit that is an ancestor of the implementation, unchanged approved tests/plan, and review chronology before the first implementation commit. A self-written JSON approval flag cannot pass this gate.
2. **Static analysis.** Types and lint run on every commit. `scripts/verify-structure.mjs` checks declared dependencies against the lockfile, registry origins and integrity entries, module directions, planner purity, public secret variable patterns, credential logging/persistence patterns and required governance artifacts. `npm ls --depth=0` checks installed direct dependencies. Static patterns complement runtime tests; they are not a proof that all possible leaks or vulnerabilities are absent.
3. **Requirements schema.** `scripts/validate-requirements.mjs` reads the actual registry and `req-schema.json`. The dependency-free validator implements the schema's supported structural, enum, length, pattern and numeric constraints and rejects unsupported keywords. It is explicitly a restricted JSON Schema implementation, not a complete draft-2020-12 validator. The registry uses JSON-compatible YAML; full YAML syntax is not silently accepted. IDs must also be unique and fit criteria must be nonblank.
4. **Semantic/boundary evaluation.** Every CI run replays the fixed offline advice/privacy/authority cases. Before releasing a prompt or supported-model change, run the protected real-provider evaluation for the exact release commit, meet the live thresholds and record a human usefulness review. Never treat rule-engine fallback, skipped live checks or synthetic responses as a successful model replay.
5. **Regression.** Every change reruns all prior `test/offline` tests, the fixed evaluation and the build. A failed invariant blocks release and requires diagnosis; do not loosen the invariant to make the run pass.
6. **AI-use log.** PR changes to application/source, components, prompts, scripts, tests, package manifests or CI require a substantive `docs/ai-use-log.yaml` update. The verifier checks the merge-base diff and does not interpolate a branch name or PR text into a shell command.

## Test approval workflow

Commit the test plan and executable tests first, before implementation. Ask another collaborator to review that exact commit and include `[TEST-PLAN APPROVED]` in an `APPROVED` review. Then implement without changing the approved tests or plan, and enter the actual review ID and commit SHA in `current.json`. New test scope requires fresh review. Documentation-only and tests-only proposals can be reviewed before the implementation gate applies.

The gate verifies Git history and GitHub review metadata. Commit dates alone are not proof of when someone edited a local file; the human supervisor must also preserve the original agent-session record and interventions. Do not backdate commits or reviews to create approval evidence.

The 2026-11-16 interactive session records the user's real `approved-with-scope-revisions` authorisation. It does not invent a separate teammate review. Consequently, this session's bootstrap cannot claim that an independent GitHub pre-implementation review already exists. A maintainer must inspect and adopt the initial governance implementation and record the exception before protecting the base branch with these rules.

## GitHub setup and trust boundary

- Require the `verify`, `semantic-evaluation` and `test-approval` checks on the protected default branch. Block direct pushes and require an independent human approval; dismiss stale approvals after changes.
- Protect workflow files, verification scripts, permission rules and architecture decisions through the repository ruleset and code ownership. Use a required trusted workflow if the repository's plan supports it. Merely committing a workflow cannot activate branch protection.
- The PR approval verifier is loaded from the PR base commit in a separate checkout. It does not execute the changed verifier from the PR. The initial base must already contain the reviewed verifier; missing bootstrap deliberately blocks the gate.
- PR workflows use a read-only GitHub token and do not receive provider secrets. The workflow does not use `pull_request_target`. Repository settings must restrict permission escalation and prevent a PR author from replacing a required security check through an unreviewed workflow change.
- Configure the `provider-evaluation` environment with required reviewers and restrict allowed deployment branches to the protected default branch or approved release tags. Its dedicated AI test credential must have a small spending limit. No regular PR run receives it.
- Before a release claiming Canvas or AI integration, keep a successful live test run for the exact release SHA, plus the provider/model/prompt version and human review. There is no automatic deployment in this workflow; do not manually publish a changed model/prompt while the release evidence is missing.

GitHub review metadata and workflow trust semantics are described in the official [review API documentation](https://docs.github.com/en/rest/pulls/reviews) and [Actions security documentation](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target).

## Live AI evaluation

The test process accepts these dedicated variables, without printing them or loading local credential files:

```text
STUDYPILOT_TEST_AI_PROVIDER=cityu|openai|deepseek
STUDYPILOT_TEST_AI_MODEL=an-authorised-model
STUDYPILOT_TEST_AI_KEY=a-dedicated-protected-test-key
```

Run:

```sh
node --experimental-strip-types --test test/live/*.test.mjs
```

Without configuration, live tests are explicitly skipped. To validate a release, missing configuration must fail:

```sh
REQUIRE_LIVE_TESTS=1 node --experimental-strip-types --test test/live/*.test.mjs
```

Live calls also require an explicit opt-in even if credentials happen to exist in the environment: `RUN_LIVE_TESTS=1` for an optional AI run, or `REQUIRE_LIVE_TESTS=1` for required release validation. Ordinary test discovery cannot accidentally spend a configured key's quota.

The live gate requires valid advice on both the fixed normal and injection scenarios, exactly three suggestions, zero changes to the rule plan, no prohibited raw synthetic task IDs or invented `Task 999`, and no key in returned advice. These checks are a measurable minimum; a human must still review relevance and usefulness. They use synthetic coursework only and make at most two billed calls for a configured provider/model per run. Provider errors and fallback cause release evaluation to fail instead of quietly passing.

In GitHub, choose **Blocking Gates → Run workflow → run_live_evaluation**, on the protected release commit. Store the key as the environment secret `STUDYPILOT_EVAL_AI_KEY`, and provider/model as environment variables `STUDYPILOT_EVAL_AI_PROVIDER` and `STUDYPILOT_EVAL_AI_MODEL`.

Ordinary users can select their own supported provider/model. This does not certify every model they enter; individual failed calls visibly fall back to rule planning without using someone else's AI quota.

## Canvas verification

Offline adapter tests cover successful and repeated imports, missing deadlines, own-submission status, request bounds and rejection of cross-origin pagination/redirects. A real Canvas token may grant broader access than the application uses; the adapter must issue only the declared read endpoints.

For live verification, an authorised user should connect their own token in the application, preview imported courses/tasks, confirm the merge, repeat sync to check deduplication, then disconnect and refresh to verify that the credential is gone. Use only the user's own account or a dedicated synthetic test account. Do not commit raw Canvas responses or take screenshots that expose the token. A successful offline fixture is never reported as a real Canvas connection.

`test/live/canvas.test.mjs` also provides a current-user adapter check. Set `STUDYPILOT_TEST_CANVAS_TOKEN` privately and optionally `STUDYPILOT_TEST_CANVAS_BASE_URL` (default: CityUHK), then opt in with `RUN_CANVAS_LIVE_TESTS=1`. The self-verification check reads only `/users/self`; a full course/assignment sync additionally requires `STUDYPILOT_TEST_CANVAS_ALLOW_SYNC=1`. Use `REQUIRE_CANVAS_LIVE_TESTS=1` to fail instead of skip when the token is missing. No real account records are printed or stored by these tests. Custom hosts must also satisfy the adapter's explicit host allowlist. Live success is account/environment-specific, not school-wide approval.

## Browser acceptance

At both desktop and phone widths, verify: create/edit/delete course and task; change weekday and time; distinguish invalid input; generate and regenerate; mark work complete; see stale-plan feedback after changing inputs; export and restore a backup; reject corrupt imports without data loss; preview/merge Canvas data; personal AI error preserves rule planning; disconnect clears the connection; switching Canvas account isolates its workspace; keyboard navigation reaches every action. Record actual results and limitations in the review memo.
