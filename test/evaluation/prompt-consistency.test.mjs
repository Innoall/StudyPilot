import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AI_SYSTEM_PROMPT, AI_PROMPT_VERSION } from "../../src/lib/ai.ts";
test("GOV-001 versioned runtime prompt and declared byte budget match the active adviser", async () => {
  const prompt = JSON.parse(await readFile(new URL("../../prompts/prompt_v1.1.yaml", import.meta.url), "utf8"));
  assert.equal(prompt.version, AI_PROMPT_VERSION);
  assert.equal(prompt.system, AI_SYSTEM_PROMPT);
  assert.ok(prompt.context_budget_bytes <= 3000);
  assert.ok(!prompt.input_allowlist.includes("api_key"));
});
