# bantu-os-bridge

The NasTech plugin that lets NasTech act on the computer and drive the Bantu OS interface. It is a
regular out-of-tree plugin: NasTech loads it from `$NASTECH_HOME/plugins/bantu-os-bridge`, a link
`npm run bootstrap` creates to this folder. Nothing in the NasTech core is patched.

Tools, permission tiers, protected paths, the policy file and the audit log are documented in
[docs/SYSTEM-BRIDGE.md](../../docs/SYSTEM-BRIDGE.md).

```
__init__.py          register(): the `bantu_os` toolset and the bundled skills (SKILLS)
plugin.yaml          manifest: name, version, tools, supported platforms
bridge/
  tools.py           tool schemas and handlers (TOOL_SPECS)
  scope.py           where the tools are offered and run: Bantu OS sessions only
  permissions.py     tiers, protected paths, the approval gate
  audit.py           one JSON line per call in $NASTECH_HOME/bantu-os/audit.jsonl
  crash.py           crash report summaries for system_logs (macOS .ips, Linux core dumps)
  documents.py       system_documents: invoice hints, suggested names, scan pictures, filing places
  ui.py              client for the shell's control socket (the `os_ui`, `canvas`, `docs`, `sheets` and `slides` tools)
  util.py            shared helpers (data folder, BANTU_OS_* settings)
  host/              HostAdapter per OS: darwin.py, linux.py, posix.py, windows.py (stub)
skills/
  bantu-os/         when to use these tools
  diagnose-crash/    how to explain a crash from its report
  file-documents/    how to find, read, rename and file documents such as invoices, with undo
  bantu-os-tailor/  how to change Bantu OS itself: themes, fonts, keybindings, settings
  bantu-canvas/     how to make and edit pictures with the canvas tool: workflow, design habits, .comp format
  bantu-docs/       how to write and edit documents with the docs tool: drafts, marked text, formatting, pages, comments and reviews, saving
  bantu-sheets/     how to work in spreadsheets with the sheets tool: formulas, cleaning data, charts, summaries, building workbooks
  bantu-slides/     how to make presentations with the slides tool: outlines, layouts, the master, themes, transitions, diagrams, speaker notes
tests/               pytest suite: `npm run test:bridge` from the repository root
```

## Enabling it by hand

`npm run bootstrap` does all of this. Without it:

```bash
ln -s "$PWD/plugins/bantu-os-bridge" ~/.nastech/plugins/bantu-os-bridge
nastech plugins enable bantu-os-bridge
nastech tools enable bantu_os
```

To switch the tools off without uninstalling, set `bantu_os.bridge.enabled: false` in
`~/.nastech/config.yaml`, or `BANTU_OS_BRIDGE_DISABLED=1` in the backend's environment for one run.

To take it all back, `bantu-os setup --undo` on Linux; elsewhere the steps, and the list of what
Bantu OS changes in NasTech, are in
[docs/SYSTEM-BRIDGE.md](../../docs/SYSTEM-BRIDGE.md#what-bantu-os-changes-in-your-nastech).
