import test from "node:test";
import assert from "node:assert/strict";
import { CanvasSyncSession, CANVAS_SYNC_INTERVAL_MS } from "../../src/lib/canvas-session.ts";

const now = Date.parse("2026-11-18T10:00:00+08:00");
const automatic = { automatic: true, visible: true, editing: false };
function confirmedSession(enabled = true) {
  const session = new CanvasSyncSession();
  const first = session.begin(now);
  assert.ok(first);
  assert.ok(session.succeed(first, now + 1000));
  assert.ok(session.confirmImport(enabled));
  return session;
}

test("FR-006/009 automatic reads require a successful read and explicit import opt-in", () => {
  const session = new CanvasSyncSession();
  assert.equal(session.begin(now, automatic), null);
  assert.equal(session.confirmImport(true), false);
  const first = session.begin(now);
  assert.ok(first);
  assert.equal(session.confirmImport(true), false);
  assert.ok(session.succeed(first, now + 1000));
  assert.equal(session.begin(now + CANVAS_SYNC_INTERVAL_MS, automatic), null);
  assert.ok(session.confirmImport(false));
  assert.equal(session.begin(now + CANVAS_SYNC_INTERVAL_MS, automatic), null);
  assert.ok(session.confirmImport(true));
  assert.ok(session.begin(now + CANVAS_SYNC_INTERVAL_MS, automatic));
});

test("FR-006/009 five-minute policy pauses for hidden pages, editors and early or overlapping requests", () => {
  const session = confirmedSession();
  const due = now + CANVAS_SYNC_INTERVAL_MS;
  assert.equal(session.begin(due - 1, automatic), null);
  assert.equal(session.begin(due, { automatic: true }), null);
  assert.equal(session.begin(due, { ...automatic, visible: false }), null);
  assert.equal(session.begin(due, { ...automatic, editing: true }), null);
  const request = session.begin(due, automatic);
  assert.ok(request);
  assert.equal(session.begin(due), null);
  assert.equal(session.begin(due + CANVAS_SYNC_INTERVAL_MS, automatic), null);
  assert.ok(session.succeed(request, due + 1000));
  assert.equal(session.begin(due + 2000, automatic), null);
  assert.ok(session.begin(due + 2000)); // An explicit manual read need not wait.
});

test("FR-006/QA-001 transient failures wait a full interval and never form an immediate retry loop", () => {
  const session = confirmedSession();
  const due = now + CANVAS_SYNC_INTERVAL_MS;
  const request = session.begin(due, automatic);
  assert.ok(session.fail(request, 502));
  assert.equal(session.snapshot.paused, false);
  assert.equal(session.snapshot.lastSuccessAt, now + 1000);
  assert.equal(session.begin(due + 1, automatic), null);
  assert.equal(session.begin(due + CANVAS_SYNC_INTERVAL_MS - 1, automatic), null);
  assert.ok(session.begin(due + CANVAS_SYNC_INTERVAL_MS, automatic));
});

test("FR-006/009/QA-001 authentication and rate limits pause automatic work until manual success", () => {
  for (const status of [401, 403, 429]) {
    const session = confirmedSession();
    const due = now + CANVAS_SYNC_INTERVAL_MS;
    const request = session.begin(due, automatic);
    assert.ok(session.fail(request, status));
    assert.equal(session.snapshot.paused, true);
    assert.equal(session.begin(due + CANVAS_SYNC_INTERVAL_MS * 5, automatic), null);
    const retry = session.begin(due + CANVAS_SYNC_INTERVAL_MS * 5);
    assert.ok(retry);
    assert.ok(session.succeed(retry, due + CANVAS_SYNC_INTERVAL_MS * 5 + 1000));
    assert.equal(session.snapshot.paused, false);
    assert.ok(session.begin(due + CANVAS_SYNC_INTERVAL_MS * 6, automatic));
  }
});

test("PRIV-002 disconnect, identity switch and backup resets invalidate late results and authorization", () => {
  for (const reason of ["disconnect", "identity-switch", "backup-restore"]) {
    const session = confirmedSession();
    const old = session.begin(now + CANVAS_SYNC_INTERVAL_MS, automatic);
    assert.ok(old, reason);
    session.reset();
    assert.equal(session.isCurrent(old), false);
    assert.equal(session.succeed(old, now + CANVAS_SYNC_INTERVAL_MS + 1000), false);
    assert.equal(session.fail(old, 401), false);
    assert.deepEqual(session.snapshot, {
      confirmed: false, automatic: false, paused: false, inFlight: false,
      lastAttemptAt: null, lastSuccessAt: null,
    });
    assert.equal(session.begin(now + CANVAS_SYNC_INTERVAL_MS * 2, automatic), null);
    const next = session.begin(now + CANVAS_SYNC_INTERVAL_MS * 2);
    assert.ok(next);
    assert.notEqual(old.epoch, next.epoch);
    assert.equal(session.isCurrent(old), false);
    assert.equal(session.isCurrent(next), true);
  }
});

test("FR-006/009 disabling automatic sync preserves manual work and stale settlements cannot unlock a new request", () => {
  const session = confirmedSession();
  session.disableAutomatic();
  assert.equal(session.snapshot.confirmed, true);
  assert.equal(session.begin(now + CANVAS_SYNC_INTERVAL_MS, automatic), null);
  const first = session.begin(now + 2000);
  assert.ok(first);
  assert.ok(session.succeed(first, now + 3000));
  const next = session.begin(now + 4000);
  assert.ok(next);
  assert.equal(session.succeed(first, now + 5000), false);
  assert.equal(session.fail(first, 429), false);
  assert.equal(session.snapshot.inFlight, true);
  assert.equal(session.isCurrent(next), true);
});

test("FR-006 invalid clocks cannot start requests or make a failed read appear successful", () => {
  const session = new CanvasSyncSession();
  for (const time of [NaN, Infinity, -1]) assert.throws(() => session.begin(time), RangeError);
  assert.equal(session.snapshot.inFlight, false);
  const request = session.begin(now);
  assert.throws(() => session.succeed(request, NaN), RangeError);
  assert.equal(session.snapshot.lastSuccessAt, null);
  assert.equal(session.isCurrent(request), true);
  assert.ok(session.fail(request));
  assert.equal(session.confirmImport(true), false);
});
