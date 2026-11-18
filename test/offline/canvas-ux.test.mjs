import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseCanvasSnapshot } from '../../src/lib/canvas-data.ts';
import { parseAppData, exportBackup, importBackup, needsEffortReview, confirmAssignmentHours, editAssignment, editCourse, restoreCanvasFields, removeAssignment, removeCourse, restoreCanvasExclusion, filterAssignments, mergeCanvasSync, mergeCanvasData } from '../../src/lib/data.ts';

const now = Date.parse('2026-11-18T12:00:00+08:00');
const course = {id:'canvas-course-1',code:'CS1',name:'Synthetic course',color:'#3d5af1',source:'canvas',sourceId:'1'};
const task = {id:'canvas-assignment-1-2',courseId:course.id,title:'Synthetic assignment',dueAt:'2026-11-19T12:00:00+08:00',estimatedHours:2,priority:'medium',status:'todo',source:'canvas',sourceId:'2'};
const empty = () => ({courses:[],assignments:[],availability:[],weeklyGoal:''});
const snapshot = (tasks=[task]) => ({courses:[structuredClone(course)],assignments:structuredClone(tasks)});
const current = (tasks=[task]) => ({...empty(),...snapshot(tasks)});

test('FR-002/006 Canvas effort is provisional; old hours remain intact and manual tasks need no review', () => {
  const result=normaliseCanvasSnapshot({courses:[{id:1,name:'Synthetic',course_code:'CS1'}],assignments:[{id:2,course_id:1,due_at:task.dueAt}]});
  assert.equal(result.assignments[0].estimatedHours,2);
  assert.equal(result.assignments[0].effortConfirmed,false);
  assert.ok(needsEffortReview(result.assignments[0]));
  assert.ok(needsEffortReview({...task,estimatedHours:5}));
  assert.equal(parseAppData(current([{...task,estimatedHours:5}])).assignments[0].estimatedHours,5);
  assert.equal(needsEffortReview({...task,source:'manual'}),false);
});

test('FR-002 batch confirmation applies distinct or identical hours only to selected records', () => {
  const original=current([task,{...task,id:'a2'},{...task,id:'a3'}]);
  const result=confirmAssignmentHours(original,[{id:task.id,hours:2},{id:'a2',hours:5.5}]);
  assert.deepEqual(result.assignments.map(a=>[a.estimatedHours,a.effortConfirmed]),[[2,true],[5.5,true],[2,undefined]]);
  assert.equal(original.assignments[1].estimatedHours,2);
  const uniform=confirmAssignmentHours(result,[{id:task.id,hours:3},{id:'a2',hours:3}]);
  assert.deepEqual(uniform.assignments.map(a=>a.estimatedHours),[3,3,2]);
});

test('FR-002 invalid, empty, duplicated or vanished batch selections never partially apply', () => {
  const original=current([task,{...task,id:'a2'}]); const before=structuredClone(original);
  for(const bad of [NaN,Infinity,-1,0,.49,201,'',null]) assert.throws(()=>confirmAssignmentHours(original,[{id:task.id,hours:4},{id:'a2',hours:bad}]));
  for(const edits of [[],[{id:'missing',hours:2}],[{id:task.id,hours:2},{id:task.id,hours:4}]]) assert.throws(()=>confirmAssignmentHours(original,edits));
  assert.deepEqual(original,before);
});

test('FR-002 manual changes mark only changed source fields and never silently confirm effort', () => {
  let result=editAssignment(current(),task.id,{title:'Local title',priority:'high'});
  assert.deepEqual(result.assignments[0].localOverrides,['title']);
  assert.equal(needsEffortReview(result.assignments[0]),true);
  assert.equal(result.assignments[0].canvasValues.title,task.title);
  result=editAssignment(result,task.id,{estimatedHours:4},true);
  assert.equal(result.assignments[0].effortConfirmed,true);
  assert.deepEqual(result.assignments[0].localOverrides,['title']);
  assert.throws(()=>editAssignment(result,'missing',{title:'Wrong'}));
  assert.throws(()=>editAssignment(result,task.id,{courseId:'missing'}));
});

test('FR-006 source updates preserve corrections, estimates, priority and local doing status', () => {
  let original=editAssignment(current(),task.id,{title:'Local title',dueAt:'2026-11-22T12:00:00+08:00',status:'doing',estimatedHours:6,priority:'high'},true);
  original=editCourse(original,course.id,{code:'LOCAL',color:'#123456'});
  const result=mergeCanvasSync(original,{courses:[{...course,code:'NEW'}],assignments:[{...task,title:'New source',dueAt:'2026-11-20T12:00:00+08:00',status:'done'}]},{now});
  const a=result.data.assignments[0];
  assert.equal(a.title,'Local title'); assert.equal(a.status,'doing'); assert.equal(a.estimatedHours,6); assert.equal(a.effortConfirmed,true); assert.equal(a.priority,'high');
  assert.equal(a.canvasValues.title,'New source'); assert.equal(a.canvasValues.status,'done');
  assert.equal(result.data.courses[0].code,'LOCAL'); assert.equal(result.data.courses[0].color,'#123456');
  assert.equal(mergeCanvasSync(current([{...task,status:'doing'}]),snapshot(),{now}).data.assignments[0].status,'doing');
});

test('FR-006 restoring selected or all source fields removes overrides and preserves confirmed effort', () => {
  let data=editAssignment(current(),task.id,{title:'Local',status:'done',estimatedHours:5},true);
  data=restoreCanvasFields(data,task.id,'assignment',['title']);
  assert.equal(data.assignments[0].title,task.title); assert.deepEqual(data.assignments[0].localOverrides,['status']);
  data=restoreCanvasFields(data,task.id,'assignment');
  assert.equal(data.assignments[0].status,'todo'); assert.equal(data.assignments[0].effortConfirmed,true); assert.equal(data.assignments[0].estimatedHours,5);
  const changedCourse=editCourse(data,course.id,{name:'Local name'});
  assert.equal(restoreCanvasFields(changedCourse,course.id,'course').courses[0].name,course.name);
  assert.throws(()=>restoreCanvasFields(data,'missing','assignment'));
  assert.throws(()=>restoreCanvasFields(data,task.id,'assignment',['source']));
});

test('FR-006 restoration rejects missing destination courses without losing local data', () => {
  const second={...course,id:'manual-course',source:'manual'};
  let data=editAssignment({...current(),courses:[course,second]},task.id,{courseId:second.id});
  data={...data,courses:[second]}; const before=structuredClone(data);
  assert.throws(()=>restoreCanvasFields(data,task.id,'assignment',['courseId']));
  assert.deepEqual(data,before);
});

test('FR-006 repeated sync is idempotent, source facts refresh, and missing source records remain', () => {
  const first=mergeCanvasSync(empty(),snapshot(),{now});
  const second=mergeCanvasSync(first.data,snapshot(),{now});
  assert.equal(first.stats.added,1); assert.equal(second.stats.updated,0); assert.equal(second.stats.changed,false); assert.equal(second.stats.planningChanged,false);
  const later=mergeCanvasSync(second.data,snapshot([{...task,dueAt:'2026-11-22T12:00:00+08:00',status:'done'}]),{now});
  assert.equal(later.data.assignments[0].status,'done'); assert.equal(later.stats.updated,1);
  assert.equal(mergeCanvasSync(later.data,{courses:[],assignments:[]},{now}).data.assignments.length,1);
});

test('FR-006 default import skips new past/completed tasks but updates existing historical records', () => {
  const tasks=[task,{...task,id:'past',dueAt:'2026-11-17T12:00:00+08:00'},{...task,id:'exact',dueAt:new Date(now).toISOString()},{...task,id:'done',status:'done'}];
  const next=mergeCanvasSync(empty(),snapshot(tasks),{now});
  assert.deepEqual(next.data.assignments.map(a=>a.id),[task.id]); assert.equal(next.stats.skipped,3);
  const all=mergeCanvasSync(empty(),snapshot(tasks),{now,includePast:true,includeCompleted:true});
  assert.equal(all.data.assignments.length,4);
  const historical=current([tasks[1]]);
  assert.equal(mergeCanvasSync(historical,snapshot([{...tasks[1],status:'done'}]),{now}).data.assignments[0].status,'done');
  const extended=mergeCanvasSync(historical,snapshot([{...tasks[1],dueAt:task.dueAt}]),{now});
  assert.equal(filterAssignments(extended.data,{now}).length,1);
});

test('FR-006 invalid whole snapshot and invalid clocks are rejected without mutation', () => {
  const original=current(); const before=structuredClone(original);
  for(const incoming of [{courses:[],assignments:[task]},snapshot([task,{...task,id:'bad',dueAt:'invalid'}]),snapshot([task,task])]) assert.throws(()=>mergeCanvasSync(original,incoming,{now}));
  assert.throws(()=>mergeCanvasSync(original,snapshot(),{now:NaN}));
  assert.deepEqual(original,before);
});

test('FR-006 individually valid snapshots cannot exceed merged workspace limits or partially apply', () => {
  const fullCourses={...empty(),courses:Array.from({length:100},(_,i)=>({...course,id:`existing-course-${i}`}))};
  const fullAssignments=current(Array.from({length:1000},(_,i)=>({...task,id:`existing-task-${i}`})));
  for(const [original,incoming] of [[fullCourses,snapshot()],[fullAssignments,snapshot([{...task,id:'one-new-task'}])]]){
    // Both sides meet their own contracts; only the combined workspace exceeds its limit.
    assert.doesNotThrow(()=>parseAppData(original));
    assert.doesNotThrow(()=>parseAppData({...incoming,availability:[],weeklyGoal:''}));
    const before=structuredClone(original);
    assert.throws(()=>mergeCanvasSync(original,incoming,{now}),/Invalid study data/);
    assert.deepEqual(original,before);
  }
});

test('FR-001/002/006 removed Canvas items do not return until their exclusion is restored', () => {
  const removed=removeAssignment(current(),task.id);
  assert.equal(removed.assignments.length,0); assert.equal(removed.canvasExclusions.assignments[0].label,task.title);
  assert.equal(mergeCanvasSync(removed,snapshot(),{now}).data.assignments.length,0);
  const restored=restoreCanvasExclusion(removed,'assignment',task.id);
  assert.equal(mergeCanvasSync(restored,snapshot(),{now}).data.assignments.length,1);
  const noCourse=removeCourse(current(),course.id);
  const blocked=mergeCanvasSync(noCourse,snapshot(),{now});
  assert.equal(blocked.data.assignments.length,0); assert.equal(blocked.data.courses.length,0);
  assert.equal(mergeCanvasSync(restoreCanvasExclusion(noCourse,'course',course.id),snapshot(),{now}).data.assignments.length,1);
  assert.throws(()=>removeAssignment(current(),'missing')); assert.throws(()=>removeCourse(current(),'missing'));
});

test('FR-001/006 manual additions survive sync and removal never creates source exclusions', () => {
  const manual={...task,id:'manual-task',source:'manual'};
  const data=current([task,manual]);
  const merged=mergeCanvasSync(data,snapshot(),{now}); assert.ok(merged.data.assignments.some(a=>a.id===manual.id));
  assert.equal(removeAssignment(data,manual.id).canvasExclusions,undefined);
  const collision=mergeCanvasSync({...current(),assignments:[{...task,source:'manual',title:'Mine'}]},snapshot(),{now});
  assert.equal(collision.data.assignments[0].title,'Mine'); assert.equal(collision.stats.skipped,1);
});

test('FR-002 filters combine deadline, completion, course, search and review without deleting data', () => {
  const tasks=[{...task,id:'future',title:'Upcoming',effortConfirmed:true},{...task,id:'before',dueAt:new Date(now-1).toISOString()},{...task,id:'exact',dueAt:new Date(now).toISOString()},{...task,id:'done',status:'done'}];
  const data=current(tasks); const before=structuredClone(data);
  assert.deepEqual(filterAssignments(data,{now}).map(a=>a.id),['future']);
  assert.deepEqual(filterAssignments(data,{now,view:'overdue'}).map(a=>a.id),['before','exact']);
  assert.deepEqual(filterAssignments(data,{now,view:'completed'}).map(a=>a.id),['done']);
  assert.equal(filterAssignments(data,{now,view:'all'}).length,4);
  assert.equal(filterAssignments(data,{now,view:'all',courseId:course.id,search:'cs1',needsReview:true}).length,3);
  assert.equal(filterAssignments(data,{now,search:'UPCOMING',status:'todo'}).length,1);
  assert.equal(filterAssignments(data,{now,courseId:'other'}).length,0);
  assert.throws(()=>filterAssignments(data,{now:NaN})); assert.deepEqual(data,before);
});

test('FR-007/SEC-001 metadata survives backups, unknown connection fields never do', () => {
  let data=editAssignment(current(),task.id,{title:'Local'},true);
  data=removeAssignment(data,task.id);
  const text=exportBackup({...data,accessToken:'synthetic-never-save',autoSync:true});
  assert.deepEqual(importBackup(text),data);
  assert.equal(text.includes('synthetic-never-save'),false); assert.equal(text.includes('autoSync'),false);
  const edited=editAssignment(current(),task.id,{dueAt:'2026-11-23T12:00:00+08:00'},true);
  assert.deepEqual(importBackup(exportBackup(edited)),edited);
});

test('FR-007 malformed or excessive metadata and dangling active references are rejected', () => {
  for(const patch of [{effortConfirmed:'yes'},{localOverrides:['source']},{localOverrides:['title','title']},{canvasValues:{title:'Incomplete'}}]) assert.throws(()=>parseAppData(current([{...task,...patch}])));
  assert.throws(()=>parseAppData({...current(),canvasExclusions:{courses:[],assignments:Array.from({length:1001},(_,i)=>({id:String(i),label:'Synthetic'}))}}));
  assert.throws(()=>parseAppData({...current(),canvasExclusions:{courses:[{id:course.id,label:'Hidden'}],assignments:[]}}));
  assert.throws(()=>parseAppData(current([{...task,courseId:'missing'}])));
});

test('FR-006 incoming source cannot assert user confirmation or local overrides', () => {
  const incoming=snapshot([{...task,effortConfirmed:true,localOverrides:['title'],canvasValues:{title:'Untrusted',dueAt:task.dueAt,courseId:course.id,status:'todo'}}]);
  const merged=mergeCanvasSync(empty(),incoming,{now}).data.assignments[0];
  assert.equal(merged.effortConfirmed,false); assert.equal(merged.localOverrides,undefined); assert.equal(merged.canvasValues.title,task.title);
});

test('FR-006 legacy import-all wrapper remains compatible with explicitly selected historical imports', () => {
  const past={...task,dueAt:'2020-01-01T00:00:00Z'};
  assert.equal(mergeCanvasData(empty(),snapshot([past])).assignments.length,1);
});
