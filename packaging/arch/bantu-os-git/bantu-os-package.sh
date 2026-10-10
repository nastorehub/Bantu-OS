# Shared by bantu-os-bin and bantu-os-git (keep the two copies identical; CI compares them).
# Lays out an unpacked Bantu OS build (the release tarball, or electron-builder's linux-unpacked):
#   /opt/bantu-os                    the app (its resources carry the CLIs, session, data, bridge)
#   /usr/bin/bantu-os*               the CLIs and session scripts, linked from the app
#   /usr/share/bantu-os/*            themes, catalog, niri template, omakase lists, migrations, bridge
#   /usr/share/wayland-sessions/      the full Bantu OS session for the login screen
#   /usr/share/applications/          Bantu OS as an app inside Hyprland, Omarchy or any desktop

# The folder that holds resources/app.asar, wherever the archive put it.
_bantu_os_appdir() {
  local asar
  asar="$(find "$1" -path '*/resources/app.asar' -print -quit)"
  [[ -n "$asar" ]] || { echo "no Bantu OS build under $1" >&2; return 1; }
  dirname "$(dirname "$asar")"
}

_bantu_os_package() {
  local app="$1" res=/opt/bantu-os/resources tool script dir

  install -d "$pkgdir/opt/bantu-os"
  cp -a "$app/." "$pkgdir/opt/bantu-os/"
  # Chromium's sandbox helper must be setuid root where unprivileged user namespaces are off.
  chmod 4755 "$pkgdir/opt/bantu-os/chrome-sandbox"

  install -d "$pkgdir/usr/bin"
  for tool in "$pkgdir$res"/bantu-os-linux/bin/*; do
    ln -s "$res/bantu-os-linux/bin/${tool##*/}" "$pkgdir/usr/bin/${tool##*/}"
  done
  for script in bantu-os-session bantu-os-compositor bantu-os-niri-nested; do
    ln -s "$res/bantu-os-linux/session/$script" "$pkgdir/usr/bin/$script"
  done

  install -d "$pkgdir/usr/share/bantu-os"
  ln -s "$res/themes" "$pkgdir/usr/share/bantu-os/themes"
  ln -s "$res/catalog" "$pkgdir/usr/share/bantu-os/catalog"
  ln -s "$res/bantu-os-bridge" "$pkgdir/usr/share/bantu-os/bridge"
  for dir in niri omakase migrations plymouth; do
    ln -s "$res/bantu-os-linux/$dir" "$pkgdir/usr/share/bantu-os/$dir"
  done

  install -Dm644 "$pkgdir$res/bantu-os-linux/session/bantu-os.desktop" "$pkgdir/usr/share/wayland-sessions/bantu-os.desktop"
  install -Dm644 -t "$pkgdir/usr/lib/systemd/user" "$pkgdir$res/bantu-os-linux/session/bantu-os-update-check.service" "$pkgdir$res/bantu-os-linux/session/bantu-os-update-check.timer"
  install -Dm644 "$pkgdir$res/icons/bantu-os.png" "$pkgdir/usr/share/icons/hicolor/512x512/apps/bantu-os.png"
  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/bantu-os.desktop" <<'DESKTOP'
[Desktop Entry]
Name=Bantu OS
Comment=The AI-native desktop built around NasTech Agent
Exec=bantu-os-app
Icon=bantu-os
Type=Application
Categories=System;Utility;
StartupWMClass=bantu-os
Terminal=false
DESKTOP
  install -Dm644 "$pkgdir$res/LICENSE" "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
  install -Dm644 "$pkgdir$res/NOTICE" "$pkgdir/usr/share/licenses/$pkgname/NOTICE"
}
