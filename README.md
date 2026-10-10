<p align="center">
  <img src="apps/desktop/build/icon.png" alt="Bantu OS" width="112">
</p>

<h1 align="center">Bantu OS</h1>

<p align="center">
  An agent-native operating system, with <a href="https://github.com/nastechresearch/nastech-agent">NasTech Agent</a> as the interface.
</p>

<p align="center">
  <a href="https://github.com/nastorehub/Bantu-OS/releases"><img src="https://img.shields.io/github/v/release/nastorehub/Bantu-OS?include_prereleases&label=release" alt="Latest release"></a>
  <a href="https://github.com/nastorehub/Bantu-OS/actions/workflows/ci.yml"><img src="https://github.com/nastorehub/Bantu-OS/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <a href="https://discord.gg/RHyFZ7FX6E"><img src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

![The Bantu OS desktop](docs/images/desktop.png)

Bantu OS is an operating system built around an AI agent. Instead of working through menus and
folders yourself, you talk or type to NasTech, and it works across the whole machine: it opens apps,
finds and organises files, watches what is running, remembers what matters to you, runs routines on
a schedule, and builds software while you watch. Every action that changes something goes through a
permission system you control.

> [!NOTE]
> **Bantu OS is an independent project maintained by [nastorehub](https://github.com/nastorehub).** It is
> not an official NasTech or NasTech Research product, and it is not affiliated with, sponsored by or
> endorsed by NasTech Research. Bantu OS runs on [NasTech Agent](https://github.com/nastechresearch/nastech-agent),
> the open-source agent NasTech Research publishes, which is installed alongside it.

> **Status: alpha (0.1).** Expect rough edges, and keep backups of anything you let an agent
> touch.

## Install

Every download is on the [releases page](https://github.com/nastorehub/Bantu-OS/releases).
Pick the way that matches your machine:

| Your machine | What to install |
| --- | --- |
| A Mac with Apple Silicon | [Bantu OS for macOS](#macos) |
| An Intel Mac | [Bantu OS Linux in a virtual machine, or the Mac app from source](#on-an-intel-mac) |
| A PC you can give to Bantu OS | [The Bantu OS Linux installer](#bantu-os-linux-on-a-pc) |
| Arch Linux | [The Arch package](#arch-linux) |
| Omarchy | [The Arch package, then one command](#omarchy) |
| Another Linux | [The tarball](#another-linux) |
| An Apple Silicon Mac, to try the whole OS | [The virtual machine](#the-whole-os-in-a-virtual-machine) |

NasTech needs a model provider whichever you pick: a [NasTech Portal](https://portal.nastechresearch.com)
account, or an API key for a provider NasTech supports (OpenRouter, OpenAI, Anthropic, a local model,
and others). Bantu OS shows a sign-in card the first time NasTech needs one.

### macOS

You need macOS 13 (Ventura) or later on Apple Silicon.

**1. Install NasTech Agent** and choose a model, if you don't have it yet:

```bash
curl -fsSL https://raw.githubusercontent.com/nastechresearch/nastech-agent/main/scripts/install.sh | bash
source ~/.zshrc
nastech setup
```

**2. Install Bantu OS.** Download `BantuOS-<version>-mac-arm64.dmg` from the
[releases page](https://github.com/nastorehub/Bantu-OS/releases), open it and drag Bantu OS to
Applications.

**3. Let it open.** This build is not notarized by Apple yet, so macOS stops it the first time.
Run this once, then open Bantu OS from Applications:

```bash
xattr -dr com.apple.quarantine "/Applications/Bantu OS.app"
```

Bantu OS takes over the screen: `Cmd+Ctrl+F` leaves or re-enters fullscreen and `Cmd+Q` quits. On
its first start it adds its system tools to NasTech (`~/.nastech/plugins/bantu-os-bridge`). macOS asks
for each of these the first time a feature needs it:

- **Microphone**: talking to NasTech, dictation, and screen recordings with sound.
- **Camera**: the camera bubble on a screen recording, when you turn it on.
- **Screen Recording**: asking NasTech about the screen, copying text or a QR code from it,
  screenshots and screen recordings.
- **Accessibility and Automation**: typing an emoji or dictation into another app (through System
  Events), and NasTech listing or quitting apps, locking the screen, switching dark mode and moving
  files to the Trash (through Finder).
- **Calendars**: today's events on the Overview.
- **Files and Folders**: your Desktop, Documents and Downloads, for recent files on the Overview,
  the Files page and NasTech's file tools.
- **Notifications**: alerts while you are in another app, in a code-signed build (this release is
  not one yet).

#### On an Intel Mac

There is no Intel build of the Mac app (`npm run dist:mac` builds for Apple Silicon only), and the
ready-made virtual machine (`linux/vm/try.sh`) needs Apple Silicon too. Instead:

- **Bantu OS Linux in a virtual machine.** Install the x86_64 installer ISO from
  [Bantu OS Linux on a PC](#bantu-os-linux-on-a-pc) in a VM that boots with UEFI, such as
  [UTM](https://mac.getutm.app). CI installs it in QEMU with UEFI, 4 cores, 6 GB of memory and a
  40 GB disk ([installer-test.yml](.github/workflows/installer-test.yml)).
- **The Mac app from source** on macOS 13 or later, as in
  [Bantu OS on macOS from source](#bantu-os-on-macos-from-source). It is untested on Intel, though
  node-pty, its native terminal module, ships Intel binaries.

### Bantu OS Linux on a PC

The whole operating system, for a 64-bit Intel or AMD PC: Fedora underneath, everything you see is
Bantu.

1. Download both parts of the installer from the
   [releases page](https://github.com/nastorehub/Bantu-OS/releases),
   `bantu-os-<version>-x86_64.iso.part0` and `.part1` (GitHub takes files of up to 2 GB), and join
   them. On macOS or Linux:

   ```bash
   cat bantu-os-<version>-x86_64.iso.part* > bantu-os-<version>-x86_64.iso
   shasum -a 256 -c bantu-os-<version>-x86_64.iso.sha256    # sha256sum -c on Linux
   ```

   On Windows: `copy /b bantu-os-<version>-x86_64.iso.part0 + bantu-os-<version>-x86_64.iso.part1 bantu-os-<version>-x86_64.iso`.
2. Write the ISO to a USB stick of 8 GB or more with
   [Fedora Media Writer](https://fedoraproject.org/workstation/download) or
   [balenaEtcher](https://etcher.balena.io).
3. Start the PC from the stick and follow the installer. Its disk screen lets you erase the disk or
   install next to Windows, and encrypt it. Secure Boot can stay on.
4. The first start sets up NasTech Agent, then Bantu OS asks for your name, a password and Wi-Fi.

Updates come as a whole new version of the system: `bantu-os update` installs one, and
`bantu-os rollback` goes back to the one before. Already on Fedora Silverblue or another bootc
system? It can switch to the Bantu OS image in place, which replaces the system you run and adds an
account that signs in without a password: try it on a spare machine or in a virtual machine.
[docs/LINUX.md](docs/LINUX.md#switching-a-bootc-system-to-bantu-os) has the steps, what changes and
how to go back.

### Arch Linux

```bash
git clone https://github.com/nastorehub/Bantu-OS.git
cd Bantu-OS/packaging/arch/bantu-os-bin
makepkg -si
bantu-os setup        # once per user: NasTech Agent and Bantu's system tools
```

The package downloads the release build for your architecture (x86_64 or aarch64). Then choose
Bantu OS on your login screen for the full session (it needs `niri`; the package's optional
dependencies list what each panel uses), or run `bantu-os-app` to use Bantu OS as an app inside
your current desktop. The session applies Bantu's theme to GTK apps, foot and GNOME's colour
scheme for the account that runs it, so on a desktop you already use, try it from a second account.
The package is not on the AUR yet.

### Omarchy

Install [the Arch package](#arch-linux), then:

```bash
bantu-os omarchy install
```

Bantu OS becomes an app inside Omarchy. It follows Omarchy's theme and has a row on the Omarchy
menu. `Super+Alt+H` opens it, and `Super+Alt+A`, `C`, `V`, `X`, `E` and `M` ask NasTech about the
window, open the command bar, talk, dictate, pick an emoji and show Missions. `bantu-os omarchy
remove` takes it all out again. This has been tested against Omarchy 4's own configuration and
scripts, but not yet on an Omarchy machine: [reports](https://github.com/nastorehub/Bantu-OS/issues)
are welcome.

### Another Linux

The tarball carries the app, its command-line tools and the full session. Download
`bantu-os-<version>-linux-x64.tar.gz` and its `.sha256` from the
[releases page](https://github.com/nastorehub/Bantu-OS/releases) (the `arm64` ones on ARM), then:

```bash
sha256sum -c bantu-os-<version>-linux-x64.tar.gz.sha256
sudo mkdir -p /opt/bantu-os
sudo tar -xzf bantu-os-<version>-linux-x64.tar.gz -C /opt/bantu-os --strip-components=1
sudo /opt/bantu-os/resources/bantu-os-linux/bin/bantu-os-tarball install
bantu-os setup        # once per user: NasTech Agent and Bantu's system tools
bantu-os-app          # Bantu OS as an app inside your desktop
```

`bantu-os-tarball install` puts the `bantu-os` commands in `/usr/local/bin` and Bantu OS in your
application menu, and, if niri is installed, on your login screen; `sudo bantu-os-tarball remove`
takes them out again. `bantu-os update` installs a new release once its checksum matches, and
`bantu-os rollback` goes back to the version before.

The full session needs niri and the tools its menu bar and panels use (Fedora's package names are
in [linux/image/packages.txt](linux/image/packages.txt)). It also applies Bantu's theme to the
account that runs it: GTK 3 and 4 apps (`gtk.css`), the foot terminal (`foot.ini`) and GNOME's
colour scheme and GTK theme. On a desktop you already use, try it from a second account.
[docs/LINUX.md](docs/LINUX.md#another-linux-the-release-tarball) has the details.

### The whole OS in a virtual machine

On an Apple Silicon Mac, one command downloads the latest release's VM disk (about 2.7 GB) and
boots it with Apple's virtualization, so the graphics are accelerated:

```bash
brew install qemu zstd
git clone https://github.com/nastorehub/Bantu-OS.git && cd Bantu-OS
bash linux/vm/try.sh
```

The first start sets itself up in a few minutes, NasTech Agent included. The disk is also on the
releases page in two parts, `bantu-os-<version>-aarch64.qcow2.zst.part0` and `.part1`: join them
with `cat`, unpack with `zstd -d`, and it imports into [UTM](https://mac.getutm.app). To build the VM
from your checkout instead and work on Bantu OS Linux, see
[Building from source](#bantu-os-linux-in-a-virtual-machine).

## How Bantu OS fits together

**Bantu OS Linux is the operating system.** Fedora supplies the kernel, drivers and packages, and
everything you see is Bantu. The machine boots to the Bantu splash screen and signs you straight
in. The niri compositor arranges the windows, Bantu draws the menu bar, dock, notifications, app
launcher and system menus, and its theme styles the lock screen. NasTech starts with the session,
with tools to see and operate the machine. Linux apps such as Firefox, LibreOffice and VS Code run
as windows inside it, and a curated set comes preinstalled. It installs on a PC from the installer
image or runs in a virtual machine, and it updates as a whole system you can roll back.

**On Arch Linux and Omarchy,** Bantu OS is a package: the full session from the login screen, or
Bantu as an app inside Hyprland and Omarchy, following Omarchy's theme and keys.

**Bantu OS also runs on a Mac,** fullscreen over macOS: the same interface, agent and tools, with
macOS underneath handling the hardware and your Mac apps. It is the quickest way to try Bantu OS,
and where most of it is built.

Bantu OS does not fork NasTech. It runs a standard NasTech Agent install and adds its system
abilities as a regular NasTech plugin, `bantu-os-bridge`.

## A look around

<table>
  <tr>
    <td width="50%"><img src="docs/images/boot.png" alt="The Bantu OS boot screen"></td>
    <td width="50%"><img src="docs/images/applications.png" alt="The application launcher"></td>
  </tr>
  <tr>
    <td>Bantu OS Linux boots to its own splash screen and signs you straight in.</td>
    <td>The launcher holds Bantu's own apps and every installed Linux app.</td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/images/control-menu.png" alt="The Bantu OS menu"></td>
    <td width="50%"><img src="docs/images/nastech.png" alt="NasTech answering with its system tools"></td>
  </tr>
  <tr>
    <td>One menu installs apps, changes the theme and updates the system. NasTech can do the same.</td>
    <td>NasTech answers with its system tools and asks before it changes anything.</td>
  </tr>
</table>

## What you get

- **NasTech at the centre.** Overview, NasTech, Missions, Memory, Files, Automations, Connections and
  Settings, plus a Terminal, a System monitor, and floating chat windows.
- **Pick up where you left off.** When you open Bantu OS or come back after a break, NasTech looks
  at your recent documents, project folders (with their git state), conversations and today's
  calendar, and puts up to three threads of work on the Overview. Continue reopens a thread's
  conversation, folder and files; its suggested next step starts only when you click it.
- **A command bar** for every action in the OS: open pages and apps, add memories, run automations,
  start missions.
- **System tools for NasTech**: system info, processes, disk usage, file search, opening apps,
  moving and trashing files, and more, each with a permission tier, protected paths, an audit log
  and the standard NasTech approval card. See [docs/SYSTEM-BRIDGE.md](docs/SYSTEM-BRIDGE.md).
- **Voice**: press the voice key or say "hey NasTech" and talk. NasTech answers out loud and can
  operate the interface ("open missions", "remember that my sister's birthday is in May"). A free
  engine works with any speech provider; an opt-in realtime engine is available. See
  [docs/VOICE.md](docs/VOICE.md).
- **Studio**: say "build a website for a hair salon" and watch it happen in one window: the
  project's files, the code as it is written, the commands it runs, and a live preview.
- **Crash help**: when a program crashes, a notification offers to have NasTech read the crash
  report and explain, in plain words, what went wrong and whether it is worth reporting.
- **Bantu Canvas**: a layered image editor with masks, blend modes, adjustment layers, layer
  effects and editable text, drawn on the GPU. Remove backgrounds, select objects and fill holes with
  models that run on your computer, open and export Photoshop files, and ask NasTech for a poster or a
  warmer photo while you watch it work. Its projects open in Compositor on the Mac. See
  [the manual](docs/manual/canvas.md).
- **Bantu Office**: Bantu Docs, Sheets and Slides for Word, Excel and PowerPoint files: real pages
  with headers, footers, comments and tables of contents; formulas, charts and summaries; themes,
  masters and a presenter view. Ask NasTech for a cover letter, a cleaner column or slides from a
  report and watch each change land as a step you can undo. Before Bantu first saves over a file,
  it says what the file would lose and backs it up. See [the manual](docs/manual/office.md).
- **Make it yours**: twelve themes (two light) that also dress NasTech's own command line, a theme
  made from any image, themes installed from git, your own fonts, and NasTech can design one from a
  description. Widgets for the menu bar, the Overview or their own window run sandboxed with only
  the permissions you grant, and NasTech can write them for you. Arrange the menu bar and its clock,
  add your own control-menu entries, and put your logo in About and your picture on the lock
  screen. See [the manual](docs/manual/make-it-yours.md).
- **The screen**: select part of the screen and ask NasTech about it; pick a colour, read a QR code
  or copy the text from anywhere on it; and type an emoji into any app (`Cmd+Ctrl+E` on the Mac,
  `Super+Ctrl+E` on Linux).
- **Usage**: what NasTech used this week and this month, and what is left on your model plan, with
  a warning at 90%.
- **When something happens**: automations that run when you log in, come back after a break, the
  battery runs low or a program crashes, and hook scripts for the same moments.
- **On Bantu OS Linux, the rest of an OS**: a control menu to install and remove apps, change the
  theme and update the system; one-click installs for AI tools such as Claude Code, Codex and local
  models; themes that recolour everything from the menu bar to the terminal; Wi-Fi, Bluetooth,
  sound, display and battery panels; screenshots, screen recording, night light and do not disturb;
  web apps in their own windows; clipboard history, a lock screen and a power menu; fingerprint and
  security-key sign-in; a firewall that refuses incoming connections; and one command,
  `bantu-os update`, that updates Bantu OS, NasTech and Fedora, with `bantu-os rollback` to undo
  it.

The [manual](docs/manual/README.md) covers using all of it, with every hotkey and a page for
people coming from macOS.

## Building from source

To work on Bantu OS, or to run what is on `main`:

- **Bantu OS Linux in a virtual machine** gives you the whole operating system, built from your
  checkout. The first setup takes about half an hour, most of it downloads.
- **Bantu OS on macOS** runs from your checkout in a few minutes if you already have Node.js.

### Bantu OS Linux in a virtual machine

You need an Apple Silicon Mac with [Homebrew](https://brew.sh) and about 20 GB of free disk space.
The virtual machine gets 4 cores and 8 GB of memory; on a Mac with 8 GB in total, start it with
`MEM=4096` in front of the command. Nothing on the Mac itself changes: the VM is a disk image in
`linux/vm/build/`.

**1. Install QEMU and get the code.**

```bash
brew install qemu
git clone https://github.com/nastorehub/Bantu-OS.git
cd Bantu-OS
```

**2. Download Fedora and prepare the first boot.**

```bash
bash linux/vm/download-image.sh   # Fedora Cloud for ARM, about 500 MB
bash linux/vm/make-seed.sh        # first-boot setup and an SSH key, in linux/vm/build/
```

**3. Boot the virtual machine.** A window opens on your Mac. The first boot installs Bantu OS:
the system packages, NasTech Agent and the default apps.

```bash
bash linux/vm/run-qemu.sh
bash linux/vm/run-qemu.sh console   # follow the install; Ctrl+C stops watching
```

Wait until the console prints `==> Provisioning complete`. That takes 30 to 45 minutes, mostly
downloads. If it prints `==> Provisioning FAILED` instead, see [Troubleshooting](#troubleshooting).

**4. Install the Bantu shell.** This copies your checkout into the VM, builds it there and starts
Bantu OS:

```bash
bash linux/dev/push.sh
```

**5. Sign NasTech in.** The first time NasTech needs a model, Bantu OS shows a sign-in card with a
short code: open the link on any device and enter the code. To use an API key or another provider
instead, open a shell in the VM with `bash linux/dev/push.sh ssh` and run `nastech setup`.

From then on, `bash linux/vm/run-qemu.sh stop` shuts the VM down and `bash linux/vm/run-qemu.sh`
starts it again, straight into Bantu OS. After you change the code on your Mac,
`bash linux/dev/push.sh` installs it. [docs/LINUX.md](docs/LINUX.md) covers UTM, display scaling on
Retina screens, the session model and the dev loop.

### Bantu OS on macOS from source

You need:

- **macOS 13 (Ventura) or later on Apple Silicon.** Intel Macs are untested. Bantu OS is
  developed on macOS 26.
- **Node.js 22.12 or later** ([nodejs.org](https://nodejs.org), or `brew install node`).
- **Git**, and the Xcode Command Line Tools (`xcode-select --install`) for native modules.
- **NasTech Agent 0.21.3 or later**, with a model provider set up (step 1 below).

**1. Install NasTech Agent and choose a model.** Bantu OS on macOS uses your own NasTech install.
If you don't have it yet:

```bash
curl -fsSL https://raw.githubusercontent.com/nastechresearch/nastech-agent/main/scripts/install.sh | bash
source ~/.zshrc
nastech setup
```

`nastech setup` walks you through choosing a model provider and signing in. You can change it later
with `nastech model`, or from Bantu OS under Settings. Check that NasTech works on its own before
going further:

```bash
nastech doctor
nastech        # say hello, then exit with Ctrl+D
```

**2. Get the code.**

```bash
git clone https://github.com/nastorehub/Bantu-OS.git
cd Bantu-OS
```

**3. Bootstrap.**

```bash
npm run bootstrap
```

This is safe to re-run, and you should re-run it after every `git pull`. It:

1. downloads the pinned NasTech gateway client the shell is compiled against (`upstream/`);
2. installs the Node packages and downloads Electron;
3. links the `bantu-os-bridge` plugin into `~/.nastech/plugins` and enables it and its tools;
4. migrates settings from the project's earlier name (NasTech OS), if you had it installed;
5. reports which optional voice packages your NasTech install has.

**4. Start Bantu OS.**

```bash
npm run dev
```

Bantu OS starts your NasTech runtime in the background (`nastech serve`, on 127.0.0.1 only), shows
the boot screen, and takes over the screen. `Cmd+Ctrl+F` leaves or re-enters fullscreen; `Cmd+Q`
quits and stops the backend it started.

Edits to the interface (`apps/desktop/src`) reload live. Changes to the Electron main process need
a restart (`Ctrl+C`, then `npm run dev` again).

**5. Check that everything works.**

- **NasTech answers.** Open the NasTech page (`Cmd+2`) and ask something. If it asks you to sign in,
  use the card it shows, or run `nastech setup` again.
- **System tools work.** Ask "what is using the most memory right now?". NasTech should answer with
  the `system_processes` tool rather than a shell command. Ask it to move a file and you should get
  an approval card first.
- **Voice works (optional).** Press `Alt+Space` and allow microphone access when macOS asks.
  Settings > Voice has "Say hello" and "Start talking" buttons to test it.

## Using Bantu OS

### Keyboard shortcuts

On Bantu OS Linux the system key is `Super` (the Windows or Command key), and `Super+K` lists every
shortcut. In the virtual machine the system key is `Alt` (`Option` on a Mac keyboard) instead, so
`Super+A` becomes `Alt+A`: the Mac keeps `Command` for itself. Bantu's own pages also answer to
`Ctrl` on Linux, so `Ctrl+K` and `Ctrl+1` work everywhere.

| Action | Bantu OS Linux | macOS |
| --- | --- | --- |
| Command bar | `Super+Shift+Space` or `Ctrl+K` | `Cmd+K` |
| All applications | `Super+A` | `Cmd+Shift+A` |
| Talk to NasTech | `Super+V` | `Alt+Space` |
| Ask NasTech about the focused window | `Super+Space` | |
| Bantu OS menu: apps, themes, updates | `Super+M` or `Super+Alt+Space` | |
| Overview, NasTech, Missions, Memory, Files, Automations, Connections | `Ctrl+1` ... `Ctrl+7` | `Cmd+1` ... `Cmd+7` |
| Settings | `Super+,` | `Cmd+,` |
| Terminal | `Super+Return` | `Cmd+8` |
| Close window | `Super+Q` | `Cmd+W` |
| Emoji, typed into any app | `Super+Ctrl+E` | `Cmd+Ctrl+E` |
| Clipboard history | `Super+Ctrl+V` | |
| Lock, power menu | `Super+Ctrl+L`, `Super+Escape` | |
| Toggle fullscreen, quit | | `Cmd+Ctrl+F`, `Cmd+Q` |

On Linux, every hotkey and menu item is a `bantu-os` command, so NasTech and your scripts can do
the same things: `bantu-os install app obsidian`, `bantu-os theme set ice`, `bantu-os update`.
`bantu-os commands` lists them all.

### Permissions

NasTech's system tools have four tiers. `read` tools (system info, file search) and `act` tools
(opening an app) run straight away and are logged. `mutate` tools (create, move, rename) ask first,
and you can allow them for the session or always. `destructive` tools (stopping a process, moving
files to the Trash) ask every time. Some locations, such as `~/.ssh`, your keychains and NasTech's
own credentials, are always refused.

Settings > Privacy shows the policy and the audit log (`~/.nastech/bantu-os/audit.jsonl`). NasTech's
own terminal tool keeps following NasTech's approval settings.

Pick up where you left off is off until you turn it on from the Overview. It reads names and dates
(recent files and folders, project branches and commit messages, conversation titles, today's
event titles, open apps), never file contents, window titles or the screen, and sends them to your
NasTech model provider to write the suggestions. Settings > Privacy turns it off and lists folders
and words it must leave out, such as a client's name.

### Settings and data

| What | Where |
| --- | --- |
| Bantu OS preferences | `~/.nastech/bantu-os/prefs.json` (edit them in Settings) |
| Audit log, control socket | `~/.nastech/bantu-os/` |
| Log file | `~/.nastech/logs/bantu-os.log` |
| NasTech config, memories, sessions, credentials | `~/.nastech/`, managed by NasTech |

A few options come from environment variables, mostly for development: starting windowed on macOS
(`BANTU_OS_WINDOWED=1`), using a different NasTech checkout (`BANTU_OS_NASTECH_ROOT`), or a
throwaway NasTech home (`NASTECH_HOME=/tmp/bantu-test`). [.env.example](.env.example) lists them
all.

#### What Bantu OS changes in your NasTech

Bantu OS runs on your own NasTech, so a few of its changes reach NasTech's other sessions too:

- **The system bridge plugin.** Setup (the Mac app's first start, `bantu-os setup`, or
  `npm run bootstrap`) links it into `~/.nastech/plugins/bantu-os-bridge`, adds it to
  `plugins.enabled`, and saves the `cli` platform's toolset list with `bantu_os` in it. Its tools
  run only in sessions Bantu OS starts; Telegram, Discord, cron and the `nastech` CLI never get them.
- **Tool search off** (`tools.tool_search.enabled: off`), so NasTech calls the system tools directly.
  NasTech has one switch for every session, so plugin and MCP tools are listed directly everywhere.
  The earlier value is kept in `~/.nastech/bantu-os/tool-search-before`, and Settings > NasTech &
  agents > Tool search turns it back on.
- **Your theme** becomes NasTech's skin (`display.skin: bantu-os`) unless you picked another one.
- **Voice** switches speech-to-text to `local` or text-to-speech to `edge` (`stt.provider`,
  `tts.provider`) when the provider you had cannot run, and tells you when it does.

To undo it on Linux, run `bantu-os setup --undo`. On macOS, the steps are in
[docs/SYSTEM-BRIDGE.md](docs/SYSTEM-BRIDGE.md#what-bantu-os-changes-in-your-nastech).

## Building a macOS release

```bash
npm run dist:mac
```

This writes an Apple Silicon DMG and zip to `apps/desktop/release/`. Before installing, know that:

- **A local build is not notarized.** electron-builder signs it with a code-signing identity from
  your keychain if it finds one, and leaves it unsigned otherwise. A copy that was downloaded or sent
  to you will not open the first time: choose Open Anyway in System Settings → Privacy & Security, or
  run `xattr -dr com.apple.quarantine "/Applications/Bantu OS.app"`. The release workflow
  (`.github/workflows/release.yml`) builds a signed and notarized one when the repository has the
  `MAC_CERTIFICATE_P12`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and
  `APPLE_TEAM_ID` secrets; set the same variables locally (`CSC_LINK` and `CSC_KEY_PASSWORD` for the
  certificate) to notarize from your Mac.
- **macOS notifications need a signed build.** Notifications still appear inside Bantu OS, but the
  macOS ones it sends while you are in another app only work when the build is code-signed.
- **The system tools plugin comes with the app.** On its first start the app links its copy into
  `~/.nastech/plugins` and enables it. A link from a checkout (`npm run bootstrap`) stays as it is.
- **NasTech Agent is not bundled.** The app finds it as in development: `BANTU_OS_NASTECH_ROOT`,
  then `~/.nastech/nastech-agent`, then `nastech` on your PATH.

## Building a Linux release

```bash
npm run dist:linux --workspace apps/desktop            # this machine's architecture
npm run dist:linux --workspace apps/desktop -- --arm64  # or pick one
```

This writes `bantu-os-<version>-linux-<arch>.tar.gz` to `apps/desktop/release/`: the app, with the
`bantu-os` CLIs, the niri session, themes, the install catalog and the bridge plugin under
`resources/`. Build on the target architecture (node-pty is compiled, not cross-built); the release
workflow builds x64 and arm64 on matching runners. The tarball is what the Arch package and the
Bantu OS image install; on its own, unpack it to `/opt/bantu-os` and run
`sudo /opt/bantu-os/resources/bantu-os-linux/bin/bantu-os-tarball install`, as in
[Another Linux](#another-linux).

## Project layout

```
apps/desktop/               The Bantu shell: Electron main (electron/), preload/, React interface (src/)
packages/nastech-client/     Typed client for the NasTech gateway (JSON-RPC over WebSocket, REST)
plugins/bantu-os-bridge/   NasTech plugin: system tools, permission tiers, audit log, UI control
linux/                      Bantu OS Linux: provisioning, session, niri config, themes, apps, VM tooling
examples/widgets/           sample widget plugins (ADR-019)
scripts/                    bootstrap, upstream sync, bridge tests, secret scan
upstream/                   UPSTREAM.lock, the pinned NasTech version the shell builds against
docs/                       architecture, decisions, system bridge, voice, Linux
```

New here? Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), then
[apps/desktop/README.md](apps/desktop/README.md) for where things go in the shell.

## Development

```bash
npm run typecheck     # TypeScript: interface, Electron main and preload, client package
npm test              # Vitest
npm run test:bridge   # pytest for the bridge plugin
npm run build         # production build into apps/desktop/dist
bash scripts/check-secrets.sh   # gitleaks over the history and your changes
```

CI runs all of these on Ubuntu and macOS. [CONTRIBUTING.md](CONTRIBUTING.md) has the conventions.

## Updating

- **Bantu OS Linux:** `bantu-os update` (or Update in the Bantu OS menu) installs the new system,
  NasTech Agent and the Flatpak apps, and `bantu-os rollback` goes back.
- **The Mac app:** download the new DMG and replace the app in Applications. `nastech update` updates
  NasTech itself, whenever you like.
- **Arch and Omarchy:** run `git pull` and `makepkg -si` again in `packaging/arch/bantu-os-bin`.
- **The tarball on another Linux:** `bantu-os update` downloads the newest release for your
  architecture, checks it against its `.sha256` and swaps it into `/opt/bantu-os`, keeping the
  version before in `/opt/bantu-os.previous` for `bantu-os rollback`. Log out and back in to use it.
- **From source on macOS:** `git pull`, then `npm run bootstrap`.
- **The development VM:** `git pull` on the Mac, then `bash linux/dev/push.sh`.

The shell compiles against a pinned NasTech version (`upstream/UPSTREAM.lock`), so updating NasTech
does not change the shell's code. Moving the pin is described in [upstream/README.md](upstream/README.md).

## Troubleshooting

- **"No NasTech runtime found", or the boot screen never finishes.** Bantu OS keeps looking and
  starts NasTech as soon as it is installed. On the Bantu OS image, a first start without a network
  installs it once you are online (`journalctl -u bantu-os-nastech` shows how that goes). Otherwise
  run `nastech doctor`. If NasTech lives somewhere other than `~/.nastech/nastech-agent` and is not on
  your PATH, start with `BANTU_OS_NASTECH_ROOT=/path/to/nastech-agent npm run dev`. The cause is
  usually in `~/.nastech/logs/bantu-os.log`.
- **macOS says Bantu OS "is damaged" or "cannot be opened".** The build is not notarized yet: run
  `xattr -dr com.apple.quarantine "/Applications/Bantu OS.app"` and open it again.
- **NasTech uses shell commands instead of its system tools.** `nastech plugins list` should show
  `bantu-os-bridge` as enabled; `nastech plugins enable bantu-os-bridge` turns it on. From a
  checkout, re-run `npm run bootstrap`; on Linux, `bantu-os setup`. Then restart Bantu OS.
- **The VM's first boot fails or never finishes.** A failed step prints
  `==> Provisioning FAILED at line N`, and `bash linux/vm/run-qemu.sh console` shows where it
  stopped. `/var/log/bantu-os-provision.log` in the VM has the whole run (`bash linux/dev/push.sh ssh`
  opens a shell there). `bash linux/vm/run-qemu.sh reset` deletes the VM's disk so the next start
  begins again.
- **Bantu OS Linux shows a black screen after `push.sh`.** Open a shell with
  `bash linux/dev/push.sh ssh` and read `~/.local/state/bantu-os/shell.log` and
  `journalctl -u greetd`.
- **`npm run dev` waits on a download.** Electron downloads itself on first use. Bootstrap does this
  up front; behind a proxy, see [Electron's installation docs](https://www.electronjs.org/docs/latest/tutorial/installation).
- **Native module errors after changing Node versions.** Delete `node_modules` and run
  `npm run bootstrap` again.
- **The microphone does nothing on macOS.** Check System Settings > Privacy & Security >
  Microphone. In development the permission belongs to Electron (or your terminal); in a built
  release, to Bantu OS.
- **Stuck fullscreen on macOS.** `Cmd+Ctrl+F`, or start with `BANTU_OS_WINDOWED=1 npm run dev`.
- **Still stuck?** Ask in #help on [Discord](https://discord.gg/RHyFZ7FX6E), or open an issue on
  GitHub.

## Contributing and security

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Come and ask questions, share
ideas or show what you built on [Discord](https://discord.gg/RHyFZ7FX6E). Please report
vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Bantu OS builds on [NasTech Agent](https://github.com/nastechresearch/nastech-agent) by
NasTech Research, also MIT; see [NOTICE](NOTICE). Bantu OS is an independent project and is not
affiliated with NasTech Research; the NasTech names refer to NasTech Research's project and are used only
to say what Bantu OS runs on.
