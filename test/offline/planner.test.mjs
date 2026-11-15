import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { generateRulePlan } from "../../src/lib/planner.ts";

const now = Date.parse("2026-11-16T08:00:00+08:00");
const clock = { now };
const course = { id: "c1", code: "TEST1001", name: "Test course", color: "#000000" };
const assignment = { id: "a1", courseId: "c1", title: "Verified task", dueAt: "2026-11-22T23:59:00+08:00", estimatedHours: 2, priority: "high", status: "todo" };
const slot = { day: 1, start: "18:00", end: "21:00" };
const totalHours = (result) => result.plan.reduce((sum, block) => sum + block.durationHours, 0);
const instant = (block, key) => Date.parse(`${block.date}T${block[key]}:00+08:00`);

test("FR-004 schedules eligible work when capacity exists", () => {
  const result = generateRulePlan([assignment], [course], [slot], clock);
  assert.equal(totalHours(result), 2);
  assert.equal(result.warnings.length, 0);
  assert.ok(result.plan.every((block) => block.date === "2026-11-16"));
});

test("INV-001 keeps every block within declared availability", () => {
  const result = generateRulePlan([assignment], [course], [slot], clock);
  for (const block of result.plan) {
    assert.ok(block.start >= slot.start);
    assert.ok(block.end <= slot.end);
    assert.ok(block.durationHours >= 0.5 && block.durationHours <= 1.5);
  }
});

test("INV-005 reports unscheduled work instead of overflowing capacity", () => {
  const result = generateRulePlan([{ ...assignment, estimatedHours: 6 }], [course], [{ ...slot, start: "18:00", end: "19:00" }], clock);
  assert.equal(totalHours(result), 1);
  assert.match(result.warnings[0], /5\.0 unscheduled hours/);
});

test("FR-004 excludes completed assignments", () => {
  const result = generateRulePlan([{ ...assignment, status: "done" }], [course], [slot], clock);
  assert.equal(result.plan.length, 0);
  assert.equal(result.warnings.length, 0);
});

test("FR-004 uses the Hong Kong weekday when UTC is still Sunday", () => {
  const result = generateRulePlan([{ ...assignment, estimatedHours: 1 }], [course], [{ day: 1, start: "00:30", end: "01:30" }], { now: Date.parse("2026-11-16T00:10:00+08:00") });
  assert.equal(result.plan.length, 1);
  assert.equal(result.plan[0].date, "2026-11-16");
  assert.equal(result.plan[0].start, "00:30");
});

test("INV-001 never schedules today in the past, including a partial minute", () => {
  const current = Date.parse("2026-11-16T20:10:25+08:00");
  const result = generateRulePlan([{ ...assignment, estimatedHours: 1 }], [course], [{ day: 1, start: "19:00", end: "22:00" }], { now: current });
  assert.ok(result.plan.length > 0);
  assert.equal(result.plan[0].start, "20:11");
  assert.ok(result.plan.every((block) => instant(block, "start") >= current));
});

test("INV-001 never places a morning deadline in an evening window", () => {
  const result = generateRulePlan([{ ...assignment, dueAt: "2026-11-16T10:00:00+08:00" }], [course], [{ day: 1, start: "19:00", end: "22:00" }], clock);
  assert.equal(result.plan.length, 0);
  assert.match(result.warnings.join(" "), /2\.0 unscheduled hours/);
});

test("INV-001 clips blocks to the exact deadline instead of its calendar day", () => {
  const task = { ...assignment, dueAt: "2026-11-16T20:15:00+08:00" };
  const result = generateRulePlan([task], [course], [{ day: 1, start: "19:00", end: "22:00" }], clock);
  assert.ok(result.plan.length > 0);
  assert.ok(result.plan.every((block) => instant(block, "end") <= Date.parse(task.dueAt)));
  assert.equal(totalHours(result), 1.25);
  assert.match(result.warnings.join(" "), /0\.75 unscheduled hours/);
});

test("INV-001 merges overlapping and repeated windows before scheduling", () => {
  const result = generateRulePlan([{ ...assignment, estimatedHours: 6 }], [course], [
    { day: 1, start: "20:00", end: "22:00" },
    { day: 1, start: "19:00", end: "21:00" },
    { day: 1, start: "19:00", end: "21:00" },
  ], clock);
  assert.ok(result.plan.length > 0);
  assert.ok(totalHours(result) <= 3);
  for (let i = 1; i < result.plan.length; i += 1) {
    assert.ok(instant(result.plan[i], "start") - instant(result.plan[i - 1], "end") >= 15 * 60_000);
  }
  assert.equal(new Set(result.plan.map((block) => block.id)).size, result.plan.length);
});

test("INV-001 sorts separate windows and preserves breaks across small gaps", () => {
  const tasks = [{ ...assignment, estimatedHours: 0.5 }, { ...assignment, id: "a2", estimatedHours: 0.5 }];
  const result = generateRulePlan(tasks, [course], [
    { day: 1, start: "19:40", end: "20:30" },
    { day: 1, start: "19:00", end: "19:30" },
  ], clock);
  assert.equal(result.plan.length, 2);
  assert.equal(result.plan[0].start, "19:00");
  assert.equal(result.plan[1].start, "19:45");
});

test("FR-004 an infeasible early deadline does not block another eligible task", () => {
  const expiredToday = { ...assignment, id: "early", dueAt: "2026-11-16T10:00:00+08:00" };
  const result = generateRulePlan([expiredToday, assignment], [course], [slot], clock);
  assert.equal(totalHours(result), assignment.estimatedHours);
  assert.ok(result.plan.every((block) => block.assignmentId === assignment.id));
  assert.equal(result.warnings.length, 1);
});

test("FR-004 prioritises the earliest deadline and uses priority to break ties", () => {
  const tasks = [
    { ...assignment, id: "later", dueAt: "2026-11-18T10:00:00+08:00", priority: "high", estimatedHours: 0.5 },
    { ...assignment, id: "low", dueAt: "2026-11-17T10:00:00+08:00", priority: "low", estimatedHours: 0.5 },
    { ...assignment, id: "high", dueAt: "2026-11-17T10:00:00+08:00", priority: "high", estimatedHours: 0.5 },
  ];
  const result = generateRulePlan(tasks, [course], [{ day: 1, start: "18:00", end: "21:00" }], clock);
  assert.deepEqual(result.plan.map((block) => block.assignmentId), ["high", "low", "later"]);
});

test("INV-005 overdue work remains visible as unscheduled rather than being moved after its deadline", () => {
  const result = generateRulePlan([{ ...assignment, dueAt: "2026-11-15T23:59:00+08:00" }], [course], [slot], clock);
  assert.equal(result.plan.length, 0);
  assert.match(result.warnings.join(" "), /2\.0 unscheduled hours/);
  assert.match(result.warnings.join(" "), /deadline/i);
});

test("INV-005 absent and invalid windows cannot create availability", () => {
  for (const availability of [[], [{ day: 1, start: "21:00", end: "19:00" }], [{ day: 1, start: "bad", end: "19:00" }], [{ day: 7, start: "18:00", end: "21:00" }]]) {
    const result = generateRulePlan([assignment], [course], availability, clock);
    assert.equal(result.plan.length, 0);
    assert.match(result.warnings.join(" "), /2\.0 unscheduled hours/);
  }
});

test("FR-004 planning horizon includes exactly seven Hong Kong calendar dates", () => {
  const result = generateRulePlan([{ ...assignment, estimatedHours: 40, dueAt: "2026-12-01T23:59:00+08:00" }], [course], Array.from({ length: 7 }, (_, day) => ({ day, start: "18:00", end: "19:00" })), clock);
  assert.deepEqual(result.plan.map((block) => block.date), ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.equal(totalHours(result), 7);
});

test("INV-005 avoids stranding a fifteen-minute task tail when a 30-minute block fits", () => {
  const result = generateRulePlan([{ ...assignment, estimatedHours: 1 }], [course], [{ day: 1, start: "18:00", end: "18:45" }, { day: 2, start: "18:00", end: "18:30" }], clock);
  assert.equal(totalHours(result), 1);
  assert.equal(result.warnings.length, 0);
  assert.ok(result.plan.every((block) => block.durationHours >= 0.5));
});

test("INV-005 invalid task values are reported and never create invalid blocks", () => {
  for (const patch of [{ estimatedHours: -1 }, { estimatedHours: Infinity }, { dueAt: "invalid" }, { courseId: "missing" }]) {
    const result = generateRulePlan([{ ...assignment, ...patch }], [course], [slot], clock);
    assert.equal(result.plan.length, 0);
    assert.ok(result.warnings.length > 0);
  }
});

test("FR-004 repeated execution is deterministic and never mutates source data", () => {
  const input = { tasks: [assignment], courses: [course], availability: [slot] };
  const before = structuredClone(input);
  const first = generateRulePlan(input.tasks, input.courses, input.availability, clock);
  const second = generateRulePlan(input.tasks, input.courses, input.availability, clock);
  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
});

test("PERF-001 p95 stays below 200ms for 100 assignments and 14 windows", (t) => {
  const tasks = Array.from({ length: 100 }, (_, i) => ({ ...assignment, id: `task-${i}`, estimatedHours: 4 }));
  const windows = Array.from({ length: 14 }, (_, i) => ({ day: i % 7, start: i < 7 ? "09:00" : "18:00", end: i < 7 ? "12:00" : "22:00" }));
  const timings = Array.from({ length: 30 }, () => {
    const start = performance.now();
    generateRulePlan(tasks, [course], windows, clock);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  assert.ok(timings[28] < 200, `p95: ${timings[28].toFixed(2)}ms`);
  t.diagnostic(`30 runs; p95 ${timings[28].toFixed(2)}ms; Node ${process.versions.node}; ${process.platform}/${process.arch}`);
});
