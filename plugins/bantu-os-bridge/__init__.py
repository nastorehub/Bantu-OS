"""Bantu OS system bridge.

Registers the ``bantu_os`` toolset: a narrow set of explicit, permission-tiered tools that let
NasTech act on the computer it is running on. Execution goes through a per-platform
``HostAdapter`` (macOS and Linux implemented; Windows is a typed stub), permissions through
``bridge.permissions`` (tiers, protected paths, the upstream approval gate), and every call is
recorded by ``bridge.audit``. ``system_os`` (registered from the same ``TOOL_SPECS`` table) drives
Bantu OS Linux's ``bantu-os`` CLI and answers with a clear failure on other platforms. The tools
are offered and run only in Bantu OS's own sessions (``bridge.scope``).

Out-of-tree by design: the plugin uses only public plugin APIs (``register``,
``ctx.register_tool``, ``ctx.register_skill``, ``tools.approval.request_tool_approval``) and the
session variables NasTech binds for tools (``gateway.session_context.get_session_env``) so Bantu
OS never patches the NasTech core.
"""

from __future__ import annotations

from pathlib import Path

from .bridge import scope as _scope
from .bridge import tools as _tools
from .bridge.host import host_available

_SKILLS_DIR = Path(__file__).parent / "skills"
# Skill name -> one-line description for the skills index.
SKILLS: dict[str, str] = {
    "bantu-os": "How NasTech acts as the operating environment on this computer.",
    "diagnose-crash": "Explain why a program crashed from its crash report or core dump, and whether it is worth reporting.",
    "file-documents": "Find documents such as invoices and receipts among badly named files, read them (OCR for scans), name them clearly and file them where the person keeps them, with a plan they approve and an undo.",
    "bantu-os-tailor": "Change Bantu OS itself: Bantu OS widgets (menu bar, Overview, their own window), themes, fonts, the wallpaper, the menu bar, control-menu entries, branding, keybindings, settings and routines.",
    "bantu-canvas": "Make and edit pictures in Bantu Canvas: posters, banners, collages, photo fixes; the canvas tool, design habits, the .comp format and every adjustment setting.",
    "bantu-docs": "Write and edit documents in Bantu Docs: drafts from a brief, templates, rewriting marked text, formatting, tables, pictures, headers and footers, page numbers, notes, sections, comments and reviews, tables of contents, statistics, a sheet's figures in a report, saving and PDFs.",
    "bantu-sheets": "Work in Bantu Sheets: formulas from a description, explaining formulas, filling a column from examples, cleaning data, charts, summaries of tables, named ranges, validation and dropdown lists, comments and notes, what stands out, building a workbook, sorting, filtering, saving.",
    "bantu-slides": "Make and change presentations in Bantu Slides: a deck from a topic, a document or a sheet, layouts, the slide master (a logo, slide numbers, footers, placeholders, backgrounds), themes and custom themes, transitions, gradients, flowcharts with connectors and groups, table borders, speaker notes, pictures, tables, reordering, saving and PDFs.",
}


def _check_available() -> bool:
    """What the model sees: the host adapter must exist for this platform, the bridge must not be
    disabled in config, and the session must be Bantu OS's own."""
    return host_available() and _tools.bridge_enabled() and _scope.offered()


def register(ctx) -> None:
    try:
        from tools.registry import no_cache_check_fn
    except ImportError:  # Older runtimes cache the verdict for 30 seconds, across sessions.
        pass
    else:
        no_cache_check_fn(_check_available)
    for spec in _tools.TOOL_SPECS:
        ctx.register_tool(
            name=spec.name,
            toolset="bantu_os",
            schema=spec.schema,
            handler=_scope.bantu_only(spec.name, spec.handler, _tools.bridge_enabled),
            check_fn=_check_available,
            emoji=spec.emoji,
            description=spec.schema["description"],
        )
    if not hasattr(ctx, "register_skill"):
        return
    for name, description in SKILLS.items():
        skill_md = _SKILLS_DIR / name / "SKILL.md"
        if skill_md.exists():
            ctx.register_skill(name, skill_md, description=description)
