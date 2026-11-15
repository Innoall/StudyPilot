# Evaluation Logbook

## 2026-09-24 — MVP baseline

- Evidence: manual-entry workflow, deterministic scheduler, provider fallback.
- Result: architecture supports development without Canvas or AI credentials.
- Open evaluation: fixed semantic set must be created before the first prompt/model change.
- Planned thresholds: zero invented assignments; 100% deadline preservation; zero availability escapes; at least 90% useful-advice rating on synthetic cases.

## 2026-11-16 — verified planner and personal connections

- Evidence: `docs/validation-evidence.md`, frozen regression cases, fixed response/injection/privacy evaluation, versioned prompt consistency, and browser lifecycle checks.
- Original planner: 9 of 19 newly written scenarios failed before repair; all prior tests were retained in the extended suite.
- Current local verification: 56 offline tests, 13 fixed evaluations, 13 browser scenarios, type/lint/schema/structure/build checks passed. Performance p95 in the final run was 0.19 ms for 100 assignments and 14 windows over 30 runs on Node 24.22.1 macOS arm64.
- Authority results: malicious response fields never replace deterministic blocks; invalid/over-budget/provider-failure cases fall back; individual provider credentials do not share quotas.
- Context revision: omit raw titles, names and free-text preferences; use aliases and fixed categories. Bound UTF-8 context bytes rather than claiming measured tokenizer usage.
- Credential decision: ephemeral page/request credentials avoid a new persistent vault and cloud-account design. Browser tests cover identity-switch races and stale file/network results.
- Unresolved measurements: real model usefulness/faithfulness and real Canvas access have not been measured. The original 90% usefulness target is a planned human evaluation threshold, not a result of mocked contracts. Six live tests remain skipped until explicitly configured.
- Reopen decision: formal shared Canvas OAuth, authenticated server storage or persistent keys need new approved decisions and live evidence.
