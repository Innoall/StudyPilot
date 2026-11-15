import { z } from 'zod';
import type { Assignment, Availability, Course, PlanBlock } from './planner';

/** ADR-002, FR-001..008: shared allowlisted facts, never a credential store. */
export type AppData = { courses: Course[]; assignments: Assignment[]; availability: Availability[]; weeklyGoal: string };
const identifier = z.string().trim().min(1).max(160);
const origin = { source: z.enum(['manual','canvas']).optional(), sourceId: z.string().max(200).optional() };
const courseSchema = z.object({id:identifier,code:z.string().trim().min(1).max(80),name:z.string().trim().min(1).max(200),color:z.string().regex(/^#[0-9a-f]{6}$/i),...origin});
const assignmentSchema = z.object({id:identifier,courseId:identifier,title:z.string().trim().min(1).max(240),dueAt:z.string().datetime({offset:true}),estimatedHours:z.number().finite().min(.5).max(200),priority:z.enum(['high','medium','low']),status:z.enum(['todo','doing','done']),...origin});
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const slotSchema=z.object({day:z.number().int().min(0).max(6),start:clock,end:clock}).refine(s=>s.start<s.end,'The end of an availability window must follow its start.');
const dataSchema=z.object({courses:z.array(courseSchema).max(100),assignments:z.array(assignmentSchema).max(1000),availability:z.array(slotSchema).max(100),weeklyGoal:z.string().max(1000).default('')}).superRefine((value,ctx)=>{
  const ids=new Set<string>();
  for(const c of value.courses){if(ids.has(c.id))ctx.addIssue({code:'custom',message:'Course identifiers must be unique.'});ids.add(c.id);}
  const taskIds=new Set<string>();
  for(const a of value.assignments){if(taskIds.has(a.id))ctx.addIssue({code:'custom',message:'Task identifiers must be unique.'});taskIds.add(a.id);if(!ids.has(a.courseId))ctx.addIssue({code:'custom',message:'Every task must belong to an existing course.'});}
});

/** FR-001/002/003, SEC-001: strips unknown fields; errors contain no input values. */
export function parseAppData(value: unknown): AppData {
  const result=dataSchema.safeParse(value);
  if(!result.success)throw new Error('Invalid study data. Check unique courses and tasks, deadlines, hours and availability.');
  return result.data;
}

/** FR-007, SEC-001: exports only validated facts, never connection settings. */
export function exportBackup(value: unknown): string {
  return JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),data:parseAppData(value)},null,2);
}
/** FR-007: validate before the caller changes its workspace. */
export function importBackup(text: string): AppData {
  if(text.length>2_000_000)throw new Error('The backup is too large (maximum 2 MB).');
  let value: unknown;
  try {value=JSON.parse(text);} catch {throw new Error('This file is not valid JSON.');}
  if(!value || typeof value!=='object' || !('schemaVersion' in value) || value.schemaVersion!==1 || !('data' in value))throw new Error('This backup version is not supported.');
  return parseAppData(value.data);
}

/** FR-006: idempotent import; source deadlines win, user effort/priority survive. */
export function mergeCanvasData(current: AppData, incoming: {courses: Course[]; assignments: Assignment[]}): AppData {
  const validated=parseAppData({...incoming,availability:[],weeklyGoal:''});
  const courses=new Map(current.courses.map(c=>[c.id,c]));
  for(const c of validated.courses)courses.set(c.id,{...c,source:'canvas'});
  const assignments=new Map(current.assignments.map(a=>[a.id,a]));
  for(const item of validated.assignments){
    const previous=assignments.get(item.id);
    assignments.set(item.id,{...item,source:'canvas',estimatedHours:previous?.estimatedHours??item.estimatedHours,priority:previous?.priority??item.priority});
  }
  return parseAppData({...current,courses:[...courses.values()],assignments:[...assignments.values()]});
}

/** FR-008: RFC5545 text escaping and Hong Kong calendar events. */
export function calendarExport(plan: PlanBlock[], courses: Course[]): string {
  const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StudyPilot//Study plan//EN','CALSCALE:GREGORIAN','BEGIN:VTIMEZONE','TZID:Asia/Hong_Kong','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0800','TZOFFSETTO:+0800','TZNAME:HKT','END:STANDARD','END:VTIMEZONE'];
  for(const b of plan){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!clock.safeParse(b.start).success||!clock.safeParse(b.end).success||b.start>=b.end||!Number.isFinite(Date.parse(b.date+'T'+b.start+':00+08:00'))||new Date(b.date+'T12:00:00Z').toISOString().slice(0,10)!==b.date)throw new Error('The plan contains an invalid calendar block.');
    const course=courses.find(c=>c.id===b.courseId);
    const date=b.date.replace(/-/g,'');
    lines.push('BEGIN:VEVENT',`UID:${escape(b.id)}@studypilot`, `DTSTAMP:${stamp}`,`DTSTART;TZID=Asia/Hong_Kong:${date}T${b.start.replace(':','')}00`,`DTEND;TZID=Asia/Hong_Kong:${date}T${b.end.replace(':','')}00`,`SUMMARY:${escape(b.title)}`,`DESCRIPTION:${escape(course?.code??'Study')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC5545 physical lines are at most 75 octets; fold at Unicode boundaries.
  return lines.map(line=>{let out='',part='';for(const char of line){if(new TextEncoder().encode(part+char).length>73){out+=part+'\r\n ';part='';}part+=char;}return out+part;}).join('\r\n')+'\r\n';
}
