# Troubleshooting

The [README](../../README.md#troubleshooting) covers installation problems. This page is for when
Bantu OS is running but something misbehaves.

## NasTech

- **NasTech does not answer.** The menu bar shows a badge while NasTech is unreachable. Run
  `nastech doctor` in a terminal; if it asks you to sign in, run `nastech setup`. Bantu OS's own
  log is `~/.nastech/logs/bantu-os.log`.
- **NasTech runs shell commands instead of its system tools.** The system bridge is not loaded:
  run `npm run bootstrap` in your Bantu OS checkout (or `bantu-os setup` from a package), then
  restart Bantu OS. `nastech plugins list` should show `bantu-os-bridge` as enabled.
- **An action was refused.** Protected folders (`~/.ssh`, keychains, NasTech's credentials) are
  always refused, and destructive actions ask every time. Settings > Privacy shows the rules and the
  audit log of what happened.

## Themes and the look

- **A theme does not change everything.** On a Mac, Bantu OS recolours itself and NasTech's skin;
  macOS apps keep their own look. On Bantu OS Linux, GTK apps pick up a new theme when they next
  start, and Obsidian needs its own theme setting.
- **NasTech's command line stopped following the theme.** Bantu OS only selects its `bantu-os`
  skin when you have not picked another one. Run `/skin bantu-os` in NasTech to go back to it.
- **Something is unreadable in a light theme.** Switch back with "use the ocean theme" and tell us
  which screen it was.

## Crashes and notifications

- **I never get crash offers.** Settings > Notifications > Crash help must be on, and the program
  must not be muted there. On Linux, crashes are read from systemd-coredump through `journalctl`;
  `bantu-os crash list` shows what it sees.
- **The same program keeps crashing.** Bantu OS offers help once every ten minutes per program;
  mute it from the notification if you do not need the offers.
- **macOS shows no notifications from Bantu OS.** macOS only delivers notifications from signed
  builds; inside Bantu OS they still appear in the bell.

## Hooks and event automations

- **A hook does not run.** It must be executable (`chmod +x`) and must not end in `.sample`. Its
  output is in `~/.nastech/logs/bantu-os.log`, on lines starting with `[hooks]`.
- **An event automation did not run.** NasTech must be running when the event happens, and the
  automation must be on. The log has a `[events]` line for every event and every automation fired.

## Collecting details for a bug report

On Bantu OS Linux, `bantu-os debug` prints the versions and the last lines of the logs. On a Mac,
attach the end of `~/.nastech/logs/bantu-os.log`. Report security problems privately, as described
in [SECURITY.md](../../SECURITY.md).
