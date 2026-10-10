"""linux/image/firstboot.sh and NasTech Agent: found in any layout, given its voice extras the way that
layout takes them, and installed once the network is back when the first boot had none. Its
functions run in bash against a home folder in a temporary directory, with stand-ins for git, curl,
sleep, NasTech's installer and the parts of bantu-os that change things; the real bantu-os finds
NasTech."""

import re
import shlex
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIRSTBOOT = ROOT / "linux" / "image" / "firstboot.sh"
PENDING = "/var/lib/bantu-os/nastech-pending"


def functions(*names: str) -> str:
    """The named functions, as firstboot.sh has them."""
    script = FIRSTBOOT.read_text()
    found = []
    for name in names:
        match = re.search(rf"^{name}\(\) \{{ [^\n]*\}}$", script, re.M) or re.search(rf"^{name}\(\) \{{\n.*?^\}}$", script, re.M | re.S)
        assert match, f"firstboot.sh has no {name}()"
        found.append(match.group(0))
    return "\n".join(found) + "\n"


def executable(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"#!/bin/sh\n{body}\n")
    path.chmod(0o755)


class Machine:
    """A session user's home, the image's state folder, and a log of what the stand-ins were asked."""

    def __init__(self, tmp_path: Path, offline: int = 0, failed_clones: int = 0):
        self.root = tmp_path
        self.home = tmp_path / "home"
        self.state = tmp_path / "state"
        self.unit = tmp_path / "bantu-os-nastech.service"
        self.agent = self.home / ".nastech" / "nastech-agent"
        self.calls = tmp_path / "calls"
        for folder in (self.home, self.state, tmp_path / "bridge"):
            folder.mkdir()
        self.calls.write_text("")
        (tmp_path / "offline").write_text(f"{offline}\n")
        (tmp_path / "failed-clones").write_text(f"{failed_clones}\n")
        bin_dir = tmp_path / "bin"
        # GitHub, answering once the offline count has run down.
        executable(bin_dir / "curl", 'n=$(cat "$WORLD/offline"); [ "$n" -eq 0 ] && exit 0; echo $((n - 1)) >"$WORLD/offline"; exit 6')
        executable(bin_dir / "sleep", 'echo "sleep $1: $(cat "$PENDING" 2>/dev/null || echo no note)" >>"$CALLS"')
        executable(bin_dir / "getent", 'echo "me:x:1000:1000::$HOME_FOR_TEST:/bin/bash"')
        executable(bin_dir / "uv", 'echo "uv $*" >>"$CALLS"')
        # The real bantu-os finds NasTech; what it would change is only written down.
        executable(bin_dir / "bantu-os", '[ "$1" = nastech-command ] && exec "$PYTHON" "$CLI" "$@"; echo "bantu-os $*" >>"$CALLS"')
        # A clone that finishes has a HEAD; the checkout carries today's installer.
        executable(
            bin_dir / "git",
            'echo "git $*" >>"$CALLS"\n'
            'case "$1" in\n'
            '  clone)\n'
            '    n=$(cat "$WORLD/failed-clones"); [ "$n" -gt 0 ] && { echo $((n - 1)) >"$WORLD/failed-clones"; exit 128; }\n'
            '    for target; do :; done\n'
            '    mkdir -p "$target/.git" && : >"$target/.git/HEAD" && cp "$WORLD/setup-nastech.sh" "$target/" ;;\n'
            '  -C) [ -f "$2/.git/HEAD" ] ;;\n'
            "esac",
        )
        # NasTech Agent's setup-nastech.sh today: no venv, the launcher in the checkout's .nastech/bin.
        executable(
            tmp_path / "setup-nastech.sh",
            'echo setup-nastech.sh >>"$CALLS"\n'
            "mkdir -p nastech_cli/subcommands && : >nastech_cli/subcommands/dashboard.py\n"
            "mkdir -p .nastech/bin && printf '#!/bin/sh\\necho \"nastech $*\" >>\"$CALLS\"\\n' >.nastech/bin/nastech && chmod +x .nastech/bin/nastech",
        )
        self.env = {
            "PATH": f"{bin_dir}:/usr/bin:/bin",
            "WORLD": str(tmp_path),
            "CALLS": str(self.calls),
            "PENDING": str(self.state / "nastech-pending"),
            "HOME_FOR_TEST": str(self.home),
            "PYTHON": sys.executable,
            "CLI": str(ROOT / "linux" / "bin" / "bantu-os"),
            "HOME": str(self.home),
        }

    def checkout(self, executables: list[str]) -> Path:
        """NasTech installed already, by an installer that left these executables in the checkout."""
        (self.agent / "nastech_cli" / "subcommands").mkdir(parents=True)
        (self.agent / "nastech_cli" / "subcommands" / "dashboard.py").write_text("")
        for name in executables:
            executable(self.agent / name, 'echo "nastech $*" >>"$CALLS"')
        return self.agent

    def run(self, call: str) -> subprocess.CompletedProcess:
        quote = shlex.quote
        script = (
            "set -euo pipefail\n"
            f"NASTECH_USER=me STATE={quote(str(self.state))} HOME_DIR={quote(str(self.home))}\n"
            f"PENDING={quote(str(self.state / 'nastech-pending'))} NASTECH_UNIT={quote(str(self.unit))} BRIDGE={quote(str(self.root / 'bridge'))}\n"
            "OFFLINE_WAIT=0 RETRY_WAIT=0\n"
            + functions("step", "online", "note", "nastech_step", "nastech_later", "nastech_phase")
            # firstboot.sh runs as root and becomes the session user through sudo.
            + 'as_user() { HOME="$HOME_DIR" "$@"; }\n'
            + call
            + "\n"
        )
        return subprocess.run(["bash", "-c", script], env=self.env, capture_output=True, text=True, timeout=60, check=False)

    def log(self) -> str:
        return self.calls.read_text()

    def note(self) -> str | None:
        path = self.state / "nastech-pending"
        return path.read_text() if path.exists() else None


def test_a_fresh_install_in_today_s_layout_gets_the_voice_extras_through_nastech_and_setup(tmp_path):
    machine = Machine(tmp_path)
    result = machine.run("nastech_step")
    assert result.returncode == 0, result.stderr
    log = machine.log()
    assert f"git clone --filter=blob:none https://github.com/nastechresearch/nastech-agent {machine.agent}" in log and "setup-nastech.sh" in log
    assert "nastech pm install --extra voice --extra edge-tts --extra wake-openwakeword" in log
    assert "uv pip" not in log and "bantu-os setup --yes" in log


def test_an_earlier_installer_s_venv_still_gets_its_voice_extras_through_uv(tmp_path):
    machine = Machine(tmp_path)
    agent = machine.checkout(["venv/bin/python", "venv/bin/nastech"])
    result = machine.run("nastech_step")
    assert result.returncode == 0, result.stderr
    assert f"already installed: {agent}/venv/bin/nastech" in result.stdout
    log = machine.log()
    assert "git clone" not in log and "uv pip install --python venv/bin/python -q -e .[voice,edge-tts,wake-openwakeword]" in log
    assert "bantu-os setup --yes" in log


def test_today_s_launcher_wins_over_the_venv_an_update_left_behind(tmp_path):
    machine = Machine(tmp_path)
    machine.checkout(["venv/bin/python", "venv/bin/nastech", ".nastech/bin/nastech"])
    assert machine.run("nastech_step").returncode == 0
    log = machine.log()
    assert "nastech pm install --extra voice" in log and "uv pip" not in log


def test_a_nastech_from_another_installer_is_set_up_and_not_installed_again(tmp_path):
    machine = Machine(tmp_path)
    executable(machine.home / ".local" / "bin" / "nastech", 'echo "nastech $*" >>"$CALLS"')
    result = machine.run("nastech_step")
    assert result.returncode == 0, result.stderr
    assert "came from another installer" in result.stdout and "voice extras failed" not in result.stdout
    log = machine.log()
    assert "git clone" not in log and "pm install" not in log and "uv pip" not in log
    assert "bantu-os setup --yes" in log


def test_a_clone_the_network_cut_off_starts_over(tmp_path):
    machine = Machine(tmp_path)
    (machine.agent / ".git").mkdir(parents=True)
    (machine.agent / "half-a-pack").write_text("")
    assert machine.run("nastech_step").returncode == 0
    assert "git clone" in machine.log() and not (machine.agent / "half-a-pack").exists()


def test_offline_the_first_boot_leaves_nastech_to_the_service_and_says_so(tmp_path):
    machine = Machine(tmp_path, offline=99, failed_clones=99)
    machine.unit.write_text("")
    result = machine.run("nastech_step || nastech_later")
    assert result.returncode == 0, result.stderr
    assert machine.note() == "offline\n"
    assert "bantu-os-nastech.service installs it once this computer is online, and Bantu OS starts it then" in result.stdout
    assert "bantu-os setup" not in machine.log()


def test_the_development_vm_has_no_service_so_it_says_how_to_finish(tmp_path):
    machine = Machine(tmp_path, offline=99, failed_clones=99)
    result = machine.run("nastech_step || nastech_later")
    assert result.returncode == 0, result.stderr
    assert machine.note() is None and "nastech as root once this computer is online" in result.stdout


def test_the_service_waits_for_the_network_tries_again_and_clears_the_note(tmp_path):
    machine = Machine(tmp_path, offline=3, failed_clones=1)
    (machine.state / "nastech-pending").write_text("offline\n")
    result = machine.run("nastech_phase")
    assert result.returncode == 0, result.stderr
    assert machine.note() is None
    log = machine.log()
    # It waited for the network saying so, then after the failed install saying it would try again.
    assert log.index("sleep 0: offline") < log.index("git clone") < log.index("sleep 0: retrying")
    assert log.count("git clone") == 2 and log.count("bantu-os setup --yes") == 1
    assert "waiting for the network" in result.stdout and "trying again in 0 minutes" in result.stdout


def test_the_note_is_one_path_for_firstboot_the_service_the_cli_and_the_shell():
    unit = (ROOT / "linux" / "image" / "bantu-os-nastech.service").read_text()
    script = FIRSTBOOT.read_text()
    assert f"ConditionPathExists={PENDING}" in unit and "ExecStart=/usr/libexec/bantu-os/firstboot.sh nastech" in unit
    assert "STATE=/var/lib/bantu-os" in script and 'PENDING="$STATE/nastech-pending"' in script
    assert "NASTECH_UNIT=/usr/lib/systemd/system/bantu-os-nastech.service" in script
    assert f'NASTECH_PENDING = Path("{PENDING}")' in (ROOT / "linux" / "bin" / "bantu-os").read_text()
    assert f"NASTECH_PENDING = '{PENDING}'" in (ROOT / "apps" / "desktop" / "electron" / "backend" / "resolve.ts").read_text()
    packages = (ROOT / "linux" / "image" / "packages.sh").read_text()
    assert "/usr/lib/systemd/system/bantu-os-nastech.service" in packages
    assert re.search(r"^  systemctl enable .*bantu-os-nastech\.service", packages, re.M)
    assert '"$STATE/nastech-pending"' in (ROOT / "linux" / "image" / "reset-helper").read_text()
