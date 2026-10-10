#!/usr/bin/env bash
# Migration: NasTech OS became Bantu OS. Runs as the session user (root steps through sudo -n) after
# linux/dev/build.sh has installed the new session files, commands and units. Moves per-user state,
# points greetd and Plymouth at the new names and retires the old files. Safe to re-run.
set -uo pipefail

REPO="${REPO:-$HOME/Bantu-OS}"

move() {
  if [[ -e "$1" && ! -e "$2" ]]; then
    mv "$1" "$2" && echo "    moved $1 -> $2"
  fi
}

# Per-user configuration and state.
move "$HOME/.config/nastech-os" "$HOME/.config/bantu-os"
move "$HOME/.local/state/nastech-os" "$HOME/.local/state/bantu-os"
if [[ -f "$HOME/.config/bantu-os/session.env" ]]; then
  sed -i 's/NASTECH_OS_/BANTU_OS_/g' "$HOME/.config/bantu-os/session.env"
fi
if [[ -f "$HOME/.config/bantu-os/theme" ]]; then
  sed -i 's/^nastech-/bantu-/' "$HOME/.config/bantu-os/theme"
fi
if command -v bantu-os-theme >/dev/null; then
  bantu-os-theme set "$(bantu-os-theme current)" >/dev/null 2>&1 || echo "    WARNING: could not re-apply the theme"
fi

# The pre-rename copy of the repo (linux/dev/push.sh now syncs to ~/Bantu-OS). Synced copies have no
# .git, so a folder with one is somebody's own checkout and stays.
if [[ -d "$HOME/NasTech-OS" && -d "$REPO/apps" && "$HOME/NasTech-OS" != "$REPO" ]]; then
  if [[ -e "$HOME/NasTech-OS/.git" ]]; then
    echo "    left ~/NasTech-OS in place: it is a git checkout of the pre-rename repo"
  else
    rm -rf "$HOME/NasTech-OS" && echo "    removed ~/NasTech-OS"
  fi
fi
# The shell moved from apps/os to apps/desktop; push.sh's --delete keeps the excluded build output.
# In a git checkout, git has already removed the tracked files and what is left may be the user's.
if [[ -d "$REPO/apps/os" && -f "$REPO/apps/desktop/package.json" ]]; then
  if [[ -e "$REPO/.git" ]]; then
    echo "    $REPO/apps/os now holds only untracked files (old build output); delete it to free space"
  else
    rm -rf "$REPO/apps/os" && echo "    removed $REPO/apps/os"
  fi
fi

# User units and developer helpers.
systemctl --user disable --now nastech-os-update-check.timer >/dev/null 2>&1 || true
rm -f "$HOME/.config/systemd/user/nastech-os-update-check.service" "$HOME/.config/systemd/user/nastech-os-update-check.timer"
systemctl --user daemon-reload >/dev/null 2>&1 || true
systemctl --user enable bantu-os-update-check.timer >/dev/null 2>&1 || true
rm -f "$HOME"/.local/bin/nastech-os-{build,sync,restart-shell,shot}

# System files (provision.sh and build.sh install the bantu-os equivalents).
if [[ -f /etc/greetd/config.toml ]] && grep -q 'nastech-os-' /etc/greetd/config.toml; then
  sudo -n sed -i 's/nastech-os-/bantu-os-/g' /etc/greetd/config.toml && echo "    greetd now starts bantu-os-compositor"
fi
if [[ -d /etc/nastech-os && ! -e /etc/bantu-os ]]; then
  sudo -n mv /etc/nastech-os /etc/bantu-os
fi
if [[ -d /var/lib/nastech-os ]]; then
  sudo -n mkdir -p /var/lib/bantu-os/migrations
  sudo -n cp -an /var/lib/nastech-os/. /var/lib/bantu-os/ && sudo -n rm -rf /var/lib/nastech-os
fi
sudo -n rm -f /usr/local/bin/nastech-os /usr/local/bin/nastech-os-{theme,omakase,update,compositor,session,niri-nested}
sudo -n rm -f /usr/share/wayland-sessions/nastech-os.desktop
sudo -n rm -rf /usr/local/share/nastech-os-linux
if command -v plymouth-set-default-theme >/dev/null && [[ -d /usr/share/plymouth/themes/bantu-os ]]; then
  if [[ "$(plymouth-set-default-theme 2>/dev/null)" == "nastech-os" ]]; then
    # Every kernel's initramfs, not only the running one's (what -R rebuilds): whichever kernel boots
    # next has to carry the new splash (takes a minute).
    { sudo -n plymouth-set-default-theme bantu-os && sudo -n dracut -f --regenerate-all; } >/dev/null 2>&1 || echo "    WARNING: could not switch the Plymouth theme"
  fi
  sudo -n rm -rf /usr/share/plymouth/themes/nastech-os
fi
exit 0
