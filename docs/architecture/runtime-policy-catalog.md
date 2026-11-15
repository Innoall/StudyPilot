# Runtime Policy Catalog

Policies implement ADR-002 and the current 23-entry registry. They describe actual behavior and separate future OAuth work from implemented personal self-testing.

## Planning and data

- **Invalid form or workspace facts:** shared validation rejects the change with a safe message. Do not save partial invalid facts.
- **Invalid persisted workspace:** show a recovery warning and load an empty in-memory workspace without automatically replacing the unreadable stored record. A later explicit valid edit is a new save; preserve/recover backups before proceeding if required.
- **Browser storage failure:** keep valid changes in the current tab and prompt the user to download a backup before closing.
- **Invalid, unsupported-version or oversized backup:** reject before applying; retain current data. A valid backup is previewed and applied only on explicit replacement confirmation.
- **Source data changed after planning:** mark the old plan stale, cancel/invalidate older pending generation and require regeneration before exporting a current calendar.
- **No unfinished tasks:** guide the user to task entry and make no AI call.
- **Past deadline or insufficient capacity:** retain the task and report its unscheduled effort. Do not place work in the past, beyond availability or after its exact deadline.
- **Overlapping availability:** use its sorted union, preserve breaks and never count the same minutes twice.
- **Invalid clock or invariant failure:** reject/disable the dependent planning operation; block release until corrected. Do not downgrade an invariant to a warning merely to obtain a passing test.

## AI mode and service outcomes

- **Rules mode:** calculate the plan and local advice with no external AI request or key requirement.
- **Personal mode lacks key/model:** return the rule result with `unconfigured`; never borrow operator or another user's quota.
- **Server mode lacks a supported private configuration:** return the rule result with `unconfigured`. Configuration readiness is a boolean, not proof of live connectivity.
- **Provider timeout or network/non-2xx error:** preserve the deterministic result and return `timeout` or `unavailable`; do not retry automatically or expose provider response bodies.
- **Malformed, truncated, oversized or extra-authority output:** discard advice and return the rule result with `invalid-response`. Empty fields, wrong suggestion count, invented Task N references and reflected credentials are rejected.
- **Valid provider advice:** merge only summary and exactly three suggestions, set a successful source/status and keep all rule blocks unchanged. This does not prove subjective advice quality.
- **Context too large:** retain the nearest-deadline aliases within the conservative UTF-8 byte envelope and report omitted tasks. The rule planner still checks all valid tasks. Standing system constraints are always included unchanged.
- **Instruction-like source text:** raw task titles/course names/goal text are omitted from model context; only allowed aliases and fixed categories enter the request. No source or model text becomes a tool instruction.

## Canvas and identity

- **Personal-token testing disabled:** readiness reports disabled and POST returns 503. Local manual planning, synthetic data and JSON import remain available. Formal multi-user production requires approved OAuth.
- **Invalid or unapproved host/credential/action:** reject before a credential-bearing request. The browser cannot create an arbitrary server proxy.
- **Cross-origin browser request or insecure non-local HTTP:** reject through the provider boundary; normal private responses use no-store headers.
- **Canvas 401/403:** return a safe unauthorised error and preserve current data; the user checks their own token and permissions. No credential is echoed or silently refreshed.
- **Canvas 429:** show a rate-limit message and wait for user retry; do not start an automatic retry loop.
- **Timeout, wrong list shape, unsafe pagination/redirect, repeated pages or bounds exceeded:** abort sync with a safe failure and apply no partial import. Bounds include an overall 25-second adapter signal, 50 requests, 5 pages per collection, at most 20 active courses and 500 assignments.
- **Missing assignment deadline:** skip with an explicit warning instead of inventing a due time. Other valid records may be previewed.
- **Valid sync:** return a hashed current-user workspace identity and normalized data for review. Apply only after confirmation; repeated imports use stable IDs and preserve prior user effort/priority.
- **New Canvas identity:** select its separate local workspace, clear previous AI settings, invalidate pending work and prevent old responses from overwriting the new view. This is not a server-authenticated cloud session.
- **Disconnect:** clear page-held Canvas and AI credentials, cancel outstanding requests and return to the manual workspace. Local study data remains in its prior workspace; source Canvas data and tokens are not modified or revoked.
- **Remove imported data:** after confirmation, remove Canvas-source local records only. This does not delete anything from the school's Canvas.
- **OAuth token expiry/refresh:** future formal OAuth design, not current behavior. No automatic OAuth refresh or persisted token vault is claimed.

## Verification and release

Offline and fixed boundary evaluations never call real providers. Live test discovery without explicit opt-in skips clearly; required live-validation mode fails if dedicated credentials are missing. A skipped check, rule fallback or synthetic response cannot count as real integration success.

Unknown external errors fail closed for that adapter while preserving manual study data and rule planning. Keep logs and evidence free of credentials and raw student records. Human review, remote branch protection and protected live-evaluation settings remain separate required release evidence; local checks do not activate them.
