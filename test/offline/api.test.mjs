import test from "node:test";
import assert from "node:assert/strict";
import { POST as planPost } from "../../src/app/api/plan/route.ts";
import { POST as canvasPost, GET as canvasGet } from "../../src/app/api/canvas/route.ts";

const data = { courses: [], assignments: [], availability: [], weeklyGoal: "" };
const request = (body, headers = {}) => new Request("https://study.example/api/plan", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://study.example", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("FR-005 API returns a valid private deterministic response without any AI configuration", async () => {
  const response = await planPost(request({ ...data, ai: { mode: "rules" } }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  const result = await response.json();
  assert.equal(result.source, "rule-engine"); assert.equal(result.aiStatus, "no-tasks");
  assert.equal(result.timeZone, "Asia/Hong_Kong"); assert.deepEqual(result.plan, []);
});

test("FR-005/SEC-001 malformed JSON, invalid records and cross-origin calls return safe errors", async () => {
  for (const body of ["{bad-json", null, [], { ...data, assignments: [{}] }, { ...data, ai: { mode: "unknown" } }]) {
    const response = await planPost(request(body));
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.ok(!JSON.stringify(result).includes("{bad-json"));
  }
  assert.equal((await planPost(request(data, { Origin: "https://evil.example" }))).status, 400);
});

test("SEC-001 API rejects oversized input and never echoes submitted keys", async () => {
  const response = await planPost(request({ ...data, weeklyGoal: "x".repeat(300_000), apiKey: "synthetic-do-not-echo" }));
  assert.equal(response.status, 413);
  assert.ok(!(await response.text()).includes("synthetic-do-not-echo"));
});

test("FR-006 Canvas token testing is disabled by default in production", async () => {
  const previousMode = process.env.NODE_ENV; const previousFlag = process.env.CANVAS_PERSONAL_TOKEN_TESTING;
  try {
    process.env.NODE_ENV = "production"; delete process.env.CANVAS_PERSONAL_TOKEN_TESTING;
    const config = await (await canvasGet()).json();
    assert.equal(config.tokenTestingEnabled, false);
    const response = await canvasPost(request({ baseUrl: "https://canvas.cityu.edu.hk", accessToken: "synthetic-do-not-echo", action: "sync" }));
    assert.equal(response.status, 503); assert.ok(!(await response.text()).includes("synthetic-do-not-echo"));
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.CANVAS_PERSONAL_TOKEN_TESTING; else process.env.CANVAS_PERSONAL_TOKEN_TESTING = previousFlag;
  }
});

test("SEC-001 Canvas connection rejects arbitrary targets before any network request", async () => {
  const previousMode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    const response = await canvasPost(request({ baseUrl: "https://127.0.0.1", accessToken: "synthetic-do-not-echo", action: "sync" }));
    assert.equal(response.status, 400); assert.ok(!(await response.text()).includes("synthetic-do-not-echo"));
  } finally { if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode; }
});
