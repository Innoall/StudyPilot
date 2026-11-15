# Risk List

| Risk / assumption | Impact | Mitigation | Review trigger |
|---|---|---|---|
| CityUHK does not approve a scoped OAuth Developer Key | Formal multi-user Canvas connection unavailable | Personal self-testing and synthetic import stay clearly separated; manual workflow remains usable | Administrator response / proposed shared deployment |
| Manual access tokens are mistaken for production multi-user OAuth | Incorrect release claim and vendor-policy conflict | Production token self-testing disabled by default; official policy linked in UI guidance and README | Any public/multi-user launch |
| Provider model availability, parameters or quota differ | AI unavailable or unanticipated cost | Fixed providers; user-selected model/key; bounded single request; safe rule fallback; opt-in real evaluation | Provider/model change or live failure |
| Estimated hours are inaccurate | Incomplete or unrealistic workload | Editable remaining effort and exact unscheduled warnings | User acceptance feedback |
| Malicious AI/provider response | Advice or data exfiltration attempt | Minimized alias-only context, no tools, strict response fields, no schedule authority, blocked key echoes | Any prompt/provider adapter change |
| Browser-local data is cleared or storage fails | Lost coursework data | Previewed versioned backups, visible storage errors, no automatic credential persistence | Storage failure / device change |
| Local workspace separation is mistaken for authenticated cloud accounts | Shared-device privacy expectations are wrong | Document device-local scope; do not advertise cloud login or cross-device isolation | New account/sync requirement |
| Credential persists in future feature code | Quota misuse or exposure | Static patterns, allowlisted AppData, backup tests, browser lifecycle tests and independent review | Any storage, import or connection change |
| A stale asynchronous callback crosses identity | Wrong user data or key used | Epoch/request IDs, abort, workspace/dialog/key reset; browser race cases | Any async connection/import change |
| Remote CI protection or real-provider evidence is omitted | Ungoverned merge or unsupported integration claim | Trusted-base approval verifier, documented bootstrap/branch rules and protected opt-in live environment | Every proposed release |
