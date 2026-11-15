# ADR-001: Deterministic planner with advisory AI

- Status: Accepted for MVP
- Date: 2026-09-24

## Decision

Use a layered architecture: browser workspace, deterministic planner, server-side AI adviser, and future Canvas OAuth adapter. The planner owns schedule blocks; AI only returns a summary and suggestions.

## Alternatives

1. LLM generates the complete schedule: fastest prototype, but deadlines and time boundaries are non-deterministic.
2. Rules only: safe and testable, but less personalised.
3. Selected hybrid: rules guarantee validity; AI explains priorities and study strategy.

## Consequences

The application works offline and AI failures degrade safely. The team must maintain both rule tests and semantic evaluations. AI cannot directly improve block allocation until a separately verified optimisation component is designed.

## Reopen when

A verified optimiser materially outperforms the current scheduler, Canvas interface constraints require new internal types, or evaluation evidence shows the advisory layer provides no benefit.
