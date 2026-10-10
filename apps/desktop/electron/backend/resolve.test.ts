import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkoutRuntime, pathRuntime, pendingInstall, resolveBackendRuntime } from './resolve.ts'

let dir: string

function write(file: string, text: string, mode = 0o644): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text, { mode })
}

/** A NasTech Agent checkout with its `serve` subcommand and these executables (paths in the checkout). */
function checkout(root: string, executables: string[]): string {
  write(path.join(root, 'nastech_cli', 'subcommands', 'dashboard.py'), '')

  for (const file of executables) {
    write(path.join(root, file), '#!/bin/sh\n', 0o755)
  }

  return root
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'herald-resolve-'))
  vi.stubEnv('NASTECH_HOME', path.join(dir, '.nastech'))
  vi.stubEnv('PATH', path.join(dir, 'empty'))
  vi.stubEnv('HERALD_OS_NASTECH_ROOT', undefined)
  vi.stubEnv('NASTECH_OS_NASTECH_ROOT', undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('checkoutRuntime', () => {
  it("runs the launcher today's installers publish", () => {
    const root = checkout(path.join(dir, 'agent'), ['.nastech/bin/nastech'])

    expect(checkoutRuntime(root, 'managed', 'managed NasTech install')).toEqual({ kind: 'managed', label: 'managed NasTech install', root, command: [path.join(root, '.nastech', 'bin', 'nastech')] })
  })

  it("runs an earlier installer's venv", () => {
    const root = checkout(path.join(dir, 'agent'), ['venv/bin/python'])

    expect(checkoutRuntime(root, 'env', 'override')?.command).toEqual([path.join(root, 'venv', 'bin', 'python'), '-m', 'nastech_cli.main'])
  })

  it('prefers the launcher when an update left the old venv behind', () => {
    const root = checkout(path.join(dir, 'agent'), ['venv/bin/python', '.nastech/bin/nastech'])

    expect(checkoutRuntime(root, 'managed', 'managed NasTech install')?.command).toEqual([path.join(root, '.nastech', 'bin', 'nastech')])
  })

  it('needs the serve subcommand and something that runs', () => {
    const bare = path.join(dir, 'bare')
    write(path.join(bare, '.nastech', 'bin', 'nastech'), '#!/bin/sh\n', 0o755)
    expect(checkoutRuntime(bare, 'managed', 'x')).toBeNull()

    const cloned = checkout(path.join(dir, 'cloned'), [])
    expect(checkoutRuntime(cloned, 'managed', 'x')).toBeNull()

    // A launcher that cannot run is no launcher; the venv beside it still counts.
    write(path.join(cloned, '.nastech', 'bin', 'nastech'), '#!/bin/sh\n', 0o644)
    expect(checkoutRuntime(cloned, 'managed', 'x')).toBeNull()
    write(path.join(cloned, 'venv', 'bin', 'python'), '#!/bin/sh\n', 0o755)
    expect(checkoutRuntime(cloned, 'managed', 'x')?.command[0]).toBe(path.join(cloned, 'venv', 'bin', 'python'))
  })
})

describe('resolveBackendRuntime', () => {
  it('finds the managed install in either layout', () => {
    const managed = path.join(dir, '.nastech', 'nastech-agent')
    checkout(managed, ['.nastech/bin/nastech'])

    expect(resolveBackendRuntime()).toMatchObject({ kind: 'managed', root: managed, command: [path.join(managed, '.nastech', 'bin', 'nastech')] })

    fs.rmSync(path.join(managed, '.nastech'), { recursive: true })
    checkout(managed, ['venv/bin/python'])
    expect(resolveBackendRuntime()).toMatchObject({ kind: 'managed', command: [path.join(managed, 'venv', 'bin', 'python'), '-m', 'nastech_cli.main'] })
  })

  it('puts HERALD_OS_NASTECH_ROOT first', () => {
    checkout(path.join(dir, '.nastech', 'nastech-agent'), ['.nastech/bin/nastech'])
    const own = checkout(path.join(dir, 'own'), ['.nastech/bin/nastech'])
    vi.stubEnv('HERALD_OS_NASTECH_ROOT', own)

    expect(resolveBackendRuntime()).toMatchObject({ kind: 'env', root: own })
  })
})

describe('pathRuntime', () => {
  it("finds the installer's ~/.local/bin command when PATH does not name it", () => {
    const bin = path.join(dir, '.local', 'bin')
    write(path.join(bin, 'nastech'), '#!/bin/sh\nexec /home/a/.nastech/nastech-agent/.nastech/bin/nastech "$@"\n', 0o755)

    expect(pathRuntime([])).toBeNull()
    expect(pathRuntime([bin])).toEqual({ kind: 'path', label: `nastech on PATH (${path.join(bin, 'nastech')})`, command: [path.join(bin, 'nastech')] })
  })
})

describe('pendingInstall', () => {
  it("reads the image's note on installing NasTech", () => {
    const note = path.join(dir, 'nastech-pending')
    expect(pendingInstall(note)).toBeNull()

    write(note, 'offline\n')
    expect(pendingInstall(note)).toBe('offline')

    write(note, '')
    expect(pendingInstall(note)).toBe('pending')
  })
})
