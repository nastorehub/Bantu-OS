import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { BackendRuntime } from '../../shared/ipc.ts'
import { osEnv } from '../env.ts'
import { nastechHome } from '../paths.ts'

const isExecutable = (file: string): boolean => {
  try {
    fs.accessSync(file, fs.constants.X_OK)

    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

/**
 * A source checkout is usable only with the `serve` subcommand and an install of it, in either layout
 * NasTech Agent's installers leave:
 *   - `.nastech/bin/nastech`, the launcher today's installers publish (it runs the Python and the
 *     dependencies NasTech keeps in $NASTECH_HOME/tools and $NASTECH_HOME/installs);
 *   - `venv/bin/python`, the virtualenv earlier installers made inside the checkout.
 * The launcher wins: an update to the new layout leaves the old venv behind, unused. `bantu-os`
 * (linux/bin/bantu-os, `nastech_install`) looks for NasTech the same way.
 */
export function checkoutRuntime(root: string, kind: BackendRuntime['kind'], label: string): BackendRuntime | null {
  if (!fs.existsSync(path.join(root, 'nastech_cli', 'subcommands', 'dashboard.py'))) {
    return null
  }

  const launcher = path.join(root, '.nastech', 'bin', process.platform === 'win32' ? 'nastech.exe' : 'nastech')

  if (isExecutable(launcher)) {
    return { kind, label, root, command: [launcher] }
  }

  const python = path.join(root, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

  return isExecutable(python) ? { kind, label, root, command: [python, '-m', 'nastech_cli.main'] } : null
}

export function pathRuntime(extraDirs: string[]): BackendRuntime | null {
  const dirs = [...(process.env.PATH ?? '').split(path.delimiter), ...extraDirs].filter(Boolean)

  for (const dir of dirs) {
    const candidate = path.join(dir, process.platform === 'win32' ? 'nastech.exe' : 'nastech')

    if (isExecutable(candidate)) {
      return { kind: 'path', label: `nastech on PATH (${candidate})`, command: [candidate] }
    }
  }

  return null
}

/**
 * On the Bantu OS image, firstboot.sh's note that NasTech Agent is not installed yet because the first
 * start had no network: one word for what bantu-os-nastech.service is doing about it (offline,
 * installing, retrying). While it is there the shell waits, rather than start a NasTech that is still
 * being installed and set up.
 */
export const NASTECH_PENDING = '/var/lib/bantu-os/nastech-pending'

export function pendingInstall(file = NASTECH_PENDING): string | null {
  try {
    return fs.readFileSync(file, 'utf8').trim() || 'pending'
  } catch {
    return null
  }
}

/**
 * Ordered ladder. Each rung is validated before it is trusted; a failed read falls to the next.
 *   1. BANTU_OS_NASTECH_ROOT (explicit developer override)
 *   2. $NASTECH_HOME/nastech-agent managed install, in either layout (what the official installer and
 *      `nastech update` maintain)
 *   3. `nastech` shim on PATH (+ the usual user bin dirs a GUI app does not inherit)
 */
export function resolveBackendRuntime(): BackendRuntime | null {
  const envRoot = osEnv('NASTECH_ROOT')?.trim()

  if (envRoot) {
    const runtime = checkoutRuntime(envRoot, 'env', `BANTU_OS_NASTECH_ROOT (${envRoot})`)

    if (runtime) {
      return runtime
    }
  }

  const managed = checkoutRuntime(path.join(nastechHome(), 'nastech-agent'), 'managed', 'managed NasTech install')

  if (managed) {
    return managed
  }

  return pathRuntime([path.join(os.homedir(), '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin'])
}
