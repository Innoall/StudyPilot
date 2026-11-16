import test from "node:test";
import assert from "node:assert/strict";
import { parseAiAdvice, buildAiContext, generateStudyPlan } from "../../src/lib/ai.ts";
import { assertCanvasBaseUrl, assertAiBaseUrl, readBoundedJson, assertSameOrigin, validateCredential } from "../../src/lib/provider-security.ts";
import { syncCanvas, normaliseCanvasSnapshot, isPersonalTokenTestingEnabled } from "../../src/lib/canvas.ts";

const now = Date.parse("2026-11-16T08:00:00+08:00");
const data = {
  courses: [{ id: "private-course-id", code: "CS5351", name: "My private name", color: "#3d5af1" }],
  assignments: [{ id: "private-task-id", courseId: "private-course-id", title: "Private submission by alice@example.test", dueAt: "2026-11-18T23:59:00+08:00", estimatedHours: 2, priority: "high", status: "todo" }],
  availability: [{ day: 1, start: "19:00", end: "22:00" }], weeklyGoal: "Help alice@example.test prepare, call 12345678",
};
const personal = { mode: "personal", provider: "openai", model: "test-model", apiKey: "synthetic-test-key" };
const goodAdvice = { summary: "Prepare for the nearest deadline.", suggestions: ["Review the concepts.", "Check your progress.", "Take a short break."] };
const providerResponse = (content = JSON.stringify(goodAdvice)) => Response.json({ choices: [{ message: { content }, finish_reason: "stop" }] });

test("FR-005 accepts exactly three nonempty AI suggestions; invalid structures fail closed", () => {
  assert.deepEqual(parseAiAdvice(JSON.stringify(goodAdvice)), goodAdvice);
  for (const bad of [{}, { ...goodAdvice, suggestions: [] }, { ...goodAdvice, plan: [] }, { ...goodAdvice, summary: "" }, { ...goodAdvice, summary: "x".repeat(1601) }]) {
    assert.throws(() => parseAiAdvice(JSON.stringify(bad)));
  }
  assert.throws(() => parseAiAdvice("not json"));
});

test("PRIV-001 AI context aliases identifiers, titles and names and strips personal preference text", () => {
  const context = JSON.stringify(buildAiContext(data));
  for (const value of ["private-course-id", "private-task-id", "My private name", "alice@example.test", "12345678", "Private submission"]) assert.ok(!context.includes(value));
  assert.ok(context.includes("2026-11-18"));
  assert.ok(context.length <= 12_000);
});

test("FR-005 AI capacity counts overlapping availability only once", () => {
  const context = buildAiContext({ ...data, availability: [
    { day: 1, start: "19:00", end: "21:00" }, { day: 1, start: "20:00", end: "22:00" },
    { day: 1, start: "19:00", end: "21:00" }, { day: 2, start: "10:00", end: "11:00" },
  ] });
  assert.equal(context.availableHours, 4);
});

test("PRIV-001/COST-001 large contexts omit lower urgency facts and keep byte budget", () => {
  const context = buildAiContext({ ...data, weeklyGoal: "My private name is Unrecognisable Person 012345. Review before exams.", assignments: Array.from({ length: 1000 }, (_, i) => ({ ...data.assignments[0], id: `private-${i}` })) });
  assert.ok(new TextEncoder().encode(JSON.stringify(context)).byteLength <= 3000);
  assert.ok(context.omittedTaskCount > 0);
  assert.ok(!JSON.stringify(context).includes("Unrecognisable"));
  assert.match(context.goal, /exam preparation/);
});

test("COST-001/INV-002 personal AI makes one request and only contributes advisory text", async () => {
  let calls = 0;
  const result = await generateStudyPlan(data, personal, { now, env: {}, fetch: async (url, options) => {
    calls += 1;
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(options.redirect, "manual");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.Authorization, "Bearer synthetic-test-key");
    assert.ok(!String(options.body).includes(personal.apiKey));
    assert.equal(JSON.parse(options.body).max_completion_tokens, 2000);
    return providerResponse();
  } });
  const rules = await generateStudyPlan(data, { mode: "rules" }, { now, env: {} });
  assert.deepEqual(result.plan, rules.plan);
  assert.equal(calls, 1);
  assert.equal(result.source, "personal-ai");
  assert.equal(result.aiStatus, "success");
  assert.ok(!JSON.stringify(result).includes(personal.apiKey));
});

test("QA-001 personal AI errors never spend shared-provider quota or expose provider text", async () => {
  let calls = 0;
  const result = await generateStudyPlan(data, personal, { now, env: { SCHOOL_AI_API_KEY: "synthetic-shared-key", SCHOOL_AI_BASE_URL: "https://llm.cs.cityu.edu.hk/v1", SCHOOL_AI_MODEL: "shared" }, fetch: async () => {
    calls += 1; return new Response("synthetic-provider-secret-error", { status: 401 });
  } });
  assert.equal(calls, 1); assert.equal(result.source, "rule-engine"); assert.equal(result.aiStatus, "unavailable");
  assert.ok(result.plan.length > 0);
  assert.ok(!JSON.stringify(result).includes("synthetic-provider-secret-error"));
});

test("SEC-002/COST-001 personal AI redirects never forward a key, expose bodies or spend shared quota", async () => {
  const rule = await generateStudyPlan(data, { mode: "rules" }, { now });
  for (const status of [301, 302, 303, 307, 308]) {
    const requests = [];
    const result = await generateStudyPlan(data, personal, { now, env: { SCHOOL_AI_API_KEY: "synthetic-shared-key", SCHOOL_AI_BASE_URL: "https://llm.cs.cityu.edu.hk/v1", SCHOOL_AI_MODEL: "shared" }, fetch: async (url, options) => {
      requests.push({ url: String(url), authorization: options.headers.Authorization });
      assert.equal(options.redirect, "manual");
      return new Response("synthetic-private-redirect-body", { status, headers: { Location: "https://redirect.example.test/collect" } });
    } });
    assert.deepEqual(requests, [{ url: "https://api.openai.com/v1/chat/completions", authorization: "Bearer synthetic-test-key" }]);
    assert.equal(result.source, "rule-engine");
    assert.equal(result.aiStatus, "unavailable");
    assert.deepEqual(result.plan, rule.plan);
    for (const value of ["synthetic-private-redirect-body", "redirect.example.test", personal.apiKey, "synthetic-shared-key"]) assert.ok(!JSON.stringify(result).includes(value));
  }
});

test("INV-002 fabricated schedule fields and truncated responses fall back unchanged", async () => {
  const rule = await generateStudyPlan(data, { mode: "rules" }, { now });
  for (const value of [{ ...goodAdvice, plan: [{ title: "Invented task" }] }, {}, { ...goodAdvice, suggestions: ["one"] }]) {
    const result = await generateStudyPlan(data, personal, { now, fetch: async () => providerResponse(JSON.stringify(value)) });
    assert.equal(result.aiStatus, "invalid-response"); assert.deepEqual(result.plan, rule.plan);
  }
  const truncated = await generateStudyPlan(data, personal, { now, fetch: async () => Response.json({ choices: [{ finish_reason: "length", message: { content: JSON.stringify(goodAdvice) } }] }) });
  assert.equal(truncated.aiStatus, "invalid-response");
});

test("COST-001 disabled, missing-key and empty-work modes make no AI requests", async () => {
  const fetch = async () => { throw new Error("must not call"); };
  const disabled = await generateStudyPlan(data, { mode: "rules" }, { now, fetch });
  assert.equal(disabled.aiStatus, "disabled");
  const missing = await generateStudyPlan(data, { ...personal, apiKey: "" }, { now, fetch });
  assert.equal(missing.aiStatus, "unconfigured");
  const empty = await generateStudyPlan({ ...data, assignments: [] }, personal, { now, fetch });
  assert.equal(empty.aiStatus, "no-tasks");
});

test("SEC-001 outgoing destinations reject credentials, private hosts, ports, paths and redirects", () => {
  assert.equal(assertCanvasBaseUrl("https://canvas.cityu.edu.hk/"), "https://canvas.cityu.edu.hk");
  assert.equal(assertAiBaseUrl("openai", "https://api.openai.com/v1/"), "https://api.openai.com/v1");
  for (const url of ["http://canvas.cityu.edu.hk", "https://canvas.cityu.edu.hk.evil.test", "https://localhost", "https://127.0.0.1", "https://canvas.cityu.edu.hk:8443", "https://user:pass@canvas.cityu.edu.hk", "https://canvas.cityu.edu.hk/api/v1"]) assert.throws(() => assertCanvasBaseUrl(url));
  assert.throws(() => assertAiBaseUrl("openai", "https://api.deepseek.com"));
  assert.throws(() => validateCredential("bad\nheader"));
  assert.throws(() => assertSameOrigin(new Request("https://study.example/api/plan", { headers: { Origin: "https://evil.test" } })));
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://study.example/api/plan", { headers: { Origin: "https://study.example" } })));
});

test("SEC-001 bounded JSON rejects malformed and oversized bodies without reflecting body", async () => {
  await assert.rejects(readBoundedJson(new Request("https://study.example", { method: "POST", body: "not-json" })), /Invalid JSON/);
  await assert.rejects(readBoundedJson(new Request("https://study.example", { method: "POST", body: '"' + "x".repeat(1000) + '"' }), 100), /too large/);
});

test("FR-006 Canvas mapping uses real deadlines and submission status, skips undated tasks", () => {
  const result = normaliseCanvasSnapshot({ courses: [{ id: 11, course_code: "CS5351", name: "Course" }], assignments: [
    { id: 12, course_id: 11, name: "Essay", due_at: "2026-11-18T12:00:00Z", submission: { workflow_state: "submitted" } },
    { id: 13, course_id: 11, name: "No deadline", due_at: null },
  ] });
  assert.equal(result.courses[0].id, "canvas-course-11");
  assert.equal(result.assignments[0].id, "canvas-assignment-11-12");
  assert.equal(result.assignments[0].status, "done");
  assert.equal(result.assignments[0].estimatedHours, 2);
  assert.equal(result.assignments.length, 1); assert.ok(result.warnings.length > 0);
  assert.throws(() => normaliseCanvasSnapshot({ courses: [], assignments: [{ id: 1, course_id: 999, name: "Unknown course", due_at: "2026-11-20T00:00:00Z" }] }));
  assert.throws(() => normaliseCanvasSnapshot({ courses: [{ id: 11, name: "Course" }], assignments: [{ id: 1, course_id: 11, name: "Invalid date", due_at: "2026-02-30T12:00:00Z" }] }));
});

test("FR-006/SEC-001 live Canvas adapter authenticates only GET requests and paginates safely", async () => {
  const urls = [];
  const result = await syncCanvas({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-canvas-key", action: "sync" }, { fetch: async (url, options) => {
    urls.push(String(url)); assert.equal(options.method, "GET"); assert.equal(options.redirect, "manual");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers["User-Agent"], "StudyPilot/0.2");
    assert.equal(options.headers.Authorization, "Bearer synthetic-canvas-key");
    if (String(url).endsWith("/users/self")) return Response.json({ id: 123, name: "Synthetic Student" });
    if (String(url).includes("/assignments")) return Response.json([{ id: 12, course_id: 11, name: "Essay", due_at: "2026-11-18T12:00:00Z" }]);
    if (String(url).includes("page=2")) return Response.json([]);
    return Response.json([{ id: 11, name: "Course", course_code: "CS5351" }], { headers: { Link: '<https://canvas.cityu.edu.hk/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100&page=2>; rel="next"' } });
  } });
  assert.equal(urls.length, 4); assert.equal(result.assignments.length, 1);
  assert.equal(result.profile.displayName, "Synthetic Student");
  assert.match(result.profile.workspaceId, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(result).includes("synthetic-canvas-key"));
});

test("SEC-002 Canvas redirects never forward a token, expose provider bodies or return partial data", async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const requests = [];
    await assert.rejects(syncCanvas({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-canvas-key", action: "sync" }, { fetch: async (url, options) => {
      requests.push({ url: String(url), authorization: options.headers.Authorization });
      assert.equal(options.redirect, "manual");
      return new Response("synthetic-private-redirect-body", { status, headers: { Location: "https://redirect.example.test/collect" } });
    } }), error => {
      assert.equal(error.code, "unavailable");
      for (const value of ["synthetic-private-redirect-body", "redirect.example.test", "synthetic-canvas-key"]) assert.ok(!error.message.includes(value));
      return true;
    });
    assert.deepEqual(requests, [{ url: "https://canvas.cityu.edu.hk/api/v1/users/self", authorization: "Bearer synthetic-canvas-key" }]);
  }
});

test("SEC-001 Canvas pagination never sends a token to a second origin or arbitrary endpoint", async () => {
  for (const next of ["https://evil.test/api/v1/courses", "https://canvas.cityu.edu.hk/api/v1/users/999", "https://canvas.cityu.edu.hk/api/v1/courses?access_token=leak"]) {
    let calls = 0;
    await assert.rejects(syncCanvas({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-canvas-key", action: "sync" }, { fetch: async (url) => {
      calls += 1;
      if (String(url).endsWith("/users/self")) return Response.json({ id: 123, name: "Student" });
      return Response.json([], { headers: { Link: `<${next}>; rel="next"` } });
    } }));
    assert.equal(calls, 2);
  }
  assert.equal(isPersonalTokenTestingEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isPersonalTokenTestingEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isPersonalTokenTestingEnabled({ NODE_ENV: "production", CANVAS_PERSONAL_TOKEN_TESTING: "true" }), true);
});

test("SEC-001 personal credentials remain isolated across concurrent users", async () => {
  const seen = [];
  const [a, b] = await Promise.all(["synthetic-key-alice", "synthetic-key-bob"].map((key) => generateStudyPlan(data, { ...personal, apiKey: key }, { now, env: {}, fetch: async (_url, options) => {
    seen.push(options.headers.Authorization);
    return providerResponse();
  } })));
  assert.deepEqual(seen.sort(), ["Bearer synthetic-key-alice", "Bearer synthetic-key-bob"]);
  assert.equal(a.aiStatus, "success"); assert.equal(b.aiStatus, "success");
  assert.ok(!JSON.stringify([a, b]).includes("synthetic-key-"));
});

test("SEC-001/INV-002 leaked credentials and fictional task references in AI output are rejected", async () => {
  for (const summary of ["Your key is synthetic-test-key", "Focus on Task 999 first."]) {
    const result = await generateStudyPlan(data, personal, { now, fetch: async () => providerResponse(JSON.stringify({ ...goodAdvice, summary })) });
    assert.equal(result.aiStatus, "invalid-response");
    assert.ok(!JSON.stringify(result).includes(summary));
  }
  const result = await generateStudyPlan(data, personal, { now, fetch: async () => { throw new DOMException("Synthetic timeout", "TimeoutError"); } });
  assert.equal(result.aiStatus, "timeout");
});

test("SEC-001 Canvas authentication failures and repeated pages fail without partial data", async () => {
  await assert.rejects(syncCanvas({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-token", action: "sync" }, { fetch: async () => new Response("PRIVATE PROVIDER DETAIL", { status: 401 }) }), (error) => error.code === "unauthorised" && !error.message.includes("PRIVATE"));
  let calls = 0;
  await assert.rejects(syncCanvas({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-token", action: "sync" }, { fetch: async (url) => {
    calls += 1;
    if (String(url).endsWith("/users/self")) return Response.json({ id: 123 });
    return Response.json([], { headers: { Link: `<${url}>; rel="next"` } });
  } }), (error) => error.code === "limit");
  assert.equal(calls, 2);
});
