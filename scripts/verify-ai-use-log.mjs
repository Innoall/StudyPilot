import { execFileSync } from "node:child_process";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const [base, head = "HEAD"] = process.argv.slice(2);
if (!base || !/^[a-f0-9]{40}$/.test(base) || !(head === "HEAD" || /^[a-f0-9]{40}$/.test(head))) throw new Error("Supply trusted base and head commit identifiers");
const changed = git("diff", "--name-only", `${base}...${head}`).split("\n");
const affectsEngineering = changed.some((path) => /^(?:src\/|app\/|lib\/|components\/|hooks\/|prompts\/|scripts\/|test\/|\.github\/|package(?:-lock)?\.json$)/.test(path));
if (affectsEngineering && !changed.includes("docs/ai-use-log.yaml")) throw new Error("Code, tests, prompts, scripts or CI changed without docs/ai-use-log.yaml");
if (affectsEngineering && !git("diff", base, head, "--", "docs/ai-use-log.yaml").split("\n").some((line) => line.startsWith("+") && !line.startsWith("+++ no") && /purpose:|human_gates:|status:|outputs:/.test(line))) throw new Error("AI-use log must include a substantive update");
console.log("AI-use log gate passed.");
