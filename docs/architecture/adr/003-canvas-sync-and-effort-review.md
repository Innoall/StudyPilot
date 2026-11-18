# ADR-003: Canvas effort review, session sync and recoverable local corrections

- Status: accepted for interactive implementation; verification is pending and independent GitHub review is not implied.
- Date: 2026-11-18, Asia/Hong_Kong.
- Sources: the user's three real-use observations about uniform two-hour estimates, convenient Canvas fetching and expired assignments; the concrete execution plan and 20 test scenario groups presented in `StudyPilot-Canvas-UX-plan-2026-11-18.md`; the user's explicit reply “是” to the implementation and test approval question.
- Extends: ADR-002's preview/merge contract for a user-authorised page session. It does not replace the baseline modules or change credentials, OAuth, provider restrictions, AI authority or deterministic scheduling constraints.

## Problem and decision

Canvas does not supply StudyPilot's remaining study effort. A fixed two-hour value therefore needs an explicit provisional label and confirmation workflow. Repeated previews also make routine updates cumbersome, while unconditional source merging can undo local corrections and resurrect deleted items. Historical coursework should remain accessible without filling the default current-work list.

Keep the existing normaliser, validated study-data boundary, read-only Canvas adapter and deterministic planner. Extend their contracts with optional, validated study metadata and the following UI policy.

### Effort is provisional until confirmed

New Canvas assignments carry a two-hour provisional value and an unconfirmed effort marker. A legacy Canvas task without a marker retains its existing hours and is shown as needing review; the application must not infer confirmation from the number alone. Manual tasks retain their existing behaviour.

Users can confirm individual hours or edit a selected group atomically, either per task or with a common value. Only explicit confirmation or saving the selected hours confirms effort. Editing a title, status or priority alone cannot confirm a provisional estimate. The existing 0.5–200-hour limits continue to apply. Repeated sync preserves effort and its confirmation marker.

Unconfirmed effort does not disappear from the planner. Generation and result views identify its provisional status and provide a review route, while the existing rule planner still schedules valid work or reports it as unscheduled. AI does not invent effort values.

### First preview authorises only the selected page-session scope

The first fetch shows a validated preview with proposed additions, updates and skipped records. New imports default to unfinished assignments whose exact deadlines are later than the current instant; the user can explicitly include expired or completed records. Existing saved assignments remain eligible for source updates even if they are now historical.

The first import can be confirmed once or confirmed with an explicit choice to enable automatic sync for this page session and current Canvas identity. Later same-session automatic updates may apply under that choice without repeating the preview. No automatic application occurs before the first confirmed import. A task-page sync action and a visible last-success time provide immediate control and feedback.

Automatic sync checks at five-minute intervals only while the page is visible, connected and idle. Returning to the page may check only when the interval is due. Requests cannot overlap. Open editing, import or batch-review dialogs defer application so draft changes are not replaced. A no-op sync does not invalidate a current plan; changes to planning facts do. Automatic sync neither calls AI nor generates a plan.

Refresh, page closure, disconnect, identity change and a new connection clear the session authorisation and cancel or invalidate pending work. Restoring a backup invalidates work that could otherwise overwrite the replacement. A result must merge with the latest validated state for its own identity, never a captured pre-request workspace. Unauthorised and rate-limited responses pause automatic sync for explicit retry; other failures preserve local data and expose a bounded safe status.

### Explicit local corrections and exclusions survive sync

User effort, priority, in-progress state and course display choices are local settings. Source-field corrections to an assignment's title, course, deadline or status are marked explicitly as local overrides. The most recently validated Canvas values are retained as source metadata so the UI can distinguish the local choice and restore source-following behaviour. A correction changes the local planning facts, not the school record. Source updates continue for fields without a local override. Neither model output nor an unlabelled merge can become a deadline correction.

Confirmed deletion of an imported course or assignment creates a bounded source exclusion in that identity's study data. Later sync does not silently re-add it. A visible recovery control removes an exclusion so the user can import the source again. Deleting a course also handles its tasks without leaving invalid course references. A missing item in a single sync is not evidence authorising automatic local deletion. Manually created records are preserved.

### Current work is the default view, not a deletion policy

Upcoming shows unfinished tasks with `dueAt > now`, sorted by deadline. Overdue, Completed and All remain explicit views, composable with course, search and compatible status/effort filters. At the exact deadline instant an unfinished task is overdue. A visible count and route to hidden overdue work prevent an empty current-work list from implying lost records. Dashboard current workload uses future unfinished tasks with separate historical counts.

Filtering changes presentation and default new-import selection only. Previously saved historical tasks remain in local storage and backups and still receive source updates; a source extension may return them to Upcoming. The planner continues to inspect all saved work and explicitly reports unplaceable overdue effort.

## State and interface consequences

`src/lib/planner.ts` receives type additions only; its schedule algorithm and public calculation contract stay intact. `src/lib/canvas-data.ts` labels normalised effort. `src/lib/data.ts` owns validation, compatibility, pure view/batch helpers, idempotent source merging, exclusions and merge statistics. `src/app/page.tsx` owns session authorisation, concurrency control and UI. Styles extend the existing responsive design. No new dependency, credential store or background service is introduced.

New optional metadata consists only of learning facts and source-management choices: effort confirmation, local overrides, last source values and bounded exclusions. Legacy workspaces and v1 backups remain readable. New backups retain this metadata, but exclude credentials, profile display identity, connection settings, automatic-sync authorisation and timers. Exclusions are cleared with imported data. The existing user-owned local retention and deletion policy is unchanged; source-management metadata follows the same workspace lifecycle as the associated study facts.

## Alternatives and tradeoffs

- Keep a single warning for two-hour defaults: rejected because individual provisional values remain indistinguishable after import.
- Block planning until every effort is confirmed: rejected because manual planning should remain available with clear provisional feedback and no silent effort loss.
- Persist credentials for background sync: rejected; automatic work is limited to the existing page-memory connection lifetime.
- Silently synchronise all records on first connection: rejected; first-import scope and automatic application require explicit user confirmation.
- Always overwrite or always freeze source fields: rejected; labelled per-field local corrections with a restore route preserve both source updates and user intent.
- Delete old work permanently or delete records absent from a response: rejected; default filtering and recoverable exclusions meet the user need without interpreting incomplete source absence as deletion authority.

## Verification and rollback

Trace to FR-001/002/006/007/009, QA-001, SEC-001/002, PRIV-001/002, INV-001/002/006 and COST-001. The approved 20 scenario groups are recorded in `docs/test-approvals/plan.md`; new pure-domain cases belong in `test/offline/canvas-ux.test.mjs`, supplemented by existing adapter/API/evaluation suites and synthetic browser acceptance. Required complete checks and actual observations must be recorded after execution in the review memo and validation evidence, not inferred from this accepted design.

Disable session automatic sync to return to manual preview-based updates. Source rollback must preserve the previously verified changes and the user's data; export a current backup before downgrading because an older application may discard the new optional metadata when saving. A failed safety invariant blocks dependent work until addressed under the supervised workflow. No remote upload, deployment, independent review, production OAuth approval or live-provider validation is established by this ADR.
