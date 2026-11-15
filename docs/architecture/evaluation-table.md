# Candidate Evaluation Table

Scores: 1 poor, 5 strong.

| Candidate | Safety | Offline use | Personalisation | Testability | Integration cost | Total |
|---|---:|---:|---:|---:|---:|---:|
| LLM-only schedule | 1 | 1 | 5 | 2 | 3 | 12 |
| Rules only | 5 | 5 | 2 | 5 | 5 | 22 |
| Hybrid rules + advisory AI | 5 | 5 | 4 | 4 | 4 | 22 |

Hybrid is selected because it matches the rules-only safety score while providing useful explanations. Integration cost is accepted because the system still works when AI is absent.

These original scores are qualitative architecture judgments, not measured model-quality or security ratings. The repaired planner's local benchmark and regression evidence are in `validation-evidence.md` (under `docs/`); live model usefulness remains unmeasured.

## ADR-002 credential alternatives

| Alternative | Identity / storage needs | Quota ownership | Choice |
|---|---|---|---|
| Persistent server credential vault | Authenticated account, encrypted storage, key rotation and deletion infrastructure | Per-user if correctly isolated | Deferred to a separately reviewed account/storage decision |
| Browser persistent keys | No server vault but keys survive page sessions | Per-user but broader exposure | Rejected |
| Page-memory and request-only personal keys | No credential database; re-entry after refresh | Explicit personal key, no shared fallback | Chosen for controlled local project slice |
| Shared environment key only | Operator owns configuration and must protect public usage | Shared operator quota | Retained only as an explicit separate mode |

Formal multi-user Canvas access still selects OAuth; the ephemeral token form is personal development self-testing, not an alternative formal login architecture.
