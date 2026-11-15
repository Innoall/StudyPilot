# Memory and State Design

## Device-local study facts

The browser owns the validated `AppData` fields: courses, assignments, weekly availability and weekly goal. `src/lib/data.ts` strips unrecognized fields before persistence or export. The manual workspace retains the existing `studypilot-data-v1` key. A connected Canvas identity selects `studypilot-canvas-<workspace hash>`, derived by the server from the approved service origin and current-user source ID.

Each Canvas identity has a separate local workspace. A successful identity switch restores only that workspace and clears transient plan, search/filter, dialogs and AI settings. Async generation, sync and file-import results are invalidated when their originating workspace changes. This is device-local application separation, not an authenticated cloud account or cross-device synchronization. Browser-profile access still allows a person to inspect stored study data.

## Transient state and credentials

Canvas access tokens, personal AI keys, selected AI mode/model/provider, profile display name, import previews and generated plan results live only in the current page session. They are excluded from localStorage, sessionStorage, cookies and backups. A key is sent in a same-origin request body over HTTPS, except localhost development; the server uses it only for that request, never a global key cache.

Canvas's visible token input resets after success. Disconnect clears page-held Canvas and AI keys and returns to the manual workspace. Switching Canvas identity clears the old AI setting. Refresh or closing the page requires re-entry; an optional server AI mode instead reads the operator's private environment configuration. No user credential vault, OAuth refresh token store or server study-data table is implemented.

## Write, retrieval and recovery

All edits and merges pass `parseAppData` before writing. Existing valid v1 facts remain compatible. Invalid saved data produces a recovery message and an empty in-memory workspace; the invalid stored record is not automatically overwritten. A later explicit valid edit is a new write, so users should recover/export their original backup before making changes if needed. Storage failure preserves the current tab's changes and prompts the user to download a backup.

Backup JSON contains `schemaVersion: 1`, export time and validated study data. Files are size-bounded, parsed and validated before preview. Restoration replaces the active workspace only after user confirmation. Unknown versions and malformed records do not mutate current data. A downloaded backup is a user-managed copy containing course/task data; it does not contain connection keys.

Canvas import is a confirmed idempotent merge. Stable source identifiers update the same course/task rather than duplicating it. Source deadlines and submission status update while prior user effort and priority are retained. Removing imported data deletes Canvas-source facts from the current local workspace only; it does not revoke a token or modify source records in Canvas.

## Ownership and retention

Local study data persists until the user removes it or clears site/browser storage; no automatic 30-day expiry is claimed. This slice does not persist study facts or user keys on the server. Generated advice and previews are ephemeral unless a user manually exports or copies them. Users manage copies they download and the AI provider's own service-side retention follows that provider's terms.

The server returns a workspace hash and display name only to the requester; the name remains transient and never enters the AI fact context. AI requests omit raw course names, task titles, source IDs and original goal text. Infrastructure operators must disable credential-bearing request-body logging and keep authenticated deployment boundaries appropriate to any shared quota.

## Versioning and future OAuth

Requirement, prompt and evaluation versions are repository metadata, not a store of student payloads. Schema changes must define migration or safe rejection before changing saved formats. ADR-002 governs the current request-local keys. Formal shared OAuth would require a new reviewed design for authenticated ownership, encrypted server token storage, refresh/revocation, retention and deletion; those mechanisms are not represented as current features.
