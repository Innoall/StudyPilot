# Static Build Prompt

Read `AGENTS.md` and its required artifacts. Before writing code, produce an execution plan covering requirement traceability, interface contracts, scope boundaries, testing strategy, exact steps, and rollback. Stop for explicit human approval.

After approval, implement only the approved scope. At each stage, run the relevant structural, regression, and behavioural checks and present evidence. Stop for human approval before modifying safety-critical paths, adding dependencies, changing architecture, or continuing after a failed invariant. Never expose credentials or real student data. Finish by updating documentation, review evidence, and `docs/ai-use-log.yaml`.
