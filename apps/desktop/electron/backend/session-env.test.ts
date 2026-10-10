import { describe, expect, it } from 'vitest'
import { serveEnvironment } from './manager.ts'
import { forgetInheritedSession, isInheritedSessionVariable, withoutInheritedSession } from './session-env.ts'

// What a Bantu OS started by a command in a Bantu OS session would inherit: the session NasTech
// passed on, the backend's own markers, and the person's environment.
const LAUNCHED_FROM_A_SESSION: NodeJS.ProcessEnv = {
  NASTECH_SESSION_SOURCE: 'bantu_os',
  NASTECH_SESSION_SOURCE_EXPLICIT: '1',
  NASTECH_SESSION_PLATFORM: 'telegram',
  NASTECH_SESSION_ID: '20261008_101112_abcdef',
  NASTECH_SESSION_KEY: 'agent:main:telegram:dm:42',
  NASTECH_UI_SESSION_ID: 'tab-1',
  NASTECH_CRON_SESSION: '1',
  NASTECH_CRON_AUTO_DELIVER_CHAT_ID: '42',
  NASTECH_BROWSER_CONTROL_PRINCIPAL: 'digest',
  NASTECH_SINGLE_QUERY_SESSION: '1',
  NASTECH_KANBAN_TASK: 't_1',
  BANTU_OS: '1',
  BANTU_OS_CONTROL_SOCKET: '/run/user/1000/bantu-os/os.sock',
  BANTU_OS_CONTROL_TOKEN: 'secret',
  NASTECH_HOME: '/home/me/.nastech',
  NASTECH_DESKTOP: '1',
  NASTECH_PARENT_PID: '1234',
  BANTU_OS_BACKEND_URL: 'http://127.0.0.1:9119',
  BANTU_OS_WINDOWED: '1',
  PATH: '/usr/bin:/bin',
  HOME: '/home/me'
}

const KEPT = ['NASTECH_HOME', 'NASTECH_DESKTOP', 'NASTECH_PARENT_PID', 'BANTU_OS_BACKEND_URL', 'BANTU_OS_WINDOWED', 'PATH', 'HOME']

describe('a session inherited from the environment', () => {
  it('is not passed on, while the rest of the environment is', () => {
    const env = withoutInheritedSession(LAUNCHED_FROM_A_SESSION)

    expect(Object.keys(env).sort()).toEqual([...KEPT].sort())
    expect(env.NASTECH_HOME).toBe('/home/me/.nastech')
  })

  it('covers every NASTECH_SESSION_ variable, current and future', () => {
    expect(isInheritedSessionVariable('NASTECH_SESSION_SOURCE')).toBe(true)
    expect(isInheritedSessionVariable('NASTECH_SESSION_SOMETHING_NEW')).toBe(true)
    expect(isInheritedSessionVariable('NASTECH_SESSION')).toBe(false)
    expect(isInheritedSessionVariable('BANTU_OS_SCALE')).toBe(false)
    expect(isInheritedSessionVariable('XNASTECH_SESSION_SOURCE')).toBe(false)
  })

  it('does not reach the backend, which gets its own Bantu OS markers instead', () => {
    const env = serveEnvironment({ ...LAUNCHED_FROM_A_SESSION, ELECTRON_RUN_AS_NODE: '1' }, { BANTU_OS: '1', NASTECH_PARENT_PID: '99', NASTECH_SPAWN: undefined })

    expect(Object.keys(env).filter(name => name.startsWith('NASTECH_SESSION_'))).toEqual([])
    expect(env.NASTECH_UI_SESSION_ID).toBeUndefined()
    expect(env.BANTU_OS_CONTROL_SOCKET).toBeUndefined()
    expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined()
    expect(env.BANTU_OS).toBe('1')
    expect(env.NASTECH_PARENT_PID).toBe('99')
    expect(env.NASTECH_HOME).toBe('/home/me/.nastech')
  })

  it('is dropped from the app’s own environment, so nothing it starts inherits it', () => {
    const env = { ...LAUNCHED_FROM_A_SESSION }
    const dropped = forgetInheritedSession(env)

    expect(dropped).toContain('NASTECH_SESSION_SOURCE')
    expect(dropped).toContain('BANTU_OS')
    expect(Object.keys(env).sort()).toEqual([...KEPT].sort())
    expect(forgetInheritedSession(env)).toEqual([])
  })
})
