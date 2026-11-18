"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { needsEffortReview, type AppData } from "@/lib/data";
import type { Assignment } from "@/lib/planner";

/** FR-002/006: drafts stay local to the dialog; only selected visible rows can be saved. */
export function CanvasHoursEditor({ data, tasks, onSave, onClose }: { data: AppData; tasks: Assignment[]; onSave: (edits: { id: string; hours: number }[]) => void; onClose: () => void }) {
  const [course, setCourse] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [uniform, setUniform] = useState("");
  const [error, setError] = useState("");
  const rows = tasks.filter(a => (course === "all" || a.courseId === course) && (!reviewOnly || needsEffortReview(a)));
  const chosen = rows.filter(a => selected.includes(a.id));
  const changeScope = () => { setSelected([]); setError(""); };
  return <DialogContent className="hours-dialog"><DialogHeader><DialogTitle>Review remaining hours</DialogTitle><DialogDescription>Canvas does not provide study effort. Choose tasks, enter realistic remaining hours, then confirm them together. Unselected tasks stay unchanged.</DialogDescription></DialogHeader>
    <div className="batch-scope"><select className="workspace-select" aria-label="Hours review course" value={course} onChange={e => { setCourse(e.target.value); changeScope(); }}><option value="all">All courses in this view</option>{data.courses.map(c => <option value={c.id} key={c.id}>{c.code}</option>)}</select><label className="check-label"><input type="checkbox" checked={reviewOnly} onChange={e => { setReviewOnly(e.target.checked); changeScope(); }} />Only hours needing review</label></div>
    <div className="batch-actions"><Button variant="outline" onClick={() => setSelected(chosen.length === rows.length ? [] : rows.map(a => a.id))} disabled={!rows.length}>{chosen.length && chosen.length === rows.length ? "Clear selection" : "Select visible tasks"}</Button><span>{chosen.length} selected · {rows.length} shown</span></div>
    <div className="uniform-hours"><Input aria-label="Hours for selected tasks" type="number" min="0.5" max="200" step="0.5" value={uniform} onChange={e => setUniform(e.target.value)} placeholder="Hours" /><Button variant="outline" disabled={!chosen.length} onClick={() => { const hours = Number(uniform); if (!uniform.trim() || !Number.isFinite(hours) || hours < .5 || hours > 200) { setError("Enter 0.5–200 hours before applying to the selection."); return; } setDrafts(current => ({ ...current, ...Object.fromEntries(chosen.map(a => [a.id, uniform])) })); setError(""); }}>Fill {chosen.length} selected</Button></div>
    <div className="hours-rows">{rows.map(a => <div key={a.id} className="hours-row"><label className="check-label"><input aria-label={`Select ${a.title}`} type="checkbox" checked={selected.includes(a.id)} onChange={e => setSelected(current => e.target.checked ? [...current, a.id] : current.filter(id => id !== a.id))} /><span><strong>{a.title}</strong><small>{data.courses.find(c => c.id === a.courseId)?.code} · {needsEffortReview(a) ? "Hours need review" : "Hours confirmed"}</small></span></label><label className="hour-input"><span>Hours</span><Input aria-label={`Remaining hours for ${a.title}`} type="number" min="0.5" max="200" step="0.5" value={drafts[a.id] ?? String(a.estimatedHours)} onChange={e => setDrafts(current => ({ ...current, [a.id]: e.target.value }))} /></label></div>)}{!rows.length && <p className="empty-review">No tasks need review in this scope. Turn off the review filter to edit confirmed hours.</p>}</div>
    {error && <p role="alert" className="form-error">{error}</p>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!chosen.length} onClick={() => { const edits = chosen.map(a => ({ id: a.id, hours: (drafts[a.id] ?? String(a.estimatedHours)).trim() ? Number(drafts[a.id] ?? a.estimatedHours) : NaN })); if (edits.some(a => !Number.isFinite(a.hours) || a.hours < .5 || a.hours > 200)) { setError("Every selected task needs 0.5–200 remaining hours. Nothing has been saved."); return; } onSave(edits); }}>Confirm {chosen.length} tasks</Button></DialogFooter>
  </DialogContent>;
}
