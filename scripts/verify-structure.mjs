import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// GOV-001, SEC-001 and INV-002: structural fitness checks, complemented by runtime tests.
const issues = [];
async function filesIn(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesIn(join(path, entry.name)) : [join(path, entry.name)]));
    return nested.flat();
  } catch (error) { if (error.code === "ENOENT") return []; throw error; }
}
for (const path of (await Promise.all([filesIn("src/app"), filesIn("src/lib")])).flat().filter((path) => /\.(ts|tsx)$/.test(path))) {
  const source = await readFile(path, "utf8");
  if (/\bNEXT_PUBLIC_[A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD)\b/.test(source)) issues.push(`${path}: public credential environment variable`);
  if (/\bsk-[A-Za-z0-9_-]{24,}\b/.test(source)) issues.push(`${path}: possible hard-coded provider key`);
  if (/(?:localStorage|sessionStorage)\.setItem\([^\n]*(?:apiKey|accessToken|canvasToken|credentials)/i.test(source)) issues.push(`${path}: credential persistence is forbidden`);
  if (/console\.(?:log|error|warn|info)\([^\n]*(?:apiKey|accessToken|authorization|credentials)/i.test(source)) issues.push(`${path}: possible credential logging`);
  if (/"use client"/.test(source) && /process\.env\.(?:SCHOOL_AI|CANVAS|OPENAI)/.test(source)) issues.push(`${path}: server provider config imported into client`);
  if (path === "src/lib/planner.ts" && /\bfetch\(|process\.env|localStorage|(?:from|import)\s*["'](?:node:|next\/|@\/app)/.test(source)) issues.push(`${path}: planner depends on external I/O`);
  if (path.startsWith("src/lib/") && /from\s*["'](?:@\/app|\.\.\/app|@\/components)/.test(source)) issues.push(`${path}: domain depends on UI`);
}
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
for (const section of ["dependencies", "devDependencies"]) {
  if (JSON.stringify(packageJson[section] || {}) !== JSON.stringify(lock.packages?.[""]?.[section] || {})) issues.push(`${section}: package manifest and lockfile root differ`);
  for (const version of Object.values(packageJson[section] || {})) if (/^(?:file:|git:|git\+|https?:|\*|latest)/.test(version)) issues.push(`${section}: dependencies must use reviewed registry versions`);
}
for (const [path, entry] of Object.entries(lock.packages || {})) {
  if (!path || entry.link) continue;
  if (entry.resolved && !entry.resolved.startsWith("https://registry.npmjs.org/")) issues.push(`${path}: unapproved dependency registry`);
  if (entry.resolved && !entry.integrity) issues.push(`${path}: dependency integrity is missing`);
}
for (const path of ["AGENTS.md", "Prompt.md", "docs/code-governance/verification-constraints.md", "docs/architecture/invariants.md", "docs/architecture/permission-model.md"]) {
  if (!(await readFile(path, "utf8")).trim()) issues.push(`${path}: required governance artifact is empty`);
}
if (issues.length) throw new Error(`Structural verification failed:\n${issues.join("\n")}`);
console.log("Structural, credential-pattern, dependency-lock and module-boundary checks passed. Runtime tests remain required.");
