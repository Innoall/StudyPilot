# Verification Constraints

- Every fit criterion must map to test evidence before the requirement is marked complete.
- Every invariant has a negative test that demonstrates failure when enforcement is removed or violated.
- Every test names the requirement or invariant it verifies.
- Every change reruns all prior offline tests with zero regressions.

## Three tiers

1. Structural: type-checking, imports, schema, module boundary, permission and secret checks.
2. Regression: all previous deterministic suites pass.
3. Behavioural: fixed evaluation cases measure deadline preservation, assignment faithfulness, availability escapes, privacy fields, usefulness, latency, and provider fallback.

Live tests cannot be required for ordinary offline development, but must pass before a release claiming external integration support.
