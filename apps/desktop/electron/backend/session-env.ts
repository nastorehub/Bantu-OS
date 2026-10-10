/**
 * Variables that tie a process to a NasTech session, or to a Bantu OS backend. NasTech passes a turn's
 * NASTECH_SESSION_* on to every command the turn runs, and a process that binds no session of its own
 * (the `nastech` CLI) takes them as its own: a Bantu OS started by such a command would hand that
 * session, and the backend's BANTU_OS markers, to its backend and to every terminal and app it opens.
 * The names are NasTech's session context (gateway/session_context.py) and its per-run markers.
 */
const INHERITED = /^(NASTECH_SESSION_|NASTECH_CRON_AUTO_DELIVER_|NASTECH_BROWSER_CONTROL_)|^(NASTECH_UI_SESSION_ID|NASTECH_CRON_SESSION|NASTECH_SINGLE_QUERY_SESSION|NASTECH_KANBAN_TASK|BANTU_OS|BANTU_OS_CONTROL_SOCKET|BANTU_OS_CONTROL_TOKEN)$/

export function isInheritedSessionVariable(name: string): boolean {
  return INHERITED.test(name)
}

/** `env` without a session or backend identity it inherited. */
export function withoutInheritedSession(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !INHERITED.test(name)))
}

/** Removes them from this process's own environment, which everything it starts inherits; returns their names. */
export function forgetInheritedSession(env: NodeJS.ProcessEnv = process.env): string[] {
  const names = Object.keys(env).filter(name => INHERITED.test(name))

  for (const name of names) {
    delete env[name]
  }

  return names
}
