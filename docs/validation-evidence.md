# Validation evidence — 2026-11-16

Environment: macOS arm64, Node.js 24.22.1. This record describes local verification; no remote deployment or paid provider call is included.

## Readability and spacing maintenance — 2026-11-16

The user approved the concrete typography, spacing and responsive acceptance plan with “是” before implementation. This revision is CSS-only and preserves the existing provider and credential behavior. The checks below are fresh evidence for this styling change, separate from earlier implementation and connection-repair results.

- The initial `npm run verify` completed with exit 0: 23 requirements validated, structural checks, TypeScript, lint, 65 offline regression tests, 13 fixed evaluations and production build passed.
- Using isolated synthetic coursework, all five tabs were checked at 1440px, 1280px, 1024px, 800px, 390px and 320px. Each tab had zero document-level horizontal overflow.
- At 320px, the task editor measured 286px client width and 286px scroll width. A long synthetic task title was saved successfully; task selectors displayed at 16px in a full single-column layout; 19:00 and 22:00 time values remained readable.
- A real local rule plan generated with `aiStatus: disabled`. This styling acceptance made no real provider request and consumed no AI quota. No real student content, credential values or environment values were inspected.
- Read-only review prompted minor CSS refinements: the base section heading is 22px and icon controls are 44px. **Final full re-verification after these refinements passed with exit 0**: 23 requirements, structure, type checking, lint, 65 offline tests, 13 fixed evaluations and production build. Existing user-page Canvas verification and personal CityU AI last-generation success were confirmed by safe status-only checks after validation. No new external request or quota was used during the styling work. Screenshots: `StudyPilot-readable-desktop.png` and `StudyPilot-readable-mobile.png` in the current chat outputs.

These observations establish local synthetic presentation behavior, not a new remote upload, deployment, provider release evaluation or independent human review.

## Completed checks

- `npm run verify`: passed, including actual requirements-schema validation (strict supported subset), structural/credential/dependency checks, TypeScript, ESLint, 56 offline regression tests, 13 fixed evaluation/prompt-consistency tests and production build.
- `npm ls --depth=0`: exit 0. The existing developer installation contains extraneous cached packages; no new dependency was added and the lockfile's declared dependency set is unchanged.
- `git diff --check`: passed before final packaging.
- Planner benchmark: 100 assignments, 14 windows, 30 runs; final measured p95 0.19 ms on this environment versus the 200 ms requirement. This is a local benchmark, not a production latency promise.
- `npm run test:live`: six tests explicitly skipped because no dedicated opt-in or credentials were provided. Zero real provider requests were made; skipped tests are not counted as passes.

## Browser acceptance

Chrome headless at 1440×1100 and 390×844. The actual local application and rule API were used for manual coursework and planning. External Canvas responses were intercepted with synthetic identities for isolation tests. All 13 cases below passed, and the main-flow run recorded zero page errors.

1. Add a course and assignment through the actual dialogs.
2. Generate a nonempty rule schedule through the real `/api/plan`; exact Hong Kong time blocks display and calendar export enables.
3. Reload restores study facts; task editing saves and invalidates old plans.
4. Canvas preview/confirmation selects a separate local workspace, using a synthetic response.
5. Personal Canvas and AI keys do not appear in localStorage values.
6. Switching synthetic Canvas identity clears the previous user's AI mode/key and token field.
7. Disconnect restores the manual workspace without mixing imported Canvas records.
8. Downloaded backup contains the correct version and study facts, without credentials.
9. Mobile navigation and task controls work without page-level horizontal overflow.
10. Changing AI provider clears an unsaved key before another provider can receive it.
11. Switching identity closes an already-open editor from the prior workspace.
12. A delayed backup read released after disconnect cannot open an import in another workspace.
13. A cancelled Canvas request cannot overwrite the disconnected session's message/state.

Screenshots were visually inspected: readable desktop schedule, mobile controls, no overlapping text or unintended page overflow. The raw local QA logs and screenshots are retained in this chat's work/output area; this summary distinguishes mocked provider checks from real local UI behavior.

## Required external evidence

Real Canvas permission/API behavior, real model usefulness and billing, production OAuth, remote CI runs, protected environments/branches and independent human review were not established by these checks. Opt-in live tests and documented CI configuration are provided to gather those facts without manufacturing evidence.

## Visual refresh and repository preparation — 2026-11-16

The same project was copied into the user-selected `SE final` workspace, retaining its prior local Git history. The layout and styling were refreshed across all five pages without changing scheduling or credential behavior. Two real CLI integration checks were added for portable production startup, taking the offline total to 58; all 58 offline and 13 fixed evaluation tests, type/lint/schema/structure checks and production build passed. `npm start -- --port 5180` then served the homepage and configuration endpoint with HTTP 200 and was stopped after verification.

The UI was checked using synthetic coursework on the separate IPv6 loopback origin, keeping the user's normal localhost workspace untouched. At 1440px, editing remaining hours and generating a real rule schedule succeeded. At 390px, the plan and navigation worked; an overflow in the hidden file inputs on Connections was found and corrected with properly clipped 1px controls. Screenshots are retained in the current chat outputs. The final width check confirmed all five pages fit 390px; both hidden file inputs measured 1×1px. Wide checks at 1440px and 1920px also had no page overflow, and the browser reported no console errors in the final review.

GitHub uploads use the already signed-in Chrome account and a private `Innoall/StudyPilot` repository. Browser uploads produce new transport commits; the inherited source history remains in the local repository. Files are checked against a sanitized source manifest; user credentials, dependencies and runtime/build files are excluded. The temporary extension file-URL permission is restored after uploads. Upload completion must be established from the repository and remote archive, not inferred from this preparation record.

## Canvas connection correction — 2026-11-16

The user approved the concrete repair and eight-case test plan with “批准修复并测试”. Diagnostics used no real credentials: a synthetic-token request to the running local API reproduced the original unavailable error; isolated workerd execution rejected `redirect: "error"` before any outbound request. An old compatibility date also rejected `cache: "no-store"`. Unauthenticated workerd requests without User-Agent received a CloudFront 403; the honest `StudyPilot/0.2` identifier reached Canvas and received normal 401 JSON.

Both adapters now reject redirects using supported manual mode and existing non-success handling; Canvas explicitly reports a safe redirect failure. Canvas identifies the application, and the runtime date is pinned to `2026-05-15` to support no-store. The initial attempt to add a redundant cache compatibility flag prevented runtime startup, so the final implementation selects its supported default by date instead. The generated `dist/server/wrangler.json` contains that exact date and `nodejs_compat`. No dependencies or credential-storage rules changed.

After restart, the actual local API with the same synthetic invalid token returned HTTP 401 / `unauthorised`, replacing the original transport failure; the homepage returned HTTP 200. Five new runtime tests execute the actual bundled adapters in Miniflare, intercepting every outbound call with synthetic responses and making no provider/network calls. Together with two new provider regression cases, these verify normal Canvas mapping/AI advice, correct authentication failure, and 301/302/303/307/308 rejection without a second destination request, credential reflection, shared-quota fallback or schedule changes.

`npm run verify` passed: 23 requirements, structural/credential/dependency checks, TypeScript, ESLint, **65 offline tests**, **13 fixed evaluations**, and the production build. The first lint run scanned a leftover copy of source created for the earlier browser upload under ignored `work/github-upload`; it was moved to a recoverable temporary directory outside the repository, without changing the vendored source or lint rules. The complete rerun passed, as did `git diff --check`.

For personal testing, the user entered their own token directly in Chrome and reported “读取成功，出现导入预览”. Subsequent safe UI inspection confirmed the application displayed `Import applied. Review estimated hours and regenerate the plan.` No real token, course/task text, login cookie or environment secret was inspected. The build later refreshed the development page, clearing its transient connection as designed. The final screenshot shows the connection entry after that refresh; it does not claim to capture the earlier success notice. The user was informed that reconnecting with the same token restores their corresponding workspace. The earlier success is evidence for the user's controlled personal Canvas connection and import, not production OAuth, formal live-suite completion or real-model evaluation. No actual AI request or AI quota was used. This correction is local; it has not been uploaded or deployed remotely in this repair session.
