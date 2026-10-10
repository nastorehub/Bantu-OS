import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackendRuntime } from '../../shared/ipc.ts'

const found = vi.hoisted(() => ({ runtime: null as BackendRuntime | null, install: null as string | null }))

vi.mock('./resolve.ts', () => ({ resolveBackendRuntime: () => found.runtime, pendingInstall: () => found.install }))
vi.mock('./bridge-plugin.ts', () => ({ ensureBridgePlugin: async () => null }))
vi.mock('./shell-env.ts', () => ({ loginShellPath: async () => process.env.PATH ?? '' }))
vi.mock('../log.ts', () => ({ log: () => undefined }))

import { BackendManager, WAIT_POLL_MS, waitingReason } from './manager.ts'

let dir: string
let manager: BackendManager

/** A NasTech whose `serve` exits at once, so a start gets as far as spawning it and no further. */
const installed = (): BackendRuntime => ({ kind: 'managed', label: 'managed NasTech install', root: dir, command: [process.execPath, '-e', 'process.exit(3)'] })

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bantu-manager-'))
  vi.stubEnv('NASTECH_HOME', dir)
  vi.stubEnv('BANTU_OS_BACKEND_URL', undefined)
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  found.runtime = null
  found.install = null
  manager = new BackendManager()
})

afterEach(async () => {
  await manager.stop()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('BackendManager without a NasTech to start', () => {
  it('waits, then starts the NasTech that gets installed', async () => {
    await manager.start()
    expect(manager.getState()).toMatchObject({ phase: 'waiting', error: waitingReason(null) })

    vi.advanceTimersByTime(WAIT_POLL_MS)
    expect(manager.getState().phase).toBe('waiting')

    found.runtime = installed()
    vi.advanceTimersByTime(WAIT_POLL_MS)
    expect(manager.getState()).toMatchObject({ phase: 'starting', runtime: { label: 'managed NasTech install' } })
    await vi.waitFor(() => expect(manager.getState().phase).toBe('restarting'))
  })

  it("waits for the image's first-boot install even once NasTech is there", async () => {
    found.runtime = installed()
    found.install = 'offline'
    await manager.start()
    expect(manager.getState()).toMatchObject({ phase: 'waiting', install: 'offline', error: waitingReason('offline') })

    found.install = 'installing'
    vi.advanceTimersByTime(WAIT_POLL_MS)
    expect(manager.getState()).toMatchObject({ phase: 'waiting', install: 'installing', error: waitingReason('installing') })

    found.install = null
    vi.advanceTimersByTime(WAIT_POLL_MS)
    expect(manager.getState()).toMatchObject({ phase: 'starting', install: undefined })
    await vi.waitFor(() => expect(manager.getState().phase).toBe('restarting'))
  })

  it('stops waiting when the shell stops it', async () => {
    await manager.start()
    await manager.stop()

    found.runtime = installed()
    vi.advanceTimersByTime(WAIT_POLL_MS * 2)
    expect(manager.getState().phase).toBe('stopped')
  })
})
