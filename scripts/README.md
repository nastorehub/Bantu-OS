# scripts/

Run these from the repository root; the common ones have npm aliases.

| Script | npm alias | What it does |
| --- | --- | --- |
| `bootstrap.sh` | `npm run bootstrap` | One-time setup, safe to re-run after every pull: fetches the upstream snapshot, installs npm packages, links and enables the bridge plugin in your NasTech install, migrates settings from the pre-rename NasTech OS, checks voice prerequisites |
| `sync-upstream.sh` | `npm run sync-upstream` | Downloads the NasTech Agent commit pinned in `upstream/UPSTREAM.lock` into `upstream/nastech-agent/` |
| `test-bridge.sh` | `npm run test:bridge` | Runs the bridge plugin's pytest suite |
| `check-secrets.sh` | | Scans the working tree and the whole git history for committed credentials with gitleaks |
| `migrate-nastech-config.py` | | Renames the plugin, toolset and saved approvals in `~/.nastech/config.yaml` from NasTech OS to Herald OS (bootstrap runs it) |
| `make-icons.py` | | Regenerates the app, favicon and boot-splash icons from the master Herald mark (needs Pillow; macOS for the `.icns`) |
