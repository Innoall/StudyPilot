# Structural Constraints

1. Each architectural element maps to one primary module; adapters may depend on domain types, never on UI components.
2. The web workspace calls the planner/API through typed interfaces. The planner has no network, storage, or environment access.
3. AI text is advisory and may replace only summary/suggestion fields. Deterministic plan blocks and authoritative facts are never overwritten.
4. External credentials are server-only. No `NEXT_PUBLIC_` secret variables are permitted.
5. New work extends the baseline. Replacements, cross-layer shortcuts, and new dependencies require an ADR.
6. Every exported function references its requirement/invariant in the pull-request review memo until code annotations are standardised.
7. Safety-critical code requires human approval and a negative test.
