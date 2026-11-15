import type { Assignment, Course } from "./planner.ts";
import { ProviderError } from "./provider-security.ts";
import { z } from "zod";

export type CanvasSnapshot = { courses: Course[]; assignments: Assignment[]; warnings: string[] };
const colours = ["#3d5af1", "#f06b46", "#5b9c76", "#8b5cf6", "#d39b28"];
const canvasDeadline = z.string().datetime({ offset: true });

export function canvasRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProviderError("invalid-response", "Canvas data contains an invalid record.");
  return value as Record<string, unknown>;
}
export function canvasSourceId(value: unknown): string {
  if ((typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) && (typeof value !== "string" || !/^[1-9]\d{0,29}$/.test(value))) throw new ProviderError("invalid-response", "Canvas returned an invalid source identifier.");
  return String(value);
}
export function canvasLabel(value: unknown, maximum: number, fallback: string): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, maximum) || fallback : fallback;
}

/** FR-006/INV-003: normalise only planning facts, without raw content, user IDs or credentials. */
export function normaliseCanvasSnapshot(value: unknown): CanvasSnapshot {
  const snapshot = canvasRecord(value);
  if (!Array.isArray(snapshot.courses) || !Array.isArray(snapshot.assignments) || snapshot.courses.length > 100 || snapshot.assignments.length > 1000) throw new ProviderError("invalid-response", "Canvas data must contain bounded courses and assignments arrays.");
  const warnings: string[] = [];
  const courseIds = new Set<string>();
  const courses = snapshot.courses.map((entry, index): Course => {
    const raw = canvasRecord(entry); const id = canvasSourceId(raw.id);
    if (courseIds.has(id)) throw new ProviderError("invalid-response", "Canvas data contains duplicate courses.");
    courseIds.add(id);
    return { id: `canvas-course-${id}`, code: canvasLabel(raw.course_code, 40, `Course ${index + 1}`), name: canvasLabel(raw.name, 200, "Untitled course"), color: colours[index % colours.length], source: "canvas", sourceId: id };
  });
  const taskIds = new Set<string>(); const assignments: Assignment[] = [];
  let undated = 0;
  for (const entry of snapshot.assignments) {
    const raw = canvasRecord(entry); const id = canvasSourceId(raw.id); const courseId = canvasSourceId(raw.course_id);
    if (!courseIds.has(courseId)) throw new ProviderError("invalid-response", "An assignment references an unknown Canvas course.");
    const key = `${courseId}-${id}`;
    if (taskIds.has(key)) throw new ProviderError("invalid-response", "Canvas data contains duplicate assignments.");
    taskIds.add(key);
    if (raw.due_at === null || raw.due_at === undefined || raw.due_at === "") { undated += 1; continue; }
    if (typeof raw.due_at !== "string" || !canvasDeadline.safeParse(raw.due_at).success || !Number.isFinite(Date.parse(raw.due_at))) throw new ProviderError("invalid-response", "Canvas returned an invalid assignment deadline.");
    if (raw.published === false) continue;
    const submission = raw.submission && typeof raw.submission === "object" ? raw.submission as Record<string, unknown> : undefined;
    const complete = submission?.excused === true || ["submitted", "graded", "pending_review"].includes(String(submission?.workflow_state));
    assignments.push({ id: `canvas-assignment-${key}`, courseId: `canvas-course-${courseId}`, title: canvasLabel(raw.name, 240, "Untitled assignment"), dueAt: new Date(raw.due_at).toISOString(), estimatedHours: 2, priority: "medium", status: complete ? "done" : "todo", source: "canvas", sourceId: id });
  }
  if (undated) warnings.push(`${undated} Canvas item${undated === 1 ? " has" : "s have"} no deadline and were not imported. Add any required tasks manually.`);
  if (assignments.length) warnings.push("Imported tasks default to 2 estimated hours and medium priority. Review these estimates before generating a plan.");
  return { courses, assignments, warnings };
}

export const normalizeCanvasData = normaliseCanvasSnapshot;

