import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { hongKongDate, hongKongDateTimeInput, hongKongDayStart, hongKongWeekday, parseHongKongDateTime } from "../../src/lib/time.ts";

test("FR-002 Hong Kong deadline inputs round-trip to the same instant", () => {
  assert.equal(parseHongKongDateTime("2026-11-16T19:30"), "2026-11-16T11:30:00.000Z");
  assert.equal(hongKongDateTimeInput("2026-11-16T11:30:00.000Z"), "2026-11-16T19:30");
  assert.equal(parseHongKongDateTime("2028-02-29T00:00"), "2028-02-28T16:00:00.000Z");
});

test("FR-002 impossible calendar dates and malformed times cannot be normalised silently", () => {
  for (const value of ["2026-02-29T12:00", "2026-02-30T12:00", "2026-13-01T12:00", "2026-11-16T24:00", "2026-11-16T12:60", "16/11/2026 12:00", ""]) {
    assert.throws(() => parseHongKongDateTime(value), RangeError);
  }
});

test("FR-004 Hong Kong dates and weekdays cross UTC midnight and year end correctly", () => {
  const now = "2026-12-31T16:05:00.000Z";
  assert.equal(hongKongDate(now), "2027-01-01");
  assert.equal(hongKongWeekday(now), 5);
  assert.equal(hongKongDayStart(now), Date.parse("2026-12-31T16:00:00.000Z"));
});

test("FR-004 invalid timestamps fail rather than producing NaN calendar labels", () => {
  for (const value of ["invalid", NaN, new Date("invalid")]) {
    assert.throws(() => hongKongDate(value), RangeError);
    assert.throws(() => hongKongDateTimeInput(value), RangeError);
  }
});

test("INV-001 identical input produces identical schedules under UTC and US server timezones", () => {
  const script = `
    import { generateRulePlan } from './src/lib/planner.ts';
    const courses = [{id:'c', code:'TEST', name:'Test', color:'#000000'}];
    const tasks = [{id:'a',courseId:'c',title:'Task',dueAt:'2026-11-17T23:59:00+08:00',estimatedHours:1,priority:'high',status:'todo'}];
    process.stdout.write(JSON.stringify(generateRulePlan(tasks,courses,[{day:1,start:'00:30',end:'01:30'}],{now:Date.parse('2026-11-16T00:10:00+08:00')})));
  `;
  const output = (timezone) => execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
    cwd: new URL("../../", import.meta.url), env: { ...process.env, TZ: timezone }, encoding: "utf8",
  });
  const utc = output("UTC");
  assert.equal(output("America/Los_Angeles"), utc);
  assert.equal(JSON.parse(utc).plan[0].date, "2026-11-16");
});
