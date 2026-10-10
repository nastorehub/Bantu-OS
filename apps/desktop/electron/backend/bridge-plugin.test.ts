import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { bridgeLinkPlan, ensureBridgePlugin, failureReason } from './bridge-plugin.ts'

const bundled = '/Applications/Bantu OS.app/Contents/Resources/bantu-os-bridge'

describe('bridgeLinkPlan', () => {
  it('links a missing plugin and keeps what the person set up', () => {
    expect(bridgeLinkPlan({ kind: 'missing' }, bundled)).toBe('create')
    expect(bridgeLinkPlan({ kind: 'folder' }, bundled)).toBe('keep')
    expect(bridgeLinkPlan({ kind: 'link', target: bundled, exists: true }, bundled)).toBe('keep')
    // A checkout's link, from npm run bootstrap.
    expect(bridgeLinkPlan({ kind: 'link', target: '/Users/sam/Bantu-OS/plugins/bantu-os-bridge', exists: true }, bundled)).toBe('keep')
  })

  it('moves a link that leads nowhere or into another copy of the app', () => {
    expect(bridgeLinkPlan({ kind: 'link', target: '/Users/sam/old/plugins/bantu-os-bridge', exists: false }, bundled)).toBe('replace')
    const translocated = '/private/var/folders/x/AppTranslocation/1/d/Bantu OS.app/Contents/Resources/bantu-os-bridge'
    expect(bridgeLinkPlan({ kind: 'link', target: translocated, exists: true }, bundled)).toBe('replace')
  })
})

describe('failureReason', () => {
  it("keeps NasTech's ✗ lines and drops its warnings", () => {
    const warning = '⚠ install out of sync (ffmpeg: not installed or outdated) — run `nastech pm install`'
    expect(failureReason(`${warning}\n✗ Unknown toolset 'bantu_os'`)).toBe("✗ Unknown toolset 'bantu_os'")
    // A wrapped message without a ✗ line reads as one sentence.
    expect(failureReason(`${warning}\nNo plugin named 'bantu-os-bridge'. Run \`nastech plugins list\`\nto see the exact names.`)).toBe("No plugin named 'bantu-os-bridge'. Run `nastech plugins list` to see the exact names.")
  })
})

describe('ensureBridgePlugin', () => {
  const saved = process.env.NASTECH_HOME
  let root = ''

  afterEach(() => {
    process.env.NASTECH_HOME = saved
    fs.rmSync(root, { recursive: true, force: true })
  })

  /** An app bundle, a NasTech home, and a `nastech` that logs its arguments and answers `config get` with `toolSearch`. */
  function setUp(script = '', toolSearch = 'auto') {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-'))
    const resources = path.join(root, 'Bantu OS.app', 'Contents', 'Resources')
    fs.mkdirSync(path.join(resources, 'bantu-os-bridge'), { recursive: true })
    fs.writeFileSync(path.join(resources, 'bantu-os-bridge', 'plugin.yaml'), 'name: bantu-os-bridge\n')
    process.env.NASTECH_HOME = path.join(root, 'nastech')
    const calls = path.join(root, 'calls.txt')
    const body = `echo "$*" >> '${calls}'; ${script} [ "$1 $2" = "config get" ] && echo '${toolSearch}'; exit 0`
    const runtime = { kind: 'path' as const, label: 'test', command: ['/bin/sh', '-c', body, 'nastech'] }
    const bantu = (name: string) => path.join(root, 'nastech', 'bantu-os', name)

    return { resources, runtime, calls: () => fs.readFileSync(calls, 'utf8').trim().split('\n'), bantu }
  }

  it("links the app's copy into the NasTech home, enables it once and keeps Tool Search's value", async () => {
    const { resources, runtime, calls, bantu } = setUp()

    expect(await ensureBridgePlugin(runtime, resources)).toBeNull()
    const link = path.join(root, 'nastech', 'plugins', 'bantu-os-bridge')
    expect(fs.readlinkSync(link)).toBe(path.join(resources, 'bantu-os-bridge'))
    expect(calls()).toEqual(['plugins enable bantu-os-bridge', 'tools enable bantu_os', 'config get tools.tool_search.enabled', 'config set tools.tool_search.enabled off'])
    expect(fs.readFileSync(bantu('tool-search-before'), 'utf8')).toBe('auto\n')

    // Already linked: nothing to do, and NasTech is not asked again.
    await ensureBridgePlugin(runtime, resources)
    expect(calls()).toHaveLength(4)
  })

  it('leaves Tool Search alone when it is off already and keeps the first value it found', async () => {
    const { resources, runtime, calls, bantu } = setUp('', 'off')
    fs.mkdirSync(path.dirname(bantu('tool-search-before')), { recursive: true })
    fs.writeFileSync(bantu('tool-search-before'), 'on\n')

    expect(await ensureBridgePlugin(runtime, resources)).toBeNull()
    expect(calls()).not.toContain('config set tools.tool_search.enabled off')
    expect(fs.readFileSync(bantu('tool-search-before'), 'utf8')).toBe('on\n')
  })

  it('stops at a failed step, says why, and tries again on the next start', async () => {
    const { resources, runtime, calls, bantu } = setUp('exit 1;')

    expect(await ensureBridgePlugin(runtime, resources)).toMatch(/^nastech plugins enable bantu-os-bridge failed/)
    await ensureBridgePlugin(runtime, resources)
    expect(calls()).toEqual(['plugins enable bantu-os-bridge', 'plugins enable bantu-os-bridge'])
    expect(fs.existsSync(bantu('bridge-enabled'))).toBe(false)
  })

  it('counts a ✗ line as a failure even when nastech exits 0', async () => {
    const { resources, runtime, calls, bantu } = setUp(`[ "$1" = tools ] && echo "✗ Unknown toolset 'bantu_os'";`)

    expect(await ensureBridgePlugin(runtime, resources)).toContain("Unknown toolset 'bantu_os'")
    expect(calls()).toEqual(['plugins enable bantu-os-bridge', 'tools enable bantu_os'])
    expect(fs.existsSync(bantu('tool-search-before'))).toBe(false)
    expect(fs.existsSync(bantu('bridge-enabled'))).toBe(false)
  })

  it('leaves a link the person removed after setup removed', async () => {
    const { resources, runtime, calls, bantu } = setUp()
    await ensureBridgePlugin(runtime, resources)
    const link = path.join(root, 'nastech', 'plugins', 'bantu-os-bridge')
    fs.rmSync(link)

    expect(await ensureBridgePlugin(runtime, resources)).toBeNull()
    expect(fs.existsSync(link)).toBe(false)
    expect(calls()).toHaveLength(4)
    expect(fs.existsSync(bantu('bridge-enabled'))).toBe(true)
  })

  it('does nothing without a bundled copy (development)', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-'))
    process.env.NASTECH_HOME = path.join(root, 'nastech')
    expect(await ensureBridgePlugin({ kind: 'path', label: 'test', command: ['false'] }, path.join(root, 'none'))).toBeNull()
    expect(fs.existsSync(path.join(root, 'nastech', 'plugins'))).toBe(false)
  })
})
