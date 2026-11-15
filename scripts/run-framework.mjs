import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build", "start"].includes(command)) throw new Error("Expected dev, build or start.");
const managedLinux = readExecutionProfile() === "managed-linux";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the owner retains its PID and shutdown signals.
// A portable clone serves vinext's built Node output; the managed Worker build
// keeps its existing Wrangler config, private runtime paths and local state.
let cli;
let cliArgs;
if (managedLinux && command === "start") {
  await import("./sites-env.mjs");
  cli = new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url);
  cliArgs = ["dev", "--config", "dist/server/wrangler.json", "--local", "--persist-to", ".wrangler/state", "--ip", "127.0.0.1", "--inspector-port", "0", ...args];
} else {
  cli = new URL(managedLinux
    ? "../node_modules/vite/bin/vite.js"
    : "../node_modules/vinext/dist/cli.js", import.meta.url);
  cliArgs = [command, ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
}
process.argv = [process.execPath, fileURLToPath(cli), ...cliArgs];
await import(cli.href);
