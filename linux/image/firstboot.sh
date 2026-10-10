#!/usr/bin/env bash
# Bantu OS Linux, the per-machine half: the session user and everything in a home folder. Runs as
# root and is safe to re-run. The shell's first-boot setup then lets the person choose a name and a
# password, join Wi-Fi and sign in to NasTech.
#
#   firstboot.sh system   the user, the home folder, NasTech Agent: before the login screen
#                         (bantu-os-firstboot.service)
#   firstboot.sh nastech   NasTech Agent alone, when the first boot could not install it: waits for
#                         the network, then installs and sets it up (bantu-os-nastech.service)
#   firstboot.sh apps     the omakase Flatpaks, after the login screen is up
#                         (bantu-os-firstboot-apps.service)
#   firstboot.sh          system and apps, in order (the development VM's provisioner)
set -euo pipefail

PHASE="${1:-all}"
NASTECH_USER="${NASTECH_USER:-nastech}"
STATE=/var/lib/bantu-os
# There while NasTech Agent waits to be installed: one word for how it goes (offline, installing,
# retrying), which the shell's boot screen shows; bantu-os-nastech.service runs while it is there.
PENDING="$STATE/nastech-pending"
NASTECH_UNIT=/usr/lib/systemd/system/bantu-os-nastech.service
BRIDGE=/usr/share/bantu-os/bridge
OFFLINE_WAIT=30
RETRY_WAIT=600
mkdir -p "$STATE"

step() { echo; echo "--- $*"; }
# Through pipes: run from a unit, what the command writes straight to the journal never gets there
# (sudo 1.9.17 on Fedora 44), and that is the installer's every word.
as_user() { sudo -u "$NASTECH_USER" -H "$@" 2> >(cat >&2) | cat; }
# Whether GitHub, where NasTech Agent comes from, answers. Quiet: offline, it is asked every half minute.
online() { curl -fsI --connect-timeout 10 --max-time 30 -o /dev/null https://github.com/nastechresearch/nastech-agent; }
# How the shell's boot screen describes the wait, while there is one.
note() { [[ ! -f "$PENDING" ]] || echo "$1" >"$PENDING"; }

# Where packages.sh put the shared files: the image's /usr/share/bantu-os or the VM's /usr/local share.
SHARE=""
for candidate in /usr/share/bantu-os /usr/local/share/bantu-os-linux "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; do
  if [[ -f "$candidate/niri/config.kdl" && -d "$candidate/session" ]]; then
    SHARE="$candidate"
    break
  fi
done
[[ -n "$SHARE" ]] || { echo "firstboot: the Bantu OS files are missing (run packages.sh first)" >&2; exit 1; }

system_phase() {
  step "The session user ($NASTECH_USER)"
  if ! id "$NASTECH_USER" >/dev/null 2>&1; then
    # No password yet: the lock screen refuses until one is set (first-boot setup or bantu-os password).
    useradd -m -G wheel "$NASTECH_USER"
    passwd -d "$NASTECH_USER" >/dev/null
  fi
  HOME_DIR="$(getent passwd "$NASTECH_USER" | cut -d: -f6)"
  usermod -aG video,input,render,audio "$NASTECH_USER" 2>/dev/null || true
  if getent group seat >/dev/null; then
    usermod -aG seat "$NASTECH_USER" || true
  fi
  # The user's systemd instance (pipewire, portals) keeps running when no one is logged in.
  loginctl enable-linger "$NASTECH_USER" || true
  sed -i "s/^user = .*/user = \"$NASTECH_USER\"/" /etc/greetd/config.toml

  step "The login screen"
  # Anaconda picks multi-user.target unless its kickstart says otherwise, because greetd provides
  # no service(graphical-login); only graphical.target starts greetd and so the session.
  if [[ "$(systemctl get-default)" != "graphical.target" ]]; then
    systemctl set-default graphical.target
    systemctl --no-block start graphical.target
  fi

  step "Home folder"
  as_user mkdir -p "$HOME_DIR/.local/bin" "$HOME_DIR/.local/share" "$HOME_DIR/.local/state" "$HOME_DIR/.config/bantu-os" "$HOME_DIR/.config/niri" "$HOME_DIR/.config/swaylock" "$HOME_DIR/.config/systemd/user"
  as_user env XDG_RUNTIME_DIR="/run/user/$(id -u "$NASTECH_USER")" systemctl --user enable bantu-os-update-check.timer 2>/dev/null || true
  as_user bantu-os-theme set "$(as_user bantu-os-theme current)" || true
  # Bantu's niri config, rendered with the person's keymap (managed; local.kdl is theirs).
  as_user bantu-os keymap apply || install -m 0644 -o "$NASTECH_USER" -g "$NASTECH_USER" "$SHARE/niri/config.kdl" "$HOME_DIR/.config/niri/bantu-os.kdl"
  install -m 0644 -o "$NASTECH_USER" -g "$NASTECH_USER" "$SHARE/session/swaylock.conf" "$HOME_DIR/.config/swaylock/config"

  if nastech_step; then
    rm -f "$PENDING"
  else
    nastech_later
  fi
  date -Is >"$STATE/firstboot-done"
}

# NasTech Agent for the session user: installed unless it is there already, in whichever layout
# (`bantu-os nastech-command` looks for it the way the shell does), given the voice extras, and set
# up for Bantu OS. Fails while there is still no NasTech.
nastech_step() {
  step "NasTech Agent for $NASTECH_USER"
  if [[ -f /etc/bantu-os/ref ]]; then
    # shellcheck disable=SC1091
    source /etc/bantu-os/ref
  fi
  local ref="${NASTECH_REF:-main}" agent="$HOME_DIR/.nastech/nastech-agent" nastech
  if nastech="$(as_user bantu-os nastech-command)"; then
    echo "already installed: ${nastech%%$'\n'*}"
  else
    as_user bash -euo pipefail -c "
      mkdir -p '$HOME_DIR/.nastech'
      # A clone the network cut off has no commits; it starts over.
      if [[ -d '$agent/.git' ]] && ! git -C '$agent' rev-parse --verify --quiet HEAD >/dev/null; then
        rm -rf '$agent'
      fi
      if [[ ! -d '$agent/.git' ]]; then
        # Every commit, but file contents only as checkouts need them: a quarter of the full download.
        git clone --filter=blob:none https://github.com/nastechresearch/nastech-agent '$agent'
      fi
      cd '$agent'
      git fetch --quiet origin '$ref' || true
      git checkout --quiet '$ref' || git checkout --quiet main
      # Older setup-nastech.sh asks two yes/no questions (ripgrep, setup wizard): no to both.
      printf 'n\nn\n' | bash ./setup-nastech.sh
    " || true
    nastech="$(as_user bantu-os nastech-command)" || return 1
  fi
  # Voice: local transcription, free neural voices and the "hey nastech" wake word. Today's layout
  # takes them through NasTech's own package manager, which keeps them across `nastech update`.
  case "${nastech%%$'\n'*}" in
    "$agent/.nastech/bin/nastech") as_user "$agent/.nastech/bin/nastech" pm install --extra voice --extra edge-tts --extra wake-openwakeword ;;
    "$agent/venv/bin/nastech") as_user bash -c "cd '$agent' && PATH=\"\$HOME/.local/bin:\$PATH\" uv pip install --python venv/bin/python -q -e '.[voice,edge-tts,wake-openwakeword]'" ;;
    *) echo "NasTech Agent came from another installer (${nastech%%$'\n'*}); voice uses cloud providers until it adds the voice extras" ;;
  esac || echo "voice extras failed; voice falls back to cloud providers"
  # The bridge plugin that lets NasTech use the system. The image ships it with the shell; the
  # development VM links the repo's copy when it builds the shell.
  if [[ -d "$BRIDGE" ]]; then
    as_user bantu-os setup --yes || echo "WARNING: bantu-os setup did not finish"
  fi
}

# The first boot could not install NasTech, usually for want of a network (Wi-Fi is joined later, in
# the shell's setup). On the image bantu-os-nastech.service installs it once the computer is online,
# and the shell waits for it; the development VM has no such unit.
nastech_later() {
  if [[ ! -f "$NASTECH_UNIT" ]]; then
    echo "WARNING: NasTech Agent did not install (offline?); run $0 nastech as root once this computer is online"
    return 0
  fi
  if online; then echo retrying; else echo offline; fi >"$PENDING"
  echo "WARNING: NasTech Agent did not install (offline?); bantu-os-nastech.service installs it once this computer is online, and Bantu OS starts it then"
}

# bantu-os-nastech.service: wait for the network, then install and set up NasTech; a failed try is
# repeated ten minutes later. The note goes once NasTech is set up, which is what the shell waits for.
nastech_phase() {
  HOME_DIR="$(getent passwd "$NASTECH_USER" | cut -d: -f6)"
  while :; do
    if ! online; then
      note offline
      echo "waiting for the network: NasTech Agent comes from GitHub"
      until online; do sleep "$OFFLINE_WAIT"; done
    fi
    note installing
    if nastech_step; then
      rm -f "$PENDING"
      return 0
    fi
    note retrying
    echo "NasTech Agent did not install; trying again in $((RETRY_WAIT / 60)) minutes"
    sleep "$RETRY_WAIT"
  done
}

apps_phase() {
  step "Omakase apps (BANTU_OS_OMAKASE=0 to skip)"
  if [[ "${BANTU_OS_OMAKASE:-1}" == "1" ]]; then
    as_user bantu-os-omakase install --flatpaks || echo "WARNING: omakase flatpaks incomplete"
    # Web apps need the shell's icon fetch; bantu-os-session installs them on the first login.
  fi
  date -Is >"$STATE/firstboot-apps-done"
}

case "$PHASE" in
  system) system_phase ;;
  nastech) nastech_phase ;;
  apps) apps_phase ;;
  all) system_phase; apps_phase ;;
  *) echo "usage: $0 [system|nastech|apps]" >&2; exit 2 ;;
esac
echo "==> first boot ($PHASE) done"
