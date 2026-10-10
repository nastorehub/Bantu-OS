import { describe, expect, it } from 'vitest'
import { osEnv } from './env.ts'

describe('osEnv', () => {
  it('reads the BANTU_OS_ name', () => {
    expect(osEnv('WINDOWED', { BANTU_OS_WINDOWED: '1' })).toBe('1')
  })

  it('falls back to the pre-rename NASTECH_OS_ name', () => {
    expect(osEnv('ZOOM', { NASTECH_OS_ZOOM: '1.5' })).toBe('1.5')
  })

  it('prefers the new name when both are set', () => {
    expect(osEnv('SHELL_MODE', { BANTU_OS_SHELL_MODE: 'panels', NASTECH_OS_SHELL_MODE: 'desktop' })).toBe('panels')
  })

  it('is undefined when neither is set', () => {
    expect(osEnv('KIOSK', {})).toBeUndefined()
  })
})
