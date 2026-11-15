# Coding-Agent Tool Manifest

| Role | Allowed tools | Conditions |
|---|---|---|
| Planner | repository read/search | no secrets or production data |
| Builder | scoped patching, declared dependency install | approved plan only |
| Verifier | tests, type-check, build, static inspection | read-only except generated reports |
| Release manager | GitHub workflow and deployment tooling | all blocking gates passed |

Network access is deny-by-default except declared dependency installation, approved documentation lookup, provider contract tests, and deployment. Agents may not call Canvas or school AI with real student data during coding sessions.
