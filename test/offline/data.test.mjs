import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAppData, exportBackup, importBackup, mergeCanvasData, calendarExport } from '../../src/lib/data.ts';

const data = { courses: [{id:'c1',code:'CS5351',name:'Engineering',color:'#3d5af1'}], assignments: [{id:'a1',courseId:'c1',title:'Build',dueAt:'2026-11-19T12:00:00.000Z',estimatedHours:2,priority:'high',status:'todo'}], availability:[{day:1,start:'19:00',end:'22:00'}], weeklyGoal:'Focus' };
test('FR-001/002/003 accepts a complete workspace and strips unrecognised root state', () => {
  assert.deepEqual(parseAppData({...data, apiKey:'synthetic-test-value'}), data);
});
test('FR-002 rejects invalid dates, hours, references, duplicate identifiers and unknown states', () => {
  for (const patch of [{dueAt:'nonsense'},{estimatedHours:Infinity},{estimatedHours:-1},{courseId:'missing'},{status:'maybe'}]) assert.throws(()=>parseAppData({...data,assignments:[{...data.assignments[0],...patch}]}));
  assert.throws(()=>parseAppData({...data,courses:[...data.courses,...data.courses]}));
  assert.throws(()=>parseAppData({...data,assignments:[...data.assignments,...data.assignments]}));
});
test('FR-003 rejects invalid time windows and accepts an empty local workspace', () => {
  for(const slot of [{day:7,start:'19:00',end:'22:00'},{day:1,start:'23:00',end:'20:00'},{day:1,start:'25:00',end:'26:00'}]) assert.throws(()=>parseAppData({...data,availability:[slot]}));
  assert.equal(parseAppData({courses:[],assignments:[],availability:[],weeklyGoal:''}).courses.length,0);
});
test('FR-007/SEC-001 backup round trip preserves facts and excludes credentials',()=>{
  const saved=exportBackup({...data,apiKey:'synthetic-key',accessToken:'synthetic-token'});
  assert.ok(!saved.includes('synthetic-key') && !saved.includes('synthetic-token'));
  assert.deepEqual(importBackup(saved),data);
});
test('FR-007 rejects malformed and future backups without mutating the active workspace',()=>{
  const before=structuredClone(data);
  for(const text of ['{',JSON.stringify({schemaVersion:99,data}),JSON.stringify({schemaVersion:1,data:{}})]) assert.throws(()=>importBackup(text));
  assert.deepEqual(data,before);
});
test('FR-006 Canvas repeated import updates deadlines while preserving local estimates',()=>{
  const imported={courses:[{id:'canvas-c1',code:'CS1',name:'Synced',color:'#3d5af1',source:'canvas',sourceId:'1'}],assignments:[{...data.assignments[0],id:'canvas-a1',courseId:'canvas-c1',source:'canvas',sourceId:'1'}]};
  const first=mergeCanvasData(data, imported);
  first.assignments.find(a=>a.id==='canvas-a1').estimatedHours=5;
  const second=mergeCanvasData(first,{...imported,assignments:imported.assignments.map(a=>({...a,dueAt:'2026-11-20T12:00:00.000Z'}))});
  assert.equal(second.assignments.length,2);
  assert.equal(second.assignments.find(a=>a.id==='canvas-a1').estimatedHours,5);
  assert.equal(second.assignments.find(a=>a.id==='canvas-a1').dueAt,'2026-11-20T12:00:00.000Z');
  assert.throws(()=>mergeCanvasData(data,{courses:[],assignments:imported.assignments}));
});
test('FR-008 exports escaped calendar text with Hong Kong time and rejects invalid blocks',()=>{
  const block={id:'a1-1',assignmentId:'a1',courseId:'c1',title:'Build, review; then\\test\nnext',date:'2026-11-17',start:'19:00',end:'20:00',durationHours:1};
  const text=calendarExport([block],data.courses);
  assert.match(text,/DTSTART;TZID=Asia\/Hong_Kong:20261117T190000/);
  assert.match(text,/Build\\, review\\; then\\\\test\\nnext/);
  assert.throws(()=>calendarExport([{...block,end:'18:00'}],data.courses));
  assert.throws(()=>calendarExport([{...block,date:'2026-02-30'}],data.courses));
  assert.ok(!calendarExport([{...block,title:'Task\rBEGIN:VEVENT'}],data.courses).includes('Task\rBEGIN:VEVENT'));
});
