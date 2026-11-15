"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check, CircleAlert, Clock3, Download, Edit3, GraduationCap, LayoutDashboard, Link2, Loader2, LogOut, Plus, Search, ShieldCheck, Sparkles, Target, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateRulePlan, type Assignment, type Availability, type Course, type PlanBlock } from "@/lib/planner";
import { calendarExport, exportBackup, importBackup, mergeCanvasData, parseAppData, type AppData } from "@/lib/data";
import { normalizeCanvasData } from "@/lib/canvas-data";
import type { CanvasResult } from "@/lib/canvas";
import { hongKongDateTimeInput, parseHongKongDateTime } from "@/lib/time";

// ADR-002. Connection credentials live only in component memory, outside AppData.
type AISettings = { mode: "rules" | "server" | "personal"; provider: "cityu" | "openai" | "deepseek"; model: string; apiKey: string };
type PlannerResult = { plan: PlanBlock[]; summary: string; suggestions: string[]; warnings: string[]; source: "school-ai" | "personal-ai" | "rule-engine"; aiStatus?: string; generatedAt?: string; timeZone?: string };
type ImportPreview = { kind: "backup"; data: AppData } | { kind: "canvas"; courses: Course[]; assignments: Assignment[]; warnings: string[] };
type Profile = { workspaceId: string; displayName: string };
const colors = ["#3d5af1", "#f06b46", "#5b9c76", "#8b5cf6", "#d39b28"];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultAI: AISettings = { mode: "rules", provider: "cityu", model: "CS5351/DeepSeek-V4-Flash", apiKey: "" };
const manualKey = "studypilot-data-v1";
const nav = [["overview", LayoutDashboard, "Overview"], ["data", BookOpen, "Courses & tasks"], ["availability", CalendarDays, "Availability"], ["plan", BrainCircuit, "Study plan"], ["connections", Link2, "Connections"]] as const;
const selectStyle = "workspace-select";

function emptyData(): AppData { return { courses: [], assignments: [], availability: days.map((_, day) => ({ day, start: "19:00", end: "22:00" })), weeklyGoal: "Prioritise approaching deadlines and keep time for review." }; }
function demoData(): AppData {
  const data = emptyData();
  data.courses = [{ id: "demo-course", code: "CS5351", name: "Agentic Software Engineering", color: colors[0] }];
  data.assignments = [{ id: "demo-task", courseId: "demo-course", title: "Architecture blueprint", dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), estimatedHours: 4, priority: "high", status: "todo" }];
  return data;
}
function dueLabel(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The operation could not be completed."; }
function download(name: string, text: string, type = "application/json") { const url = URL.createObjectURL(new Blob([text], { type })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function localResult(data: AppData): PlannerResult { const generated = generateRulePlan(data.assignments, data.courses, data.availability); return { ...generated, summary: `Your ${data.assignments.filter(a => a.status !== "done").length} active tasks have been checked against deadlines and available time.`, suggestions: ["Start with the nearest deadline.", "Review the unscheduled hours before adding more work.", "Mark finished tasks complete and regenerate your plan."], source: "rule-engine", aiStatus: "unavailable", generatedAt: new Date().toISOString(), timeZone: "Asia/Hong_Kong" }; }

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [now, setNow] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [storageKey, setStorageKey] = useState(manualKey);
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [stale, setStale] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [courseDialog, setCourseDialog] = useState<Course | "new" | null>(null);
  const [taskDialog, setTaskDialog] = useState<Assignment | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [ai, setAI] = useState<AISettings>(defaultAI);
  const [canvasToken, setCanvasToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ text: string; action: () => void } | null>(null);
  const generation = useRef(0);
  const workspaceEpoch = useRef(0);
  const canvasSerial = useRef(0);
  const importSerial = useRef(0);
  const canvasController = useRef<AbortController | null>(null);
  const canvasForm = useRef<HTMLFormElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    // Stable initial markup prevents date- and locale-dependent hydration mismatches.
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      try { const saved = localStorage.getItem(manualKey); setData(saved ? parseAppData(JSON.parse(saved)) : emptyData()); }
      catch { setData(emptyData()); setMessage("Saved data could not be restored. Export or recover your original backup before making new changes."); }
    }, 0);
    void fetch("/api/canvas", { cache: "no-store" }).then(r => r.json()).then(value => setCanvasEnabled((value as {tokenTestingEnabled?:boolean}).tokenTestingEnabled === true)).catch(() => undefined);
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearTimeout(timer); window.clearInterval(clock); controller.current?.abort(); canvasController.current?.abort(); };
  }, []);

  function cancelPlan() { generation.current += 1; controller.current?.abort(); setIsPlanning(false); }
  function saveData(next: AppData, key = storageKey) {
    const validated = parseAppData(next);
    cancelPlan(); setData(validated); setStale(true);
    try { localStorage.setItem(key, JSON.stringify(validated)); }
    catch { setMessage("Your changes are available in this tab, but browser storage is unavailable. Download a backup before closing."); }
  }
  function edit(next: AppData) { try { saveData(next); } catch (error) { setMessage(errorMessage(error)); } }
  function switchWorkspace(key: string) {
    workspaceEpoch.current += 1; cancelPlan(); setCourseDialog(null); setTaskDialog(null); setConfirmAction(null); setPreview(null); setAI({ ...defaultAI }); canvasForm.current?.reset(); setStorageKey(key); setResult(null); setStale(false); setSearch(""); setCourseFilter("all"); setStatusFilter("all");
    try { const saved = localStorage.getItem(key); const next = saved ? parseAppData(JSON.parse(saved)) : emptyData(); setData(next); return next; }
    catch { const next = emptyData(); setData(next); setMessage("This workspace's saved data is invalid. It has not been overwritten."); return next; }
  }

  async function generatePlan() {
    if (!data || isPlanning) return;
    if (!data.assignments.some(a => a.status !== "done")) { setActiveTab("data"); setMessage("Add an unfinished task before generating a plan."); return; }
    cancelPlan(); const requestId = generation.current; const abort = new AbortController(); controller.current = abort; setIsPlanning(true);
    const timeout = window.setTimeout(() => abort.abort(), 28000);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, ai }), signal: abort.signal, cache: "no-store" });
      if (!response.ok) throw new Error("The adviser is unavailable. Your rule-based plan is still ready.");
      const next = await response.json() as PlannerResult;
      if (!Array.isArray(next.plan) || typeof next.summary !== "string" || !Array.isArray(next.suggestions)) throw new Error("The planner returned an invalid result.");
      if (generation.current === requestId) { setResult(next); setStale(false); setActiveTab("plan"); }
    } catch (error) {
      if (generation.current === requestId) { setResult(localResult(data)); setStale(false); setActiveTab("plan"); setMessage(errorMessage(error)); }
    } finally { window.clearTimeout(timeout); if (generation.current === requestId) setIsPlanning(false); }
  }

  function submitCourse(form: FormData) {
    if (!data) return;
    const previous = courseDialog !== "new" ? courseDialog : null;
    const course: Course = { ...(previous || {}), id: previous?.id || crypto.randomUUID(), code: String(form.get("code") || "").trim().toUpperCase(), name: String(form.get("name") || "").trim(), color: String(form.get("color") || colors[data.courses.length % colors.length]) };
    try { saveData({ ...data, courses: previous ? data.courses.map(c => c.id === previous.id ? course : c) : [...data.courses, course] }); setCourseDialog(null); } catch (error) { setMessage(errorMessage(error)); }
  }
  function submitTask(form: FormData) {
    if (!data) return;
    try {
      const previous = taskDialog !== "new" ? taskDialog : null;
      const task: Assignment = { ...(previous || {}), id: previous?.id || crypto.randomUUID(), courseId: String(form.get("courseId") || ""), title: String(form.get("title") || ""), dueAt: parseHongKongDateTime(String(form.get("dueAt") || "")), estimatedHours: Number(form.get("estimatedHours")), priority: String(form.get("priority")) as Assignment["priority"], status: String(form.get("status")) as Assignment["status"] };
      saveData({ ...data, assignments: previous ? data.assignments.map(a => a.id === previous.id ? task : a) : [...data.assignments, task] }); setTaskDialog(null);
    } catch (error) { setMessage(errorMessage(error)); }
  }

  async function readImport(file: File | undefined, kind: "backup" | "canvas" = "backup") {
    if (!file) return;
    const epoch = workspaceEpoch.current; const importId = ++importSerial.current;
    try { if (file.size > 2_000_000) throw new Error("Choose a JSON file smaller than 2 MB."); const text = await file.text(); if (workspaceEpoch.current !== epoch || importSerial.current !== importId) return; if (kind === "backup") setPreview({ kind: "backup", data: importBackup(text) }); else setPreview({ kind: "canvas", ...normalizeCanvasData(JSON.parse(text)) }); }
    catch (error) { if (workspaceEpoch.current === epoch && importSerial.current === importId) setMessage(errorMessage(error)); }
  }
  async function syncCanvas(form?: FormData) {
    const token = form ? String(form.get("canvas-access" ) || "").trim() : canvasToken;
    if (!token) { setMessage("Enter your Canvas access token to test the connection."); return; }
    if (!canvasEnabled) { setMessage("Personal Canvas token testing is not enabled on this server. Use a local development copy or ask the operator to enable controlled testing."); return; }
    setSyncing(true); const serial = ++canvasSerial.current; const epoch = workspaceEpoch.current; canvasController.current?.abort(); const abort = new AbortController(); canvasController.current = abort; const timeout = window.setTimeout(() => abort.abort(), 28000); const accountGeneration = ++generation.current; controller.current?.abort(); setIsPlanning(false);
    try {
      const response = await fetch("/api/canvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: token, action: "sync" }), signal: abort.signal, cache: "no-store" });
      const value = await response.json() as Partial<CanvasResult> & { error?: string };
      if (generation.current !== accountGeneration || canvasSerial.current !== serial || workspaceEpoch.current !== epoch) return;
      if (!response.ok) throw new Error(value.error || "Canvas could not be reached. Check your token and access.");
      if (!value.profile?.workspaceId || !/^[a-f0-9]{64}$/.test(value.profile.workspaceId)) throw new Error("Canvas returned an invalid workspace identity.");
      const parsed = parseAppData({ courses: value.courses, assignments: value.assignments, availability: [], weeklyGoal: "" });
      const nextProfile = value.profile as Profile;
      if (profile?.workspaceId !== nextProfile.workspaceId) switchWorkspace(`studypilot-canvas-${nextProfile.workspaceId}`);
      canvasForm.current?.reset(); setProfile(nextProfile); setCanvasToken(token); setPreview({ kind: "canvas", courses: parsed.courses, assignments: parsed.assignments, warnings: Array.isArray(value.warnings) ? value.warnings : [] });
      setMessage("Canvas was read successfully. Review the imported tasks before applying them.");
    } catch (error) { if (canvasSerial.current === serial && workspaceEpoch.current === epoch) setMessage(errorMessage(error)); }
    finally { window.clearTimeout(timeout); if (canvasSerial.current === serial) setSyncing(false); }
  }
  function disconnect() { canvasSerial.current += 1; canvasController.current?.abort(); setSyncing(false); canvasForm.current?.reset(); setCanvasToken(""); setProfile(null); setAI({ ...defaultAI }); setPreview(null); switchWorkspace(manualKey); setMessage("Disconnected. Your keys have been cleared from this page. Local study data remains available in its original workspace."); }
  function confirmImport() {
    if (!preview || !data) return;
    try { saveData(preview.kind === "backup" ? preview.data : mergeCanvasData(data, preview)); setPreview(null); setActiveTab("data"); setMessage("Import applied. Review estimated hours and regenerate the plan."); }
    catch (error) { setMessage(errorMessage(error)); }
  }

  if (!data) return <main className="workspace-loading"><div className="workspace-loading-brand"><div className="brand-mark"><GraduationCap /></div><p>StudyPilot</p><span><Loader2 className="animate-spin" /> Opening your study workspace…</span></div></main>;
  const active = data.assignments.filter(a => a.status !== "done").sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const overdue = active.filter(a => Date.parse(a.dueAt) < now);
  const upcoming = active.filter(a => Date.parse(a.dueAt) >= now);
  const visible = data.assignments.filter(a => (statusFilter === "all" || a.status === statusFilter) && (courseFilter === "all" || a.courseId === courseFilter) && `${a.title} ${data.courses.find(c => c.id === a.courseId)?.code}`.toLowerCase().includes(search.toLowerCase()));
  const totalHours = active.reduce((sum, a) => sum + a.estimatedHours, 0);
  const patchTask = (id: string, patch: Partial<Assignment>) => edit({ ...data, assignments: data.assignments.map(a => a.id === id ? { ...a, ...patch } : a) });

  return <main className="study-app">
    <div className="app-frame">
      <aside className="workspace-sidebar">
        <div className="workspace-brand"><div className="brand-mark"><GraduationCap /></div><div><p>StudyPilot<span>AI</span></p><span>SPACE TO MAKE PROGRESS</span></div></div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Main navigation">{nav.map(([value, Icon, label]) => <button key={value} onClick={() => setActiveTab(value)} aria-current={activeTab === value ? "page" : undefined} className={activeTab === value ? "sidebar-nav-item is-active" : "sidebar-nav-item"}><Icon /><span>{label}</span>{activeTab === value && <span className="nav-current-mark" aria-hidden="true" />}</button>)}</nav>
        <div className="sidebar-note"><div className="sidebar-note-icon"><ShieldCheck /></div><p>Your space. Your pace.</p><span>Your study data stays in this browser. Keys clear on refresh or disconnect.</span><div className="sidebar-timezone"><Clock3 /> Hong Kong time</div></div>
        <div className="sidebar-footer"><span className="sidebar-footer-mark">SP</span><div><p>Made for your next chapter.</p><span>Personal learning workspace</span></div></div>
      </aside>
      <section className="workspace-main">
        <header className="workspace-header"><div className="header-location"><span>Workspace</span><span className="header-slash">/</span><strong>{nav.find(([value]) => value === activeTab)?.[2]}</strong></div><div className="header-actions"><div className="workspace-identity"><span className="identity-avatar">{profile ? profile.displayName.charAt(0).toUpperCase() : "SP"}</span><div><p>{profile ? profile.displayName : "My workspace"}</p><span>{profile ? "Personal Canvas workspace" : "Manual workspace"}</span></div></div>{profile && <Button variant="outline" onClick={disconnect} aria-label="Disconnect Canvas" className="header-disconnect"><LogOut className="size-4" /><span className="hidden sm:inline">Disconnect</span></Button>}<Button onClick={generatePlan} disabled={isPlanning} className="header-generate">{isPlanning ? <Loader2 className="animate-spin" /> : <Sparkles />}<span>{isPlanning ? "Generating…" : "Generate plan"}</span></Button></div></header>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="block">
          <div className="mobile-navigation"><TabsList variant="line" className="mobile-tab-list">{nav.map(([value, , label]) => <TabsTrigger value={value} key={value}>{label}</TabsTrigger>)}</TabsList></div>
          <div className="workspace-content">
            {message && <div role="status" className="workspace-notice"><CircleAlert className="notice-icon" /><p>{message}</p><button onClick={() => setMessage("")} aria-label="Dismiss message"><X className="size-4" /></button></div>}
            <TabsContent value="overview" className="m-0 space-y-7">
              <div className="overview-date"><span className="page-kicker">YOUR WEEK, WITH INTENTION</span><span>{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", weekday: "long", day: "numeric", month: "long" }).format(new Date(now))}</span></div>
              <section className="overview-hero">
                <div className="hero-copy"><h1>Your next seven days,<br /><span>planned.</span></h1><p>Turn a busy week into a clear next step. Bring your coursework together and make time for what matters.</p><div className="hero-actions"><Button onClick={() => data.courses.length ? setTaskDialog("new") : setCourseDialog("new")} className="hero-primary"><Plus />{data.courses.length ? "Add task" : "Add your first course"}</Button><Button onClick={() => setActiveTab("connections")} variant="ghost" className="hero-secondary"><Link2 /> Connect your services <ArrowRight className="hero-arrow" /></Button></div><div className="hero-footnote"><ShieldCheck /> Your deadlines lead. AI helps you find a rhythm.</div></div>
                <div className="focus-card"><div className="focus-card-top"><span>ON YOUR RADAR</span><CalendarDays /></div>{upcoming[0] ? <><span className="focus-course">{data.courses.find(c => c.id === upcoming[0].courseId)?.code}</span><h2>{upcoming[0].title}</h2><div className="focus-deadline"><Clock3 /><div><span>Next deadline</span><strong>{dueLabel(upcoming[0].dueAt)} HKT</strong></div></div><div className="focus-card-bottom"><span>{upcoming[0].estimatedHours}h estimated effort</span><button onClick={() => setTaskDialog(upcoming[0])} aria-label={`Edit ${upcoming[0].title}`}><ArrowRight /></button></div></> : <><span className="focus-course">A CLEAR START</span><h2>{active.length ? "Make space for a fresh plan." : "A new week, a fresh perspective."}</h2><p>{active.length ? "Review overdue tasks and decide your next step." : "Add your first deadline and we’ll keep it in focus here."}</p><div className="focus-card-bottom"><span>{active.length ? `${active.length} unfinished tasks` : "Ready when you are"}</span><button onClick={() => setActiveTab("data")} aria-label="View courses and tasks"><ArrowRight /></button></div></>}</div>
              </section>
              <div className="metrics-grid">{[
                { value: String(data.courses.length), label: "Courses", note: "Your learning, all together", icon: BookOpen },
                { value: String(active.length), label: "Active tasks", note: "One step at a time", icon: Target },
                { value: `${Number(totalHours.toFixed(2))}`, unit: "h", label: "Remaining estimate", note: "Time to make progress", icon: Clock3 },
                { value: String(overdue.length), label: "Overdue tasks", note: overdue.length ? "A little attention needed" : "A clean slate", icon: CalendarDays },
              ].map(({value, unit, label, note, icon: Icon}) => <div key={label} className={`metric-card${label === "Overdue tasks" && overdue.length ? " metric-attention" : ""}`}><div className="metric-label"><span>{label}</span><div className="metric-icon"><Icon /></div></div><p className="metric-value">{value}<span>{unit}</span></p><p className="metric-note">{note}</p></div>)}</div>
              <div className="overview-lower"><section className="surface-card deadlines-card"><div className="card-heading"><div><p className="page-kicker">A LITTLE LOOK AHEAD</p><h2 className="section-title">Upcoming deadlines</h2></div><Button variant="ghost" onClick={() => setActiveTab("data")} className="text-action">All tasks <ArrowRight /></Button></div>{!upcoming.length ? <div className="deadline-empty"><div><CalendarDays /></div><h3>{active.length ? "Time to reset your priorities" : "Your next chapter starts here"}</h3><Empty text={active.length ? "All unfinished tasks are overdue. Review them in Courses & tasks." : "Your workspace is ready. Add a course and task to begin."} /></div> : <div className="deadline-list">{upcoming.slice(0, 5).map(a => <div key={a.id} className="deadline-row"><button onClick={() => patchTask(a.id, { status: "done" })} className="completion-button" aria-label={`Complete ${a.title}`}><Check /></button><div className="deadline-row-copy"><p><span style={{ background: data.courses.find(c => c.id === a.courseId)?.color }} />{data.courses.find(c => c.id === a.courseId)?.code}</p><button onClick={() => setTaskDialog(a)}>{a.title}</button><span>{dueLabel(a.dueAt)} HKT</span></div><div className="deadline-effort"><strong>{a.estimatedHours}<span>h</span></strong><span>remaining</span></div></div>)}</div>}</section><section className="rhythm-card"><div className="rhythm-icon"><BrainCircuit /></div><p className="page-kicker">BUILD A BETTER RHYTHM</p><h2>A plan you<br />can check.</h2><p>Real deadlines. Room to focus.<br />A little breathing space.</p><div className="rhythm-rules"><div><strong>30–90<span> min</span></strong><span>Time to focus</span></div><div><strong>15<span> min</span></strong><span>Time to recharge</span></div></div><p className="rhythm-detail">Your plan respects your available hours and flags any work that doesn’t fit.</p><Button variant="outline" onClick={() => setActiveTab("availability")} className="rhythm-button">Set available hours <ArrowRight /></Button></section></div>
              {!data.courses.length && <div className="sample-nudge"><span>Want to explore first?</span><Button variant="ghost" onClick={() => edit(demoData())}>Try a sample course and task <ArrowRight /></Button></div>}
            </TabsContent>

            <TabsContent value="data" className="m-0 space-y-6">
              <Heading title="Courses and tasks" text="Keep deadlines and remaining effort up to date. All displayed times are Hong Kong time." />
              <div className="courses-layout"><section className="surface-card course-directory"><div className="card-heading"><h2 className="section-title">My courses</h2><Button size="sm" variant="outline" onClick={() => setCourseDialog("new")}><Plus /> Course</Button></div><div className="mt-5 space-y-3">{data.courses.map(c => <div key={c.id} className="course-item"><span className="h-10 w-1 shrink-0 rounded-full" style={{ background: c.color }} /><div className="min-w-0 flex-1"><p className="font-bold">{c.code}</p><p className="truncate text-sm text-[#737d94]">{c.name}</p>{c.source === "canvas" && <p className="text-xs text-primary">Canvas</p>}</div><IconButton label={`Edit ${c.code}`} onClick={() => setCourseDialog(c)}><Edit3 /></IconButton><IconButton label={`Delete ${c.code}`} onClick={() => setConfirmAction({ text: `Delete ${c.code} and its ${data.assignments.filter(a => a.courseId === c.id).length} tasks?`, action: () => { edit({ ...data, courses: data.courses.filter(x => x.id !== c.id), assignments: data.assignments.filter(x => x.courseId !== c.id) }); setCourseFilter("all"); } })}><Trash2 /></IconButton></div>)}</div>{!data.courses.length && <Empty text="Add a course or import your coursework." />}</section>
              <section className="surface-card task-directory"><div className="card-heading"><div><p className="page-kicker">YOUR COURSEWORK</p><h2 className="section-title">Assignments and exams</h2></div><Button onClick={() => setTaskDialog("new")} disabled={!data.courses.length}><Plus /> Add task</Button></div><div className="task-filters"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-[#737d94]" /><Input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search tasks" placeholder="Search tasks" className="pl-9" /></div><select className={selectStyle} aria-label="Filter by course" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}><option value="all">All courses</option>{data.courses.map(c => <option value={c.id} key={c.id}>{c.code}</option>)}</select><select className={selectStyle} aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Completed</option></select></div><div className="mt-5 space-y-3">{visible.map(a => <div key={a.id} className="assignment-item"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm text-[#737d94]">{data.courses.find(c => c.id === a.courseId)?.code}{a.source === "canvas" ? " · Canvas" : ""}</p><p className="mt-1 break-words font-semibold">{a.title}</p><p className={`mt-1 text-sm ${a.status !== "done" && Date.parse(a.dueAt) < now ? "text-[#bc4936]" : "text-[#737d94]"}`}>{a.status !== "done" && Date.parse(a.dueAt) < now ? "Overdue · " : "Due "}{dueLabel(a.dueAt)} HKT · {a.estimatedHours}h remaining</p></div><div className="flex shrink-0"><IconButton label={`Edit ${a.title}`} onClick={() => setTaskDialog(a)}><Edit3 /></IconButton><IconButton label={`Delete ${a.title}`} onClick={() => setConfirmAction({ text: `Delete the task “${a.title}”?`, action: () => edit({ ...data, assignments: data.assignments.filter(x => x.id !== a.id) }) })}><Trash2 /></IconButton></div></div><div className="mt-4 grid grid-cols-2 gap-3"><select aria-label={`Priority for ${a.title}`} value={a.priority} className={selectStyle} onChange={e => patchTask(a.id, { priority: e.target.value as Assignment["priority"] })}><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><select aria-label={`Status for ${a.title}`} value={a.status} className={selectStyle} onChange={e => patchTask(a.id, { status: e.target.value as Assignment["status"] })}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Completed</option></select></div></div>)}</div>{!visible.length && <Empty text={data.assignments.length ? "No tasks match these filters." : "No tasks yet. Add an assignment and its deadline."} />}</section></div>
            </TabsContent>

            <TabsContent value="availability" className="m-0 space-y-6"><Heading title="Weekly availability" text="Choose when you can study, in Hong Kong time. Overlapping windows are combined by the planner." /><section className="surface-card availability-card"><div className="space-y-3">{data.availability.map((slot, i) => <SlotEditor key={`${storageKey}-${i}`} index={i} slot={slot} onSave={next => edit({ ...data, availability: data.availability.map((s, j) => i === j ? next : s) })} onDelete={() => edit({ ...data, availability: data.availability.filter((_, j) => i !== j) })} />)}</div>{!data.availability.length && <Empty text="Add at least one window before planning. The planner will not guess when you are free." />}<Button variant="outline" className="mt-5" onClick={() => edit({ ...data, availability: [...data.availability, { day: 1, start: "19:00", end: "21:00" }] })}><Plus /> Add time slot</Button><div className="mt-8 border-t pt-6"><Label htmlFor="weekly-goal">Study goals and preferences</Label><Textarea id="weekly-goal" maxLength={1000} value={data.weeklyGoal} onChange={e => edit({ ...data, weeklyGoal: e.target.value })} className="mt-3 min-h-28" /><p className="mt-2 text-sm text-[#737d94]">Goals guide AI advice. Available hours and deadlines determine the schedule.</p></div></section></TabsContent>

            <TabsContent value="plan" className="m-0 space-y-6"><div className="plan-page-heading"><Heading title="Personal study plan" text="Your next seven days in Hong Kong time, with deadlines and breaks checked." /><div className="flex gap-2"><Button variant="outline" disabled={!result?.plan.length || stale} onClick={() => result && download("StudyPilot-plan.ics", calendarExport(result.plan, data.courses), "text/calendar")}><Download /> Calendar</Button><Button onClick={generatePlan} disabled={isPlanning}>{isPlanning ? <Loader2 className="animate-spin" /> : <Sparkles />}Regenerate</Button></div></div>{stale && result && <div role="status" className="stale-plan-notice">Your study data or adviser changed. Regenerate before using or exporting this plan.</div>}{!result ? <section className="surface-card plan-empty"><BrainCircuit className="mx-auto size-12 text-primary" /><h2 className="mt-5 text-xl font-bold">Ready when you are</h2><p className="mx-auto mt-3 max-w-lg leading-7 text-[#69748c]">Confirm your tasks and available hours, then generate a plan. You can use the rule engine with no AI key.</p><Button onClick={generatePlan} disabled={isPlanning} className="mt-5">Generate plan</Button></section> : <PlanView result={result} courses={data.courses} />}</TabsContent>

            <TabsContent value="connections" className="m-0 space-y-6"><Heading title="Your data and AI connections" text="Choose your own services and quota. Keys are used for this page session and are excluded from saved study data and backups." />
              <div className="connections-grid">
                <section className="surface-card connection-card"><div className="connection-card-top"><span className="connection-icon"><Link2 /></span><Badge>{profile ? "Token verified" : canvasEnabled ? "Personal testing available" : "OAuth required for shared use"}</Badge></div><h2 className="mt-4 text-xl font-bold">CityUHK Canvas</h2><p className="mt-2 text-sm leading-6 text-[#69748c]">Use your own access token for personal development testing. Shared applications require Canvas OAuth approval.</p><form ref={canvasForm} action={form => { void syncCanvas(form); }} className="mt-5 space-y-4"><Field label="Canvas URL" id="canvas-url"><Input id="canvas-url" value="https://canvas.cityu.edu.hk" readOnly /></Field><Field label="Personal access token" id="canvas-access"><Input id="canvas-access" name="canvas-access" type="password" autoComplete="off" spellCheck={false} required placeholder="Paste your own token for this session" /></Field><Button type="submit" disabled={syncing || !canvasEnabled}>{syncing ? <Loader2 className="animate-spin" /> : <Link2 />}{syncing ? "Reading Canvas…" : "Connect and preview courses"}</Button></form>{profile && <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" disabled={syncing} onClick={() => void syncCanvas()}>Refresh preview</Button><Button variant="outline" onClick={disconnect}>Disconnect and clear keys</Button><Button variant="outline" onClick={() => setConfirmAction({ text: "Remove Canvas courses and tasks from this local workspace? Your Canvas account will not be changed.", action: () => edit({ ...data, courses: data.courses.filter(c => c.source !== "canvas"), assignments: data.assignments.filter(a => a.source !== "canvas" && data.courses.some(c => c.id === a.courseId && c.source !== "canvas")) }) })}>Remove imported data</Button></div>}{!canvasEnabled && <p className="mt-4 text-sm leading-6 text-[#737d94]">Personal token testing is disabled on this deployment. Run locally for self-testing; enable the approved testing mode before using a hosted token connection.</p>}</section>
                <section className="surface-card connection-card"><div className="connection-card-top"><span className="connection-icon"><BrainCircuit /></span><Badge>{ai.mode === "personal" ? `Your ${ai.provider} quota` : ai.mode === "server" ? "Server AI selected" : "No AI quota used"}</Badge></div><h2 className="mt-4 text-xl font-bold">AI adviser</h2><p className="mt-2 text-sm leading-6 text-[#69748c]">Your key is sent only to the selected provider through the server. Personal mode never switches to a shared key.</p><AIForm key={`${storageKey}-${ai.mode}-${ai.provider}-${ai.apiKey ? "set" : "empty"}`} settings={ai} onSave={next => { cancelPlan(); setAI(next); setStale(true); setMessage("AI settings applied for this page session. Generate a plan to check the connection."); }} /><p className="mt-4 text-sm text-[#737d94]">{result ? `Last generation: ${result.aiStatus || result.source}` : "No AI request has been made in this session."}</p></section>
              </div>
              <section className="surface-card backup-card"><div className="backup-card-icon"><Download /></div><h2 className="section-title">Backups and sample data</h2><p className="mt-2 text-sm leading-6 text-[#69748c]">Backup import replaces this workspace after confirmation. Canvas previews merge by source identifier. Keep a backup before clearing browser data.</p><div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => download("StudyPilot-backup.json", exportBackup(data))}><Download /> Download backup</Button><Label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm hover:bg-muted"><Upload className="size-4" />Import backup<Input type="file" accept="application/json,.json" className="sr-only" aria-label="Import backup JSON" onChange={e => { void readImport(e.target.files?.[0]); e.target.value = ""; }} /></Label><Button variant="outline" onClick={() => { const sample = demoData(); setPreview({ kind: "canvas", courses: sample.courses.map(c => ({ ...c, id: `canvas-${c.id}`, source: "canvas" })), assignments: sample.assignments.map(a => ({ ...a, id: `canvas-${a.id}`, courseId: `canvas-${a.courseId}`, source: "canvas" })), warnings: ["Synthetic demonstration data. No Canvas account was contacted."] }); }}>Preview synthetic Canvas data</Button><Label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><Upload className="size-4" />Import Canvas JSON<Input type="file" accept="application/json,.json" className="sr-only" aria-label="Import Canvas JSON" onChange={e => { void readImport(e.target.files?.[0], "canvas"); e.target.value = ""; }} /></Label></div></section>
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </div>

    <Dialog open={courseDialog !== null} onOpenChange={open => { if (!open) setCourseDialog(null); }}><DialogContent><form action={submitCourse} key={typeof courseDialog === "object" ? courseDialog?.id : "new-course"}><DialogHeader><DialogTitle>{courseDialog === "new" ? "Add course" : "Edit course"}</DialogTitle><DialogDescription>Course facts stay in your current browser workspace.</DialogDescription></DialogHeader><div className="my-6 space-y-4"><Field label="Course code" id="course-code"><Input id="course-code" name="code" maxLength={80} required defaultValue={typeof courseDialog === "object" ? courseDialog?.code : ""} /></Field><Field label="Course name" id="course-name"><Input id="course-name" name="name" maxLength={200} required defaultValue={typeof courseDialog === "object" ? courseDialog?.name : ""} /></Field><Field label="Colour" id="course-color"><Input id="course-color" name="color" type="color" defaultValue={typeof courseDialog === "object" ? courseDialog?.color : colors[data.courses.length % colors.length]} /></Field></div><DialogFooter><Button type="button" variant="outline" onClick={() => setCourseDialog(null)}>Cancel</Button><Button type="submit">Save course</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={taskDialog !== null} onOpenChange={open => { if (!open) setTaskDialog(null); }}><DialogContent><form action={submitTask} key={typeof taskDialog === "object" ? taskDialog?.id : "new-task"}><DialogHeader><DialogTitle>{taskDialog === "new" ? "Add task" : "Edit task"}</DialogTitle><DialogDescription>Enter the remaining study effort. Deadlines use Hong Kong time.</DialogDescription></DialogHeader><div className="my-6 space-y-4"><Field label="Task name" id="task-title"><Input id="task-title" name="title" maxLength={240} required defaultValue={typeof taskDialog === "object" ? taskDialog?.title : ""} /></Field><Field label="Course" id="task-course"><select id="task-course" name="courseId" required className={selectStyle} defaultValue={typeof taskDialog === "object" ? taskDialog?.courseId : data.courses[0]?.id}>{data.courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Deadline (HKT)" id="task-due"><Input id="task-due" name="dueAt" type="datetime-local" required defaultValue={typeof taskDialog === "object" && taskDialog ? hongKongDateTimeInput(taskDialog.dueAt) : ""} /></Field><Field label="Remaining hours" id="task-hours"><Input id="task-hours" name="estimatedHours" type="number" min="0.5" max="200" step="0.5" required defaultValue={typeof taskDialog === "object" ? taskDialog?.estimatedHours : 2} /></Field></div><div className="grid grid-cols-2 gap-4"><Field label="Priority" id="task-priority"><select id="task-priority" name="priority" className={selectStyle} defaultValue={typeof taskDialog === "object" ? taskDialog?.priority : "medium"}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field><Field label="Status" id="task-status"><select id="task-status" name="status" className={selectStyle} defaultValue={typeof taskDialog === "object" ? taskDialog?.status : "todo"}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Completed</option></select></Field></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setTaskDialog(null)}>Cancel</Button><Button type="submit">Save task</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={preview !== null} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-h-[85dvh] overflow-auto"><DialogHeader><DialogTitle>{preview?.kind === "backup" ? "Restore backup?" : "Review Canvas import"}</DialogTitle><DialogDescription>{preview?.kind === "backup" ? "This replaces the current workspace. Download a backup first if you need to keep it." : "These records will merge into your current workspace. Confirm estimated effort after importing."}</DialogDescription></DialogHeader>{preview && <div className="space-y-4"><p className="font-semibold">{(preview.kind === "backup" ? preview.data.courses : preview.courses).length} courses · {(preview.kind === "backup" ? preview.data.assignments : preview.assignments).length} tasks</p><div className="max-h-64 space-y-2 overflow-auto">{(preview.kind === "backup" ? preview.data.assignments : preview.assignments).slice(0, 100).map(a => <div key={a.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="mt-1 text-[#737d94]">{dueLabel(a.dueAt)} HKT · {a.estimatedHours}h</p></div>)}</div>{preview.kind === "canvas" && preview.warnings.map((warning, i) => <p key={i} className="text-sm leading-6 text-[#8c5c2c]">{warning}</p>)}</div>}<DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button><Button onClick={confirmImport}>Confirm import</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={confirmAction !== null} onOpenChange={open => { if (!open) setConfirmAction(null); }}><DialogContent><DialogHeader><DialogTitle>Confirm deletion</DialogTitle><DialogDescription>{confirmAction?.text}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button><Button variant="destructive" onClick={() => { confirmAction?.action(); setConfirmAction(null); }}>Delete</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}

function Heading({ title, text }: { title: string; text: string }) { return <div className="page-heading"><h1>{title}</h1><p>{text}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="empty-message">{text}</p>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="status-badge">{children}</span>; }
function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button aria-label={label} title={label} onClick={onClick} className="icon-button">{children}</button>; }
function SlotEditor({ slot, index, onSave, onDelete }: { slot: Availability; index: number; onSave: (slot: Availability) => void; onDelete: () => void }) {
  return <form className="availability-row" key={`${slot.day}-${slot.start}-${slot.end}`} action={form => { onSave({ day: Number(form.get("day")), start: String(form.get("start")), end: String(form.get("end")) }); }}><Field label="Day" id={`day-${index}`}><select id={`day-${index}`} name="day" defaultValue={slot.day} className={selectStyle}>{days.map((day, i) => <option key={day} value={i}>{day}</option>)}</select></Field><Field label="From" id={`from-${index}`}><Input id={`from-${index}`} type="time" name="start" defaultValue={slot.start} required /></Field><Field label="Until" id={`until-${index}`}><Input id={`until-${index}`} type="time" name="end" defaultValue={slot.end} required /></Field><Button type="submit" variant="outline">Save</Button><Button type="button" variant="ghost" aria-label={`Delete ${days[slot.day]} time slot`} onClick={onDelete}><Trash2 /></Button></form>;
}
function AIForm({ settings, onSave }: { settings: AISettings; onSave: (value: AISettings) => void }) {
  const [mode, setMode] = useState(settings.mode);
  const [provider, setProvider] = useState(settings.provider);
  return <form className="mt-5 space-y-4" action={form => { onSave({ mode, provider, model: String(form.get("model") || "").trim(), apiKey: String(form.get("personal-api-credential") || "").trim() }); }}><Field label="Planning mode" id="ai-mode"><select id="ai-mode" className={selectStyle} value={mode} onChange={e => setMode(e.target.value as AISettings["mode"])}><option value="rules">Rule engine only · no AI cost</option><option value="personal">Use my own AI key and quota</option><option value="server">Use the server&apos;s school AI configuration</option></select></Field>{mode === "personal" && <><Field label="Provider" id="ai-provider"><select id="ai-provider" className={selectStyle} value={provider} onChange={e => setProvider(e.target.value as AISettings["provider"])}><option value="cityu">CityU CSLab</option><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option></select></Field><Field label="Model ID" id="ai-model"><Input key={`model-${provider}`} id="ai-model" name="model" required maxLength={160} defaultValue={provider === settings.provider ? settings.model : provider === "cityu" ? "CS5351/DeepSeek-V4-Flash" : provider === "deepseek" ? "deepseek-flash" : ""} placeholder="Exact model ID from your provider" /></Field><Field label="Your API key" id="personal-api-credential"><Input key={`credential-${provider}`} id="personal-api-credential" name="personal-api-credential" type="password" autoComplete="off" spellCheck={false} required placeholder={settings.apiKey ? "Re-enter to replace the current key" : "Paste your own API key"} maxLength={4096} /></Field></>}<div className="flex flex-wrap gap-2"><Button type="submit">Apply AI settings</Button><Button type="button" variant="outline" onClick={() => { setMode("rules"); onSave({ ...defaultAI }); }}>Clear my AI key</Button></div></form>;
}
function PlanView({ result, courses }: { result: PlannerResult; courses: Course[] }) {
  const grouped = result.plan.reduce<Record<string, PlanBlock[]>>((all, block) => { (all[block.date] ||= []).push(block); return all; }, {});
  const source = result.source === "personal-ai" ? "Your AI + rule validation" : result.source === "school-ai" ? "School AI + rule validation" : "Rule engine";
  return <div className="plan-layout"><section className="surface-card schedule-card"><div className="card-heading"><h2 className="section-title">Seven-day schedule</h2><Badge>{source}</Badge></div><p className="mt-3 text-sm text-[#737d94]">{result.generatedAt ? `Generated ${dueLabel(result.generatedAt)} HKT` : "Hong Kong time"}</p>{!result.plan.length && <Empty text="No study blocks fit the current tasks and available hours. Review the warnings, deadlines and time windows." />}<div className="mt-6 space-y-6">{Object.entries(grouped).map(([date, blocks]) => <div key={date}><h3 className="mb-3 font-semibold">{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", weekday: "long", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00+08:00`))}</h3><div className="space-y-2">{blocks.map(b => <div key={b.id} className="schedule-block"><span className="w-1 shrink-0 rounded-full" style={{ background: courses.find(c => c.id === b.courseId)?.color }} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="break-words font-semibold">{b.title}</p><p className="text-sm font-semibold text-[#59647c]">{b.start}–{b.end}</p></div><p className="mt-1 text-sm text-[#737d94]">{courses.find(c => c.id === b.courseId)?.code} · {Number(b.durationHours.toFixed(2))}h</p></div></div>)}</div></div>)}</div></section><div className="space-y-5"><section className="surface-card advice-card"><div className="connection-icon"><Sparkles /></div><h2 className="mt-4 section-title">Analysis and suggestions</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#59647c]">{result.summary}</p>{result.source !== "rule-engine" && <p className="mt-3 text-sm text-[#737d94]">AI references Task 1, Task 2, etc. in deadline order. Course and task names are withheld from the provider.</p>}<ul className="mt-5 space-y-3">{result.suggestions.map((item, i) => <li key={i} className="flex gap-2 text-sm leading-6 text-[#59647c]"><Check className="mt-1 size-4 shrink-0 text-[#4f8b69]" /><span>{item}</span></li>)}</ul><p className="mt-5 border-t pt-4 text-sm text-[#737d94]">AI status: {result.aiStatus || result.source}. Advice does not change the schedule.</p></section>{result.warnings.length > 0 && <section className="attention-card"><h3 className="flex items-center gap-2 font-semibold"><CircleAlert className="size-5 text-[#bc4936]" />Needs your attention</h3><div className="mt-3 space-y-3">{result.warnings.map((warning, i) => <p key={i} className="text-sm leading-6 text-[#75635f]">{warning}</p>)}</div></section>}</div></div>;
}
