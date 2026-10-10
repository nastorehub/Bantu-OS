"""scripts/migrate-nastech-config.py: pre-rename NasTech OS settings carry over to Bantu OS."""

from __future__ import annotations

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "migrate-nastech-config.py"


def _migrate():
    spec = importlib.util.spec_from_file_location("migrate_nastech_config", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.migrate


def test_renames_plugin_toolsets_rules_and_section():
    raw = {
        "plugins": {
            "enabled": ["nastech-weather", "nastech-os-bridge"],
            "entries": {"nastech-os-bridge": {"allow_tool_override": False}},
        },
        "platform_toolsets": {"cli": ["file", "nastech_os", "web"]},
        "known_plugin_toolsets": {"cli": ["a2a", "nastech_os"]},
        "command_allowlist": ["plugin_rule:nastech_os:os_ui:mission.start", "recursive delete"],
        "nastech_os": {"bridge": {"enabled": False}},
    }

    out = _migrate()(raw)

    assert out["plugins"]["enabled"] == ["nastech-weather", "bantu-os-bridge"]
    assert out["plugins"]["entries"] == {"bantu-os-bridge": {"allow_tool_override": False}}
    assert out["platform_toolsets"]["cli"] == ["file", "bantu_os", "web"]
    assert out["known_plugin_toolsets"]["cli"] == ["a2a", "bantu_os"]
    assert out["command_allowlist"] == ["plugin_rule:bantu_os:os_ui:mission.start", "recursive delete"]
    assert out["bantu_os"] == {"bridge": {"enabled": False}}
    assert "nastech_os" not in out
    assert raw["plugins"]["enabled"][1] == "nastech-os-bridge", "the input is not mutated"


def test_dedupes_when_both_names_are_present_and_is_idempotent():
    migrate = _migrate()
    raw = {"plugins": {"enabled": ["nastech-os-bridge", "bantu-os-bridge"]}, "platform_toolsets": {"cli": ["bantu_os", "nastech_os"]}}

    once = migrate(raw)

    assert once["plugins"]["enabled"] == ["bantu-os-bridge"]
    assert once["platform_toolsets"]["cli"] == ["bantu_os"]
    assert migrate(once) == once


def test_leaves_unrelated_configs_alone():
    raw = {"model": {"default": "x"}, "plugins": {"enabled": ["other"]}}

    assert _migrate()(raw) == raw
