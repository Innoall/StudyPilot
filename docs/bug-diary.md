# Bug diary

## 2026-11-16: temporal safety gaps in the original planner

- Requirements: FR-004, INV-001, INV-005, INV-006. Decision: ADR-002.
- Symptoms: a morning deadline could be scheduled that evening; today's elapsed windows could be used; duplicate or overlapping windows could produce overlapping work; a too-early task could block other eligible work; fractional allocation could strand a 15-minute task remainder.
- Reproduction: the frozen-clock cases in `test/offline/planner.test.mjs` were written before the repair. On the original planner 9 of 19 cases failed. These were expected defect-reproduction failures, not waived invariants.
- Classification: deterministic business-rule defects, timezone/environment dependence and insufficient boundary coverage.
- Root cause: the original task eligibility compared only the date's midnight, used host-local calendar arithmetic and iterated each availability window independently.
- Fix: explicit Hong Kong calendar functions, exact end/deadline comparisons, current-time clipping, sorted merged windows, cross-window break tracking, integer-minute effort accounting, and explicit unscheduled warnings.
- Exposed invariant gap: temporal safety was described but not enforced at exact instants or across overlapping windows.
- Verification: frozen positive/negative cases, cross-process timezone test, effort conservation and the performance benchmark. See `docs/review-memo.md` for the final run.

## 2026-11-16: account switching could reuse an earlier user's adviser key

- Requirements: SEC-001, PRIV-002, FR-009/010. Decision: ADR-002.
- Discovery: independent code review during this implementation found that switching Canvas workspaces initially retained the previous AI settings.
- Reproduction: connect synthetic A, apply A's synthetic AI key, connect synthetic B and inspect the next adviser mode.
- Root cause: data isolation and connection credential lifecycle were separate state changes.
- Fix: workspace switch resets AI to rules, closes edit/deletion/import dialogs, clears connection fields, invalidates old planning results and increments workspace ownership epochs.
- Verification: browser test with synthetic Canvas identities confirms B starts in rules mode and no credentials occur in localStorage or backups.
- Authority: this was an automated review finding. No teammate discovery or manual review is claimed.

## 2026-11-16: stale asynchronous operations could cross workspaces

- Requirements: PRIV-002, FR-007, SEC-001.
- Symptoms: an old editor/deletion closure, a delayed backup `File.text()` result, or a rejected Canvas request could affect a newly selected workspace.
- Reproduction: hold a synthetic Canvas response while opening the old task editor; complete the response. Separately hold a backup file read, disconnect, then release it. Also abort an outstanding Canvas refresh after disconnect.
- Fix: close all workspace-specific dialogs on identity switch; check workspace epoch and import request identity; abort and number Canvas requests; guard success, catch and finally state updates.
- Verification: all three browser races pass with synthetic data. No real external credentials were used.

## 2026-11-16: provider selection could retain an unsaved key

- Requirements: SEC-001, FR-010.
- Reproduction: type a synthetic key, then switch AI provider before applying the form.
- Root cause: uncontrolled password field was retained across local provider changes.
- Fix: remount provider-specific model and credential fields when provider changes. Account disconnect also remounts and clears the adviser form.
- Verification: browser check confirms the input becomes empty before any request can be made.

## 2026-11-16: impossible calendar dates normalized silently

- Requirements: FR-002/006/008.
- Reproduction: `2026-02-30` in a Canvas snapshot or calendar export input.
- Fix: validate source ISO dates with the shared date constraints and round-trip exported calendar dates; reject impossible dates instead of emitting normalized or invalid dates.
- Verification: negative provider and calendar tests.
