import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

const viteConfig = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
const compatibilityDate = viteConfig.match(/compatibility_date:\s*"([\d-]+)"/)?.[1];
const compatibilityFlags = JSON.parse(viteConfig.match(/compatibility_flags:\s*(\[[^\]]*\])/)?.[1] || "null");
assert.ok(compatibilityDate, "Pin the actual local Worker compatibility date in vite.config.ts.");
assert.ok(Array.isArray(compatibilityFlags), "Use the actual local Worker compatibility flags.");
const now = Date.parse("2026-11-16T08:00:00+08:00");
const data = {
  courses: [{ id: "fixture-course", code: "TEST101", name: "Synthetic course", color: "#3d5af1" }],
  assignments: [{ id: "fixture-task", courseId: "fixture-course", title: "Synthetic assignment", dueAt: "2026-11-18T23:59:00+08:00", estimatedHours: 2, priority: "high", status: "todo" }],
  availability: [{ day: 1, start: "19:00", end: "22:00" }], weeklyGoal: "Review before exams",
};
const advice = { summary: "Review Task 1 before its deadline.", suggestions: ["Review concepts.", "Check progress.", "Take breaks."] };
const bundled = await build({
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
  stdin: {
    resolveDir: fileURLToPath(new URL("../../", import.meta.url)),
    contents: `
      import { syncCanvas } from "./src/lib/canvas.ts";
      import { generateStudyPlan } from "./src/lib/ai.ts";
      const data = ${JSON.stringify(data)};
      export default {
        async fetch(request) {
          if (new URL(request.url).pathname === "/canvas") {
            try {
              return Response.json(await syncCanvas({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-runtime-canvas-key", action: "sync" }, { env: {} }));
            } catch (error) {
              return Response.json({ code: error.code, message: error.message }, { status: 502 });
            }
          }
          const options = { now: ${now}, env: { SCHOOL_AI_API_KEY: "synthetic-runtime-shared-key", SCHOOL_AI_BASE_URL: "https://llm.cs.cityu.edu.hk/v1", SCHOOL_AI_MODEL: "shared" } };
          const config = new URL(request.url).pathname === "/rules" ? { mode: "rules" } : { mode: "personal", provider: "openai", model: "synthetic-model", apiKey: "synthetic-runtime-ai-key" };
          return Response.json(await generateStudyPlan(data, config, options));
        }
      };
    `,
  },
});

function runtime(context, outboundService) {
  const worker = new Miniflare({
    modules: true,
    compatibilityDate,
    compatibilityFlags,
    script: bundled.outputFiles[0].text,
    outboundService,
  });
  context.after(() => worker.dispose());
  return worker;
}

test("FR-006/SEC-002 actual Canvas adapter maps synthetic facts through workerd fetch", async context => {
  const requests = [];
  const worker = runtime(context, request => {
    requests.push(request.url);
    assert.equal(request.method, "GET");
    assert.equal(request.headers.get("authorization"), "Bearer synthetic-runtime-canvas-key");
    assert.equal(request.headers.get("user-agent"), "StudyPilot/0.2");
    assert.equal(new URL(request.url).origin, "https://canvas.cityu.edu.hk");
    if (new URL(request.url).pathname === "/api/v1/users/self") return Response.json({ id: 123, name: "Synthetic Student" });
    if (new URL(request.url).pathname === "/api/v1/courses") return Response.json([{ id: 11, course_code: "TEST101", name: "Synthetic course" }]);
    assert.equal(new URL(request.url).pathname, "/api/v1/courses/11/assignments");
    return Response.json([{ id: 12, course_id: 11, name: "Synthetic essay", due_at: "2026-11-18T12:00:00Z", submission: { workflow_state: "submitted" } }]);
  });
  const response = await worker.dispatchFetch("http://localhost/canvas");
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(requests.length, 3);
  assert.equal(result.profile.displayName, "Synthetic Student");
  assert.match(result.profile.workspaceId, /^[a-f0-9]{64}$/);
  assert.equal(result.courses[0].id, "canvas-course-11");
  assert.equal(result.assignments[0].id, "canvas-assignment-11-12");
  assert.equal(result.assignments[0].dueAt, "2026-11-18T12:00:00.000Z");
  assert.equal(result.assignments[0].status, "done");
  assert.ok(!JSON.stringify(result).includes("synthetic-runtime-canvas-key"));
});

test("FR-005/INV-002 actual personal AI adapter works in workerd and preserves the rule schedule", async context => {
  const requests = [];
  const worker = runtime(context, async request => {
    requests.push(request.url);
    assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("authorization"), "Bearer synthetic-runtime-ai-key");
    const body = await request.text();
    assert.ok(!body.includes("synthetic-runtime-ai-key"));
    assert.ok(!body.includes("Synthetic assignment"));
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(advice) } }] });
  });
  const result = await (await worker.dispatchFetch("http://localhost/ai")).json();
  const rules = await (await worker.dispatchFetch("http://localhost/rules")).json();
  assert.equal(requests.length, 1);
  assert.equal(result.aiStatus, "success");
  assert.equal(result.source, "personal-ai");
  assert.equal(result.summary, advice.summary);
  assert.deepEqual(result.plan, rules.plan);
  assert.ok(result.plan.length > 0);
  assert.ok(!JSON.stringify(result).includes("synthetic-runtime-"));
});

test("FR-009/SEC-001 workerd Canvas authentication failure remains distinct from unreachable service", async context => {
  let calls = 0;
  const worker = runtime(context, () => {
    calls += 1;
    return new Response("synthetic-private-authentication-body", { status: 401 });
  });
  const response = await worker.dispatchFetch("http://localhost/canvas");
  const result = await response.json();
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
  assert.equal(result.code, "unauthorised");
  assert.ok(!JSON.stringify(result).includes("synthetic-private-authentication-body"));
});

test("SEC-002 actual Canvas workerd fetch never follows any standard redirect or exposes its body", async context => {
  let status = 301;
  const requests = [];
  const worker = runtime(context, request => {
    requests.push(request.url);
    return new Response("synthetic-private-redirect-body", { status, headers: { Location: "https://redirect.example.test/collect" } });
  });
  for (status of [301, 302, 303, 307, 308]) {
    requests.length = 0;
    const response = await worker.dispatchFetch("http://localhost/canvas");
    const result = await response.json();
    assert.equal(response.status, 502);
    assert.equal(result.code, "unavailable");
    assert.deepEqual(requests, ["https://canvas.cityu.edu.hk/api/v1/users/self"]);
    for (const value of ["synthetic-private-redirect-body", "redirect.example.test", "synthetic-runtime-canvas-key"]) assert.ok(!JSON.stringify(result).includes(value));
  }
});

test("SEC-002/COST-001 actual AI workerd fetch rejects redirects without shared quota or changed schedule", async context => {
  let status = 301;
  const requests = [];
  const worker = runtime(context, request => {
    requests.push({ url: request.url, authorization: request.headers.get("authorization") });
    return new Response("synthetic-private-redirect-body", { status, headers: { Location: "https://redirect.example.test/collect" } });
  });
  const rules = await (await worker.dispatchFetch("http://localhost/rules")).json();
  for (status of [301, 302, 303, 307, 308]) {
    requests.length = 0;
    const result = await (await worker.dispatchFetch("http://localhost/ai")).json();
    assert.deepEqual(requests, [{ url: "https://api.openai.com/v1/chat/completions", authorization: "Bearer synthetic-runtime-ai-key" }]);
    assert.equal(result.aiStatus, "unavailable");
    assert.equal(result.source, "rule-engine");
    assert.deepEqual(result.plan, rules.plan);
    for (const value of ["synthetic-private-redirect-body", "redirect.example.test", "synthetic-runtime-ai-key", "synthetic-runtime-shared-key"]) assert.ok(!JSON.stringify(result).includes(value));
  }
});
