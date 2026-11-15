import { DAY_MS, MINUTE_MS, hongKongDate, hongKongDayStart, hongKongWeekday } from "./time.ts";

export type Course = {
  id: string; code: string; name: string; color: string;
  source?: "manual" | "canvas"; sourceId?: string;
};
export type Assignment = {
  id: string; courseId: string; title: string; dueAt: string; estimatedHours: number;
  priority: "high" | "medium" | "low"; status: "todo" | "doing" | "done";
  source?: "manual" | "canvas"; sourceId?: string;
};
export type Availability = { day: number; start: string; end: string };
export type PlanBlock = {
  id: string; assignmentId: string; courseId: string; title: string;
  date: string; start: string; end: string; durationHours: number;
};
export type PlannerOptions = { now?: number | Date };

const priorityScore = { high: 0, medium: 1, low: 2 } as const;
const MIN_BLOCK_MINUTES = 30;
const MAX_BLOCK_MINUTES = 90;
const BREAK_MINUTES = 15;

function minutes(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeFromMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

/** ADR-002 / INV-001: overlapping windows represent the union of available time. */
function mergeWindows(availability: Availability[], day: number) {
  const windows = availability
    .filter((item) => item.day === day)
    .map((item) => ({ start: minutes(item.start), end: minutes(item.end) }))
    .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.start < item.end)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const window of windows) {
    const last = merged[merged.length - 1];
    if (last && window.start <= last.end) last.end = Math.max(last.end, window.end);
    else merged.push({ ...window });
  }
  return merged;
}

/** INV-005: keep exact quarter-hours visible rather than rounding them to zero. */
function formatHours(value: number): string {
  const hours = value / 60;
  return Number.isInteger(hours) ? hours.toFixed(1) : String(Math.round(hours * 100) / 100);
}

/**
 * ADR-002 / FR-004 / INV-001 / INV-005.
 * The only authority over schedule blocks: no network, storage or AI dependencies.
 * Times are Hong Kong calendar times; the optional clock makes regression tests reproducible.
 */
export function generateRulePlan(
  assignments: Assignment[], courses: Course[], availability: Availability[], options: PlannerOptions = {},
) {
  const now = options.now instanceof Date ? options.now.getTime() : (options.now ?? Date.now());
  if (!Number.isFinite(now)) throw new RangeError("The planning clock must be a valid instant.");
  const warnings: string[] = [];
  const plan: PlanBlock[] = [];
  const courseIds = new Set(courses.map((course) => course.id));
  const seenTaskIds = new Set<string>();
  const work: Array<Assignment & { deadline: number; remaining: number }> = [];

  for (const task of assignments) {
    if (task.status === "done") continue;
    const deadline = Date.parse(task.dueAt);
    if (!Number.isFinite(deadline) || !/[Tt].*(?:[Zz]|[+-]\d{2}:\d{2})$/.test(task.dueAt)
      || !Number.isFinite(task.estimatedHours) || task.estimatedHours < 0.5
      || !Number.isSafeInteger(Math.round(task.estimatedHours * 60))
      || !courseIds.has(task.courseId) || seenTaskIds.has(task.id)) {
      warnings.push(`${task.title || "Task"} could not be scheduled because its course, deadline, effort or identifier is invalid. Review the task details.`);
      continue;
    }
    seenTaskIds.add(task.id);
    work.push({ ...task, deadline, remaining: Math.round(task.estimatedHours * 60) });
  }
  work.sort((a, b) => a.deadline - b.deadline || priorityScore[a.priority] - priorityScore[b.priority] || a.id.localeCompare(b.id));

  const today = hongKongDayStart(now);
  // Ceil to the next whole minute so a partial current minute is never placed in the past.
  let nextAllowed = Math.ceil(now / MINUTE_MS) * MINUTE_MS;
  for (let offset = 0; offset < 7; offset += 1) {
    const dayStart = today + offset * DAY_MS;
    const date = hongKongDate(dayStart);
    for (const window of mergeWindows(availability, hongKongWeekday(dayStart))) {
      let cursor = Math.max(dayStart + window.start * MINUTE_MS, nextAllowed);
      const windowEnd = dayStart + window.end * MINUTE_MS;
      while (cursor + MIN_BLOCK_MINUTES * MINUTE_MS <= windowEnd) {
        let selected: (typeof work)[number] | undefined;
        let duration = 0;
        for (const task of work) {
          if (task.remaining <= 0) continue;
          const minutesToDeadline = Math.floor((task.deadline - cursor) / MINUTE_MS);
          let candidate = Math.min(MAX_BLOCK_MINUTES, task.remaining, Math.floor((windowEnd - cursor) / MINUTE_MS), minutesToDeadline);
          const tail = task.remaining - candidate;
          // Avoid consuming 45 minutes of a 60-minute task and stranding an unusable 15-minute tail.
          if (tail > 0 && tail < MIN_BLOCK_MINUTES) candidate -= MIN_BLOCK_MINUTES - tail;
          if (candidate >= MIN_BLOCK_MINUTES) {
            selected = task;
            duration = candidate;
            break;
          }
        }
        if (!selected) break;

        const start = Math.round((cursor - dayStart) / MINUTE_MS);
        plan.push({
          id: `${selected.id}-${date}-${start}`,
          assignmentId: selected.id, courseId: selected.courseId, title: selected.title,
          date, start: timeFromMinutes(start), end: timeFromMinutes(start + duration), durationHours: duration / 60,
        });
        selected.remaining -= duration;
        cursor += (duration + BREAK_MINUTES) * MINUTE_MS;
        nextAllowed = cursor;
      }
    }
  }

  for (const task of work.filter((item) => item.remaining > 0)) {
    const course = courses.find((item) => item.id === task.courseId);
    const reason = task.deadline <= now
      ? "Its deadline has passed; review the task and confirm a new deadline if an extension was granted."
      : "Add availability before the deadline or adjust the estimate.";
    warnings.push(`${course?.code || "Course"} · ${task.title} still has ${formatHours(task.remaining)} unscheduled hours. ${reason}`);
  }
  return { plan, warnings };
}
