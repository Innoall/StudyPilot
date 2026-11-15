# Coding-Agent Entry Point

## Build target

Maintain StudyPilot: a privacy-conscious web application that converts student-entered or authorised Canvas data into a deterministic seven-day schedule and optional AI advice.

## Required reading order

1. `architecture-blueprint.md`
2. `docs/req/requirements.yaml`
3. `docs/architecture/invariants.md`
4. `docs/architecture/trace-matrix.md`
5. `docs/code-governance/structural-constraints.md`
6. `docs/code-governance/verification-constraints.md`
7. `Prompt.md`

## Authority and scope

- Authoritative: user-entered facts, Canvas API facts, deterministic validation, and user confirmation.
- Advisory: every LLM summary, recommendation, estimated learning strategy, or prioritisation explanation.
- Frozen without an ADR and human approval: credential handling, OAuth flow, prompt-injection boundary, deterministic planner constraints, and retention policy.
- Never read, request, print, log, or commit user passwords, OAuth tokens, API keys, `.env` values, or production student records.

## Baseline modules

- `src/app/page.tsx`: interaction layer only.
- `src/lib/planner.ts`: authoritative schedule calculation.
- `src/app/api/plan/route.ts`: AI adapter and safe fallback.
- `src/lib/canvas.ts`: request-only Canvas self-testing adapter; approved OAuth remains a separate production integration.
- `src/lib/data.ts`: shared data validation, backup/import and calendar export.
- `src/lib/ai.ts`: personal/server adviser contract and deterministic fallback.
- `src/lib/canvas-data.ts`: pure source normalisation.

ADR-002 records the user-authorised personal-key and source-directory changes. User credentials may be entered into the application; the coding agent must never inspect real values. Keys remain request-local/page-memory only and are excluded from local study persistence. Product implementation and engineering gates are in scope; team allocation and Report.md are deferred.

Extend these modules; do not replace the baseline without an approved ADR. Every new feature must reference a requirement ID and add at least one positive and one negative test. Run type-checking, offline tests, requirements validation, and the full build before requesting review.
