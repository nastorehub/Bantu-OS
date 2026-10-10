#!/usr/bin/env bash
# One-shot developer bootstrap for Herald OS (macOS and Linux). Safe to re-run after every pull.
#   1. Fetch the pinned upstream snapshot (types for the gateway wire).
#   2. Install Node workspaces.
#   3. Link the system-bridge plugin into the user's NasTech plugins directory.
#   4. Find the NasTech runtime, migrate pre-rename settings, enable the plugin and its toolset.
#   5. Report voice support.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NASTECH_HOME="${NASTECH_HOME:-$HOME/.nastech}"
HERALD_OS_NASTECH_ROOT="${HERALD_OS_NASTECH_ROOT:-${NASTECH_OS_NASTECH_ROOT:-}}"
OS="$(uname -s)"
export PATH="$HOME/.local/bin:$PATH"

# macOS: the /usr/bin shims refuse to run until the Xcode license is accepted; the CommandLineTools
# binaries behind them work. Prefer them so `npm install` (node-gyp) and git keep working.
if [[ "$OS" == "Darwin" && -d /Library/Developer/CommandLineTools/usr/bin ]]; then
  export PATH="/Library/Developer/CommandLineTools/usr/bin:$PATH"
  export SDKROOT="${SDKROOT:-/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk}"
fi

echo "==> Syncing upstream snapshot"
bash "$ROOT/scripts/sync-upstream.sh"

echo "==> Installing Node workspaces"
(cd "$ROOT" && npm install)

# Electron fetches its binary on first use rather than at install; do it once here.
echo "==> Fetching the Electron binary"
(cd "$ROOT/apps/desktop" && node -e "require('electron')") || echo "    WARNING: could not download Electron; npm run dev will try again"

# npm strips the executable bit from node-pty's prebuilt spawn-helper; the app also repairs this at
# runtime, but fixing it here keeps packaged builds working. (Linux has no prebuilds; see
# linux/dev/build.sh, which compiles node-pty.)
helper="$ROOT/node_modules/node-pty/prebuilds/$(node -p 'process.platform + "-" + process.arch')/spawn-helper"
[[ -f "$helper" ]] && chmod 755 "$helper"

echo "==> Linking herald-os-bridge plugin into $NASTECH_HOME/plugins"
mkdir -p "$NASTECH_HOME/plugins"
# The pre-rename link points at a folder that no longer exists; remove it only when it is ours.
legacy="$NASTECH_HOME/plugins/nastech-os-bridge"
if [[ -L "$legacy" && "$(readlink "$legacy")" == "$ROOT/plugins/"* ]]; then
  rm -f "$legacy"
  echo "    removed the pre-rename nastech-os-bridge link"
fi
link="$NASTECH_HOME/plugins/herald-os-bridge"
if [[ -L "$link" || -e "$link" ]]; then
  rm -rf "$link"
fi
ln -s "$ROOT/plugins/herald-os-bridge" "$link"

echo "==> Verifying NasTech runtime"
NASTECH_CMD=()
NASTECH_PY=""
# A checkout in either layout, as the shell looks (apps/desktop/electron/backend/resolve.ts): the
# launcher today's installers publish, or the venv earlier ones made.
checkout_runtime() {
  if [[ -x "$1/.nastech/bin/nastech" ]]; then
    NASTECH_CMD=("$1/.nastech/bin/nastech")
  elif [[ -x "$1/venv/bin/python" ]]; then
    NASTECH_PY="$1/venv/bin/python"
  else
    return 1
  fi
}
if [[ -n "$HERALD_OS_NASTECH_ROOT" ]] && checkout_runtime "$HERALD_OS_NASTECH_ROOT"; then
  echo "    HERALD_OS_NASTECH_ROOT=$HERALD_OS_NASTECH_ROOT"
elif checkout_runtime "$NASTECH_HOME/nastech-agent"; then
  echo "    managed install: $NASTECH_HOME/nastech-agent"
elif command -v nastech >/dev/null 2>&1; then
  echo "    nastech on PATH: $(command -v nastech)"
  NASTECH_CMD=(nastech)
  # A pip/uv install's entry point names its interpreter on the first line.
  shebang="$(head -1 "$(command -v nastech)" 2>/dev/null | sed -n 's/^#!\(.*python[0-9.]*\)$/\1/p')"
  [[ -n "$shebang" && -x "$shebang" ]] && NASTECH_PY="$shebang"
else
  echo "    WARNING: no NasTech runtime found. Install it, then re-run this script:" >&2
  echo "      curl -fsSL https://raw.githubusercontent.com/nastechresearch/nastech-agent/main/scripts/install.sh | bash" >&2
fi
[[ -n "$NASTECH_PY" && ${#NASTECH_CMD[@]} -eq 0 ]] && NASTECH_CMD=("$NASTECH_PY" -m nastech_cli.main)
runtime_root="${HERALD_OS_NASTECH_ROOT:-$NASTECH_HOME/nastech-agent}"

# From the runtime checkout, like the `nastech` entry point: an editable install does not map
# top-level modules added after it was created.
nastech_run() {
  (cd "$runtime_root" 2>/dev/null || true; NO_COLOR=1 "${NASTECH_CMD[@]}" "$@" </dev/null)
}

# One nastech command and what it changes; a failure stops the bootstrap with NasTech's output.
# `nastech tools enable` reports an unknown toolset as a ✗ line and still exits 0.
nastech_step() {
  local change="$1" output status=0
  shift
  echo "    nastech $*: $change"
  output="$(nastech_run "$@" 2>&1)" || status=$?
  if [[ $status -ne 0 ]] || grep -q '^[[:space:]]*✗' <<<"$output"; then
    echo "bootstrap: \`nastech $*\` failed (exit $status):" >&2
    echo "$output" >&2
    echo "Fix it and run npm run bootstrap again; docs/SYSTEM-BRIDGE.md says how to take back what was already changed." >&2
    exit 1
  fi
}

if [[ ${#NASTECH_CMD[@]} -gt 0 ]]; then
  if [[ -n "$NASTECH_PY" ]]; then
    echo "==> Migrating settings from the pre-rename NasTech OS"
    NASTECH_HOME="$NASTECH_HOME" PYTHONPATH="$runtime_root${PYTHONPATH:+:$PYTHONPATH}" "$NASTECH_PY" "$ROOT/scripts/migrate-nastech-config.py" || true
  fi

  echo "==> Enabling the system bridge plugin and its toolset"
  # User plugins are opt-in (plugins.enabled) and a saved platform toolset list is authoritative, so
  # both must be recorded. The override prompt is answered "no" (stdin closed): the bridge never
  # replaces built-in tools.
  nastech_step "adds it to plugins.enabled in $NASTECH_HOME/config.yaml" plugins enable herald-os-bridge
  nastech_step "saves platform_toolsets.cli with herald_os in it (the tools run only in Herald OS sessions)" tools enable herald_os
  # Upstream defers plugin tools behind its tool-search bridge; with the system tools hidden the
  # agent falls back to shell commands. Keep them direct (Settings -> NasTech & agents -> Tool search
  # turns it back on), writing down the value it had the first time so it can be put back.
  if ! before="$(nastech_run config get tools.tool_search.enabled 2>/dev/null)"; then
    echo "bootstrap: \`nastech config get tools.tool_search.enabled\` failed" >&2
    exit 1
  fi
  before="$(tail -n 1 <<<"$before" | tr -d '[:space:]')"
  record="$NASTECH_HOME/herald-os/tool-search-before"
  if [[ "$before" == "off" ]]; then
    echo "    tools.tool_search.enabled is off already"
  else
    if [[ ! -f "$record" ]]; then
      mkdir -p "$(dirname "$record")"
      echo "$before" >"$record"
    fi
    nastech_step "turns Tool Search off for every NasTech session (it was $before; saved in $record)" config set tools.tool_search.enabled off
  fi

  echo "==> Checking voice support (docs/VOICE.md)"
  # The Live engine and the spoken-reply turn note need the voice-live routes (NasTech 0.21.3 and
  # later). Git installs report version 0.0.0, so look for the module rather than the version.
  if [[ -f "$runtime_root/tools/voice_live.py" ]]; then
    echo "    voice-live routes: available"
  elif [[ -d "$runtime_root" ]]; then
    echo "    WARNING: this NasTech has no voice-live routes; run 'nastech update' for the Live voice engine." >&2
  fi
  if [[ -n "$NASTECH_PY" ]]; then
    "$NASTECH_PY" - <<'PY' || true
import importlib
for name, purpose in (("openwakeword", "wake word"), ("faster_whisper", "local STT"), ("edge_tts", "free TTS")):
    try:
        importlib.import_module(name)
        print(f"    {name}: ok ({purpose})")
    except Exception:
        print(f"    {name}: missing ({purpose}); install with: pip install 'nastech-agent[voice]' inside the NasTech venv")
PY
  else
    # Today's layout keeps its Python dependencies out of the checkout, so its modules are not looked at here.
    echo "    voice extras: nastech pm install --extra voice --extra edge-tts --extra wake-openwakeword adds them (local STT, free TTS, wake word)"
  fi
fi

echo "==> Done. Start Herald OS with: npm run dev"
