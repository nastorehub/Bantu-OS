#!/usr/bin/env bash
# Run the bantu-os-bridge plugin tests and the Linux CLI tests.
# Prefers the NasTech runtime's venv when it has pytest (same interpreter the gateway loads the plugin
# with); otherwise runs in an ephemeral uv environment so the user's NasTech venv is never modified.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NASTECH_HOME="${NASTECH_HOME:-$HOME/.nastech}"
PY="${BANTU_OS_PYTHON:-$NASTECH_HOME/nastech-agent/venv/bin/python}"

cd "$ROOT/plugins/bantu-os-bridge/tests"
# The CLI tests sit outside the plugin, so with no arguments both folders run; arguments (a file,
# -k) pick tests as before.
SUITES=(. "$ROOT/linux/tests")
[[ $# -eq 0 ]] || SUITES=()

if [[ -x "$PY" ]] && "$PY" -c "import pytest" >/dev/null 2>&1; then
  exec "$PY" -m pytest -q ${SUITES[@]+"${SUITES[@]}"} "$@"
fi

if command -v uv >/dev/null 2>&1; then
  exec uv run --no-project --python 3.11 --with pytest --with pyyaml python -m pytest -q ${SUITES[@]+"${SUITES[@]}"} "$@"
fi

echo "test-bridge: need either pytest in $PY or uv on PATH" >&2
exit 1
