import test from "node:test";
import assert from "node:assert/strict";
import { syncCanvas } from "../../src/lib/canvas.ts";

// Optional, current-user read-only checks. No credential files or raw records are
// read by the test runner or emitted as artifacts. The adapter consumes the token.
const configured = Boolean(process.env.STUDYPILOT_TEST_CANVAS_TOKEN);
const required = process.env.REQUIRE_CANVAS_LIVE_TESTS === "1";
const enabled = required || process.env.RUN_CANVAS_LIVE_TESTS === "1";
const baseUrl = process.env.STUDYPILOT_TEST_CANVAS_BASE_URL || "https://canvas.cityu.edu.hk";
const connection = { baseUrl, accessToken: process.env.STUDYPILOT_TEST_CANVAS_TOKEN || "", action: "verify" };
const dependencies = { env: { NODE_ENV: "test", CANVAS_ALLOWED_HOSTS: process.env.STUDYPILOT_TEST_CANVAS_ALLOWED_HOSTS } };

test("FR-006 live Canvas verification requires a dedicated current-user credential", { skip: !enabled || (!configured && !required) ? "Canvas checks require explicit opt-in and a dedicated token; no real Canvas validation claimed" : false }, () => {
  assert.ok(configured, "Canvas release validation requires a dedicated, authorised current-user test token");
});

test("SEC-001 live Canvas self-verification returns an isolated workspace without credentials", { skip: !enabled || !configured ? "Canvas opt-in or dedicated test token unavailable" : false, timeout: 30_000 }, async () => {
  let result;
  try { result = await syncCanvas(connection, dependencies); }
  catch { throw new Error("Live Canvas self-verification failed; inspect host, token expiry and permissions privately"); }
  assert.match(result.profile.workspaceId, /^[a-f0-9]{64}$/);
  assert.equal(typeof result.profile.displayName, "string");
  assert.equal(JSON.stringify(result).includes(process.env.STUDYPILOT_TEST_CANVAS_TOKEN), false);
  assert.equal(result.courses.length, 0);
  assert.equal(result.assignments.length, 0);
});

test("FR-006 live Canvas sync returns only normalized current-user courses and tasks", { skip: !enabled || !configured || process.env.STUDYPILOT_TEST_CANVAS_ALLOW_SYNC !== "1" ? "Full read-only sync requires an explicit test-account opt-in" : false, timeout: 30_000 }, async () => {
  let result;
  try { result = await syncCanvas({ ...connection, action: "sync" }, dependencies); }
  catch { throw new Error("Live Canvas sync failed; inspect configuration privately without publishing returned records"); }
  assert.match(result.profile.workspaceId, /^[a-f0-9]{64}$/);
  assert.ok(result.courses.length <= 20);
  assert.ok(result.assignments.length <= 500);
  const ids = new Set(result.courses.map((course) => course.id));
  assert.ok(result.assignments.every((assignment) => ids.has(assignment.courseId) && Number.isFinite(Date.parse(assignment.dueAt))));
  assert.equal(JSON.stringify(result).includes(process.env.STUDYPILOT_TEST_CANVAS_TOKEN), false);
});
