#!/usr/bin/env bash
# Migration: the session starts niri with Bantu's own ~/.config/niri/bantu-os.kdl instead of
# ~/.config/niri/config.kdl, which is the person's. Renders the new file, then turns Bantu's old copy
# of config.kdl (recognised by its first line) into an include of it: a niri still running with the
# old path reloads into the same config, and `niri validate -c ~/.config/niri/config.kdl` still
# checks Bantu's. A config.kdl of the person's own is left alone. Safe to re-run.
set -euo pipefail

HEADER="// Bantu OS: niri compositor configuration."
NIRI="$HOME/.config/niri"

command -v bantu-os >/dev/null || exit 0
bantu-os keymap apply
[[ -f "$NIRI/bantu-os.kdl" ]] || { echo "    bantu-os keymap apply wrote no $NIRI/bantu-os.kdl" >&2; exit 1; }

if [[ -f "$NIRI/config.kdl" && "$(head -n 1 "$NIRI/config.kdl")" == "$HEADER" ]] && ! grep -qx 'include "bantu-os.kdl"' "$NIRI/config.kdl"; then
  {
    echo "$HEADER"
    echo "// Bantu OS no longer writes this file: its session starts niri with bantu-os.kdl. This"
    echo "// include keeps older sessions and niri validate working; replace it with a config of your own"
    echo "// whenever you like."
    echo 'include "bantu-os.kdl"'
  } >"$NIRI/config.kdl.new"
  mv "$NIRI/config.kdl.new" "$NIRI/config.kdl"
  echo "    ~/.config/niri/config.kdl now includes bantu-os.kdl"
fi
exit 0
