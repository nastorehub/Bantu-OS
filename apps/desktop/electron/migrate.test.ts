import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { migrateLegacyData } from './migrate.ts'

let root = ''

function write(rel: string, text = 'x'): void {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
  fs.writeFileSync(path.join(root, rel), text)
}

function read(rel: string): string | null {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8')
  } catch {
    return null
  }
}

function locations() {
  return { nastechHome: path.join(root, '.nastech'), appData: path.join(root, 'appData'), userData: path.join(root, 'appData', 'Herald OS') }
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'herald-migrate-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('migrateLegacyData', () => {
  it('moves the NasTech home folder, the profile and its web partitions', () => {
    write('.nastech/nastech-os/prefs.json', '{"theme":"ice"}')
    write('.nastech/nastech-os/permissions.yaml', 'tiers: {}')
    write('appData/NasTech OS/Local Storage/leveldb/000003.log', 'ls')
    write('appData/NasTech OS/Partitions/nastech-web/Cookies', 'cookies')
    write('appData/NasTech OS/Partitions/nastech-preview/Cookies', 'preview')

    const moved = migrateLegacyData(locations())

    expect(moved.some(line => line.startsWith('failed'))).toBe(false)
    expect(read('.nastech/herald-os/prefs.json')).toBe('{"theme":"ice"}')
    expect(read('.nastech/herald-os/permissions.yaml')).toBe('tiers: {}')
    expect(fs.existsSync(path.join(root, '.nastech/nastech-os'))).toBe(false)
    expect(read('appData/Herald OS/Local Storage/leveldb/000003.log')).toBe('ls')
    expect(read('appData/Herald OS/Partitions/herald-web/Cookies')).toBe('cookies')
    expect(read('appData/Herald OS/Partitions/herald-preview/Cookies')).toBe('preview')
  })

  it('merges into a folder another process already created, keeping its files', () => {
    write('.nastech/nastech-os/permissions.yaml', 'custom policy')
    write('.nastech/nastech-os/audit.jsonl', 'old audit')
    write('.nastech/herald-os/audit.jsonl', 'new audit')

    migrateLegacyData(locations())

    expect(read('.nastech/herald-os/permissions.yaml')).toBe('custom policy')
    expect(read('.nastech/herald-os/audit.jsonl')).toBe('new audit')
    expect(read('.nastech/nastech-os/audit.jsonl')).toBe('old audit')
  })

  it('moves the profile into the empty folder Electron creates when asked for userData', () => {
    write('appData/NasTech OS/Local Storage/leveldb/000003.log', 'ls')
    fs.mkdirSync(path.join(root, 'appData/Herald OS'), { recursive: true })

    migrateLegacyData(locations())

    expect(read('appData/Herald OS/Local Storage/leveldb/000003.log')).toBe('ls')
    expect(fs.existsSync(path.join(root, 'appData/NasTech OS'))).toBe(false)
  })

  it('never replaces an existing profile', () => {
    write('appData/NasTech OS/Preferences', 'old')
    write('appData/Herald OS/Preferences', 'new')

    migrateLegacyData(locations())

    expect(read('appData/Herald OS/Preferences')).toBe('new')
    expect(read('appData/NasTech OS/Preferences')).toBe('old')
  })

  it('is a no-op on a fresh install and when run twice', () => {
    expect(migrateLegacyData(locations())).toEqual([])
    write('.nastech/nastech-os/prefs.json')
    expect(migrateLegacyData(locations())).toHaveLength(1)
    expect(migrateLegacyData(locations())).toEqual([])
  })
})
