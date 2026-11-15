#!/bin/zsh

set -u

PROJECT_DIR="${0:A:h}"
cd "$PROJECT_DIR" || exit 1

pause_on_error() {
  echo
  echo "StudyPilot could not start. Press Return to close this window."
  read -r
  exit 1
}

open_studypilot() {
  local url="http://localhost:5173/"
  open "$url" >/dev/null 2>&1 || \
    open -a "Google Chrome" "$url" >/dev/null 2>&1 || \
    open -a "Safari" "$url" >/dev/null 2>&1 || \
    echo "Open $url in your browser."
}

node_is_supported() {
  command -v node >/dev/null 2>&1 && node -e '
    const [major, minor] = process.versions.node.split(".").map(Number);
    process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1);
  ' >/dev/null 2>&1
}

if ! node_is_supported; then
  for node_dir in \
    "/opt/homebrew/opt/node@22/bin" \
    "/usr/local/opt/node@22/bin" \
    "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"; do
    if [[ -x "$node_dir/node" ]]; then
      export PATH="$node_dir:$PATH"
      node_is_supported && break
    fi
  done
fi

if ! node_is_supported; then
  CURRENT_NODE="not installed"
  command -v node >/dev/null 2>&1 && CURRENT_NODE="$(node --version)"
  echo "Node.js 22.13 or newer is required. Current version: $CURRENT_NODE"
  echo "Install Node.js from https://nodejs.org/ and run this file again."
  pause_on_error
fi

if curl -fsS http://localhost:5173/ >/dev/null 2>&1; then
  echo "StudyPilot is already running. Opening it now."
  open_studypilot
  exit 0
fi

if [[ -f .vinext/dev/lock.json ]]; then
  LOCK_PID="$(node -e '
    try {
      const lock = JSON.parse(require("node:fs").readFileSync(".vinext/dev/lock.json", "utf8"));
      process.stdout.write(String(lock.pid || ""));
    } catch {}
  ')"
  if [[ -z "$LOCK_PID" ]] || ! kill -0 "$LOCK_PID" >/dev/null 2>&1; then
    echo "Removing a stale development-server lock..."
    rm -f .vinext/dev/lock.json
  fi
fi

if [[ ! -f node_modules/vinext/dist/cli.js ]]; then
  echo "Preparing StudyPilot for the first run..."
  npm ci || pause_on_error
fi

echo "Starting StudyPilot..."
npm run dev > .studypilot-dev.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1' EXIT INT TERM

for attempt in {1..45}; do
  if curl -fsS http://localhost:5173/ >/dev/null 2>&1; then
    echo "StudyPilot is ready at http://localhost:5173/"
    open_studypilot
    wait "$SERVER_PID"
    exit $?
  fi
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo "The server stopped unexpectedly."
    tail -40 .studypilot-dev.log
    pause_on_error
  fi
  sleep 1
done

echo "The server did not become ready in time."
tail -40 .studypilot-dev.log
pause_on_error
