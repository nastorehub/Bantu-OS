import { describe, expect, it } from 'vitest'
import { migrateLegacyStorage } from './legacy-storage.ts'

function memoryStorage(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries))

  return {
    data,
    get length() {
      return data.size
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key)
  }
}

describe('migrateLegacyStorage', () => {
  it('moves nastech-os. keys to bantu-os. and leaves other keys alone', () => {
    const storage = memoryStorage({ 'nastech-os.panels': '{"today":true}', 'nastech-os.a11y.text-size': 'large', other: '1' })

    expect(migrateLegacyStorage(storage)).toBe(2)
    expect(Object.fromEntries(storage.data)).toEqual({ other: '1', 'bantu-os.panels': '{"today":true}', 'bantu-os.a11y.text-size': 'large' })
  })

  it('keeps a value already saved under the new name', () => {
    const storage = memoryStorage({ 'nastech-os.panels': 'old', 'bantu-os.panels': 'new' })

    migrateLegacyStorage(storage)

    expect(Object.fromEntries(storage.data)).toEqual({ 'bantu-os.panels': 'new' })
  })

  it('does nothing when there is nothing to move', () => {
    expect(migrateLegacyStorage(memoryStorage({ 'bantu-os.panels': 'x' }))).toBe(0)
  })
})
