import { z } from 'zod';
import type { Assignment, Availability, Course, PlanBlock } from './planner';

/** ADR-002, FR-001..008: shared allowlisted facts, never a credential store. */
export type CanvasExclusions = { courses: Array<{id:string;label:string}>; assignments: Array<{id:string;label:string}> };
export type AppData = { courses: Course[]; assignments: Assignment[]; availability: Availability[]; weeklyGoal: string; canvasExclusions?: CanvasExclusions };
const identifier = z.string().trim().min(1).max(160);
const origin = { source: z.enum(['manual','canvas']).optional(), sourceId: z.string().max(200).optional() };
const courseFields = ['code','name','color'] as const;
const assignmentFields = ['title','dueAt','courseId','status'] as const;
const courseValuesSchema = z.object({code:z.string().trim().min(1).max(80),name:z.string().trim().min(1).max(200),color:z.string().regex(/^#[0-9a-f]{6}$/i)});
const assignmentValuesSchema = z.object({title:z.string().trim().min(1).max(240),dueAt:z.string().datetime({offset:true}),courseId:identifier,status:z.enum(['todo','doing','done'])});
const hoursSchema = z.number().finite().min(.5).max(200);
const unique = <T,>(items:T[]) => new Set(items).size === items.length;
const courseSchema = courseValuesSchema.extend({id:identifier,...origin,localOverrides:z.array(z.enum(courseFields)).max(3).refine(unique).optional(),canvasValues:courseValuesSchema.optional()});
const assignmentSchema = assignmentValuesSchema.extend({id:identifier,estimatedHours:hoursSchema,priority:z.enum(['high','medium','low']),...origin,effortConfirmed:z.boolean().optional(),localOverrides:z.array(z.enum(assignmentFields)).max(4).refine(unique).optional(),canvasValues:assignmentValuesSchema.optional()});
const exclusionSchema=z.object({id:identifier,label:z.string().trim().min(1).max(240)});
const exclusionsSchema=z.object({courses:z.array(exclusionSchema).max(100),assignments:z.array(exclusionSchema).max(1000)});
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const slotSchema=z.object({day:z.number().int().min(0).max(6),start:clock,end:clock}).refine(s=>s.start<s.end,'The end of an availability window must follow its start.');
const dataSchema=z.object({courses:z.array(courseSchema).max(100),assignments:z.array(assignmentSchema).max(1000),availability:z.array(slotSchema).max(100),weeklyGoal:z.string().max(1000).default(''),canvasExclusions:exclusionsSchema.optional()}).superRefine((value,ctx)=>{
  const ids=new Set<string>();
  for(const c of value.courses){if(ids.has(c.id))ctx.addIssue({code:'custom',message:'Course identifiers must be unique.'});ids.add(c.id);}
  const taskIds=new Set<string>();
  for(const a of value.assignments){if(taskIds.has(a.id))ctx.addIssue({code:'custom',message:'Task identifiers must be unique.'});taskIds.add(a.id);if(!ids.has(a.courseId))ctx.addIssue({code:'custom',message:'Every task must belong to an existing course.'});}
  for(const record of [...value.courses,...value.assignments]){
    if((record.localOverrides || record.canvasValues) && record.source!=='canvas')ctx.addIssue({code:'custom',message:'Source corrections require a Canvas record.'});
    if(record.localOverrides?.length && !record.canvasValues)ctx.addIssue({code:'custom',message:'Source corrections require source values.'});
  }
  if(value.canvasExclusions){
    for(const [kind,active] of [['courses',ids],['assignments',taskIds]] as const){
      const list=value.canvasExclusions[kind];
      if(!unique(list.map(item=>item.id)) || list.some(item=>active.has(item.id)))ctx.addIssue({code:'custom',message:'Hidden source identifiers must be unique and inactive.'});
    }
  }
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

/** FR-002/006: old Canvas estimates are unconfirmed until the user explicitly reviews them. */
export function needsEffortReview(task: Assignment): boolean { return task.source === 'canvas' && task.effortConfirmed !== true; }

/** FR-002: validate the whole explicit selection before applying any effort confirmation. */
export function confirmAssignmentHours(data: AppData, edits: Array<{id:string;hours:number}>): AppData {
  const current=parseAppData(data);
  if(!edits.length || !unique(edits.map(item=>item.id)) || edits.some(item=>!hoursSchema.safeParse(item.hours).success || !current.assignments.some(a=>a.id===item.id)))throw new Error('Select existing tasks and enter valid hours (0.5–200) for every selected task.');
  const values=new Map(edits.map(item=>[item.id,item.hours]));
  return parseAppData({...current,assignments:current.assignments.map(a=>values.has(a.id)?{...a,estimatedHours:values.get(a.id)!,effortConfirmed:true}:a)});
}

/** FR-002/006: only explicit user edits create local source corrections. */
export function editAssignment(data: AppData, id: string, patch: Partial<Pick<Assignment,'title'|'dueAt'|'courseId'|'estimatedHours'|'priority'|'status'>>, confirmEffort=false): AppData {
  const current=parseAppData(data); const previous=current.assignments.find(a=>a.id===id);
  if(!previous)throw new Error('This task no longer exists. Reopen the task list.');
  const fields=[...assignmentFields,'estimatedHours','priority'] as const;
  const next: Assignment={...previous,...Object.fromEntries(fields.filter(field=>Object.hasOwn(patch,field)).map(field=>[field,patch[field]]))};
  if(previous.source==='canvas'){
    next.canvasValues=previous.canvasValues??{title:previous.title,dueAt:previous.dueAt,courseId:previous.courseId,status:previous.status};
    const overrides=new Set(previous.localOverrides??[]);
    for(const field of assignmentFields)if(patch[field]!==undefined && patch[field]!==previous[field])overrides.add(field);
    if(overrides.size)next.localOverrides=[...overrides];
  }
  if(confirmEffort)next.effortConfirmed=true;
  return parseAppData({...current,assignments:current.assignments.map(a=>a.id===id?next:a)});
}

/** FR-001/006: preserve explicitly edited Canvas course labels and colours during sync. */
export function editCourse(data: AppData, id: string, patch: Partial<Pick<Course,'code'|'name'|'color'>>): AppData {
  const current=parseAppData(data); const previous=current.courses.find(c=>c.id===id);
  if(!previous)throw new Error('This course no longer exists. Reopen the course list.');
  const next: Course={...previous,...Object.fromEntries(courseFields.filter(field=>Object.hasOwn(patch,field)).map(field=>[field,patch[field]]))};
  if(previous.source==='canvas'){
    next.canvasValues=previous.canvasValues??{code:previous.code,name:previous.name,color:previous.color};
    const overrides=new Set(previous.localOverrides??[]);
    for(const field of courseFields)if(patch[field]!==undefined && patch[field]!==previous[field])overrides.add(field);
    if(overrides.size)next.localOverrides=[...overrides];
  }
  return parseAppData({...current,courses:current.courses.map(c=>c.id===id?next:c)});
}

/** FR-006: restoring a source field is explicit and rejects missing destination courses atomically. */
export function restoreCanvasFields(data: AppData, id: string, kind: 'assignment'|'course', fields?: string[]): AppData {
  const current=parseAppData(data);
  if(kind==='course'){
    const previous=current.courses.find(c=>c.id===id);
    if(!previous?.canvasValues)throw new Error('Sync this course before restoring its Canvas values.');
    const selected=fields??previous.localOverrides??[];
    if(selected.some(field=>!courseFields.includes(field as typeof courseFields[number])))throw new Error('Select valid course fields to restore.');
    const next={...previous};
    for(const field of selected as Array<typeof courseFields[number]>)next[field]=previous.canvasValues[field];
    next.localOverrides=(previous.localOverrides??[]).filter(field=>!selected.includes(field));
    return parseAppData({...current,courses:current.courses.map(c=>c.id===id?next:c)});
  }
  const previous=current.assignments.find(a=>a.id===id);
  if(!previous?.canvasValues)throw new Error('Sync this task before restoring its Canvas values.');
  const selected=fields??previous.localOverrides??[];
  if(selected.some(field=>!assignmentFields.includes(field as typeof assignmentFields[number])))throw new Error('Select valid task fields to restore.');
  const values=previous.canvasValues;
  if(selected.includes('courseId') && !current.courses.some(c=>c.id===values.courseId))throw new Error('Restore the original Canvas course before restoring this task’s course.');
  const next={...previous,...Object.fromEntries(selected.map(field=>[field,values[field as typeof assignmentFields[number]]])),localOverrides:(previous.localOverrides??[]).filter(field=>!selected.includes(field))};
  return parseAppData({...current,assignments:current.assignments.map(a=>a.id===id?next:a)});
}

function exclusions(data: AppData): CanvasExclusions { return {courses:[...(data.canvasExclusions?.courses??[])],assignments:[...(data.canvasExclusions?.assignments??[])]}; }

/** FR-002/006: local source removal is remembered so the next sync cannot resurrect the task. */
export function removeAssignment(data: AppData, id: string): AppData {
  const current=parseAppData(data); const task=current.assignments.find(a=>a.id===id);
  if(!task)throw new Error('This task no longer exists.');
  const next={...current,assignments:current.assignments.filter(a=>a.id!==id)};
  if(task.source==='canvas') { const hidden=exclusions(current); hidden.assignments.push({id,label:task.title}); next.canvasExclusions=hidden; }
  return parseAppData(next);
}

/** FR-001/006: cascade is local; excluding a course also excludes future source children. */
export function removeCourse(data: AppData, id: string): AppData {
  const current=parseAppData(data); const course=current.courses.find(c=>c.id===id);
  if(!course)throw new Error('This course no longer exists.');
  const removed=current.assignments.filter(a=>a.courseId===id);
  const next={...current,courses:current.courses.filter(c=>c.id!==id),assignments:current.assignments.filter(a=>a.courseId!==id)};
  const hidden=exclusions(current);
  if(course.source==='canvas')hidden.courses.push({id,label:`${course.code} · ${course.name}`.slice(0,240)});
  for(const a of removed)if(a.source==='canvas' && (course.source!=='canvas' || a.canvasValues?.courseId && a.canvasValues.courseId!==id))hidden.assignments.push({id:a.id,label:a.title});
  if(hidden.courses.length || hidden.assignments.length)next.canvasExclusions=hidden;
  return parseAppData(next);
}

/** FR-006: restoring exclusion permits the next sync; it does not fabricate source records. */
export function restoreCanvasExclusion(data: AppData, kind: 'assignment'|'course', id: string): AppData {
  const current=parseAppData(data); const hidden=exclusions(current); const key=kind==='course'?'courses':'assignments';
  if(!hidden[key].some(item=>item.id===id))throw new Error('This hidden Canvas item no longer exists.');
  hidden[key]=hidden[key].filter(item=>item.id!==id);
  return parseAppData({...current,canvasExclusions:hidden});
}

export type AssignmentFilters = {view?:'upcoming'|'overdue'|'completed'|'all';courseId?:string;status?:string;search?:string;needsReview?:boolean;now?:number};
/** FR-002/006: presentation filtering never removes tasks from persistence or planner input. */
export function filterAssignments(data: AppData, filters: AssignmentFilters = {}): Assignment[] {
  const now=filters.now??Date.now(); if(!Number.isFinite(now))throw new Error('The task filter needs a valid clock.');
  const view=filters.view??'upcoming'; const search=(filters.search??'').trim().toLowerCase();
  return data.assignments.filter(a=>{
    const deadline=Date.parse(a.dueAt);
    const inView=view==='all' || (view==='completed'?a.status==='done':a.status!=='done' && (view==='overdue'?deadline<=now:deadline>now));
    return inView && (!filters.courseId || filters.courseId==='all' || a.courseId===filters.courseId) && (!filters.status || filters.status==='all' || a.status===filters.status) && (!filters.needsReview || needsEffortReview(a)) && `${a.title} ${data.courses.find(c=>c.id===a.courseId)?.code??''}`.toLowerCase().includes(search);
  }).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt) || a.id.localeCompare(b.id));
}

export type CanvasSyncOptions = {now?:number;includePast?:boolean;includeCompleted?:boolean};
export type CanvasSyncStats = {added:number;updated:number;skipped:number;coursesAdded:number;coursesUpdated:number;changed:boolean;planningChanged:boolean};
function same(left:unknown,right:unknown):boolean {
  const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value && typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stable(item)])):value;
  return JSON.stringify(stable(left))===JSON.stringify(stable(right));
}
function planningFacts(data:AppData) {return {courses:data.courses.map(c=>({id:c.id,code:c.code,name:c.name,color:c.color})),assignments:data.assignments.map(a=>({id:a.id,courseId:a.courseId,title:a.title,dueAt:a.dueAt,estimatedHours:a.estimatedHours,priority:a.priority,status:a.status}))};}

/** FR-006/ADR-003: complete validation precedes an idempotent, exclusion-aware source merge. */
export function mergeCanvasSync(current: AppData, incoming: {courses: Course[]; assignments: Assignment[]}, options: CanvasSyncOptions = {}): {data:AppData;stats:CanvasSyncStats} {
  const before=parseAppData(current);
  const validated=parseAppData({courses:incoming.courses,assignments:incoming.assignments,availability:[],weeklyGoal:''});
  const now=options.now??Date.now(); if(!Number.isFinite(now))throw new Error('The Canvas import needs a valid clock.');
  const hiddenCourses=new Set(before.canvasExclusions?.courses.map(item=>item.id)??[]);
  const hiddenAssignments=new Set(before.canvasExclusions?.assignments.map(item=>item.id)??[]);
  const courses=new Map(before.courses.map(c=>[c.id,c]));
  const assignments=new Map(before.assignments.map(a=>[a.id,a]));
  const stats:CanvasSyncStats={added:0,updated:0,skipped:0,coursesAdded:0,coursesUpdated:0,changed:false,planningChanged:false};
  for(const item of validated.courses){
    if(hiddenCourses.has(item.id))continue;
    const previous=courses.get(item.id);
    if(previous && previous.source!=='canvas'){hiddenCourses.add(item.id);continue;}
    const canvasValues={code:item.code,name:item.name,color:item.color};
    const next:Course={id:item.id,...canvasValues,source:'canvas',...(item.sourceId?{sourceId:item.sourceId}:{}),canvasValues};
    if(previous?.localOverrides){ next.localOverrides=previous.localOverrides; for(const field of previous.localOverrides)next[field]=previous[field]; }
    // Colour is a device-local display preference even for legacy imports.
    if(previous)next.color=previous.color;
    courses.set(item.id,next);
    if(!previous)stats.coursesAdded++; else if(!same(previous,next))stats.coursesUpdated++;
  }
  for(const item of validated.assignments){
    const previous=assignments.get(item.id);
    if(hiddenAssignments.has(item.id) || hiddenCourses.has(item.courseId) || !courses.has(item.courseId) || previous && previous.source!=='canvas') { stats.skipped++; continue; }
    if(!previous && (!options.includePast && Date.parse(item.dueAt)<=now || !options.includeCompleted && item.status==='done')){stats.skipped++;continue;}
    const canvasValues={title:item.title,dueAt:item.dueAt,courseId:item.courseId,status:item.status};
    const next:Assignment={id:item.id,...canvasValues,estimatedHours:previous?.estimatedHours??item.estimatedHours,priority:previous?.priority??item.priority,source:'canvas',...(item.sourceId?{sourceId:item.sourceId}:{}),canvasValues};
    if(previous?.effortConfirmed!==undefined)next.effortConfirmed=previous.effortConfirmed; else if(!previous)next.effortConfirmed=false;
    if(previous?.localOverrides){ next.localOverrides=previous.localOverrides; for(const field of previous.localOverrides) { if(field==='status')next.status=previous.status; else next[field]=previous[field]; } }
    if(previous?.status==='doing' && item.status==='todo' && !previous.localOverrides?.includes('status'))next.status='doing';
    assignments.set(item.id,next);
    if(!previous)stats.added++; else if(!same(previous,next))stats.updated++;
  }
  const data=parseAppData({...before,courses:[...courses.values()],assignments:[...assignments.values()]});
  stats.changed=!same(before,data); stats.planningChanged=!same(planningFacts(before),planningFacts(data));
  return {data,stats};
}

/** FR-006: explicit import-all compatibility contract; new UI uses mergeCanvasSync scopes. */
export function mergeCanvasData(current: AppData, incoming: {courses: Course[]; assignments: Assignment[]}): AppData {
  return mergeCanvasSync(current,incoming,{includePast:true,includeCompleted:true}).data;
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
