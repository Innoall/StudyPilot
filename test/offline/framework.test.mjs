import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// A clean portable clone must work independently of this checkout's ignored
// managed-runtime selection. The path deliberately contains spaces.
const fixture = mkdtempSync(join(tmpdir(), "studypilot portable start "));
mkdirSync(join(fixture, "scripts"));
for (const file of ["run-framework.mjs", "execution-profile.mjs"]) copyFileSync(fileURLToPath(new URL(`../../scripts/${file}`, import.meta.url)), join(fixture, "scripts", file));
symlinkSync(fileURLToPath(new URL("../../node_modules", import.meta.url)), join(fixture, "node_modules"), process.platform === "win32" ? "junction" : "dir");
after(() => rmSync(fixture, { recursive: true, force: true }));
const launcher = join(fixture, "scripts", "run-framework.mjs");
const cwd = tmpdir();

test("QA-001 portable production start forwards to the installed server CLI", () => {
  const result = spawnSync(process.execPath, [launcher, "start", "--help"], { cwd, encoding: "utf8", timeout: 15_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /vinext start - Start production server/);
  assert.match(result.stdout, /--port/);
});

test("QA-001 production start rejects an invalid port before opening a server", () => {
  const result = spawnSync(process.execPath, [launcher, "start", "--port", "not-a-port"], { cwd, encoding: "utf8", timeout: 15_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expects an integer/);
});
