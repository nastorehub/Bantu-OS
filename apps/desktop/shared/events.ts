/*
 * Things that happen on this computer that people's own hook scripts and NasTech automations can
 * react to. Main emits them (electron/events/), hooks run from ~/.config/bantu-os/hooks/<name>.d/,
 * and an automation is a paused NasTech cron job Bantu OS fires when its event happens.
 */

export type BantuEventName = 'login' | 'wake' | 'sleep' | 'lock' | 'unlock' | 'returned' | 'battery-low' | 'network-change' | 'theme-set' | 'crash' | 'after-update'

export interface BantuEvent {
  name: BantuEventName
  /** Epoch ms. */
  at: number
  /** Short string facts about it (`app` for a crash, `percent` for low battery). */
  detail: Record<string, string>
}

/** "When this happens, run that automation": the cron job stays paused and Bantu OS fires it. */
export interface EventAutomation {
  event: BantuEventName
  jobId: string
  enabled: boolean
  /** Only when the event's details match, e.g. `{ app: "Safari" }` for crashes (case-insensitive). */
  match?: Record<string, string>
}

export interface EventInfo {
  name: BantuEventName
  /** "When I log in": how an automation reads. */
  label: string
  /** What the event's details are called, for hooks and matches. */
  details: readonly string[]
  /** Offered for automations (a few only make sense for hook scripts). */
  automation: boolean
}

export const BANTU_EVENTS: readonly EventInfo[] = [
  { name: 'login', label: 'When I log in', details: [], automation: true },
  { name: 'wake', label: 'When the computer wakes up', details: [], automation: true },
  { name: 'unlock', label: 'When I unlock the screen', details: [], automation: true },
  { name: 'returned', label: 'When I come back after a break', details: ['reason', 'away_minutes'], automation: true },
  { name: 'battery-low', label: 'When the battery is low', details: ['percent'], automation: true },
  { name: 'network-change', label: 'When the network changes', details: ['online', 'wifi'], automation: true },
  { name: 'crash', label: 'When a program crashes', details: ['app', 'pid', 'reason'], automation: true },
  { name: 'theme-set', label: 'When the theme changes', details: ['theme'], automation: true },
  { name: 'after-update', label: 'After Bantu OS updates', details: [], automation: true },
  { name: 'lock', label: 'When I lock the screen', details: [], automation: false },
  { name: 'sleep', label: 'When the computer goes to sleep', details: [], automation: false }
]

export const BANTU_EVENT_NAMES: readonly BantuEventName[] = BANTU_EVENTS.map(event => event.name)

export function isEventName(value: unknown): value is BantuEventName {
  return typeof value === 'string' && (BANTU_EVENT_NAMES as readonly string[]).includes(value)
}

/**
 * The schedule an event automation's cron job carries. It never fires on it (the job stays
 * paused); NasTech's cron needs some schedule, and a yearly one is harmless if it is ever resumed.
 */
export const EVENT_RULE_SCHEDULE = '0 0 1 1 *'

export function eventLabel(name: BantuEventName): string {
  return BANTU_EVENTS.find(event => event.name === name)?.label ?? name
}

/** "When a program crashes (Safari)". */
export function describeRule(rule: Pick<EventAutomation, 'event' | 'match'>): string {
  const values = Object.values(rule.match ?? {}).filter(Boolean)

  return values.length ? `${eventLabel(rule.event)} (${values.join(', ')})` : eventLabel(rule.event)
}

export function matchesRule(rule: EventAutomation, event: BantuEvent): boolean {
  if (!rule.enabled || rule.event !== event.name) {
    return false
  }

  return Object.entries(rule.match ?? {}).every(([key, wanted]) => {
    const value = (event.detail[key] ?? '').toLowerCase()

    return !wanted || value === wanted.toLowerCase() || value.includes(wanted.toLowerCase())
  })
}

/** Environment a hook script runs with: the event's name, time, JSON and each detail as its own variable. */
export function hookEnv(event: BantuEvent): Record<string, string> {
  const env: Record<string, string> = {
    BANTU_EVENT: event.name,
    BANTU_EVENT_AT: new Date(event.at).toISOString(),
    BANTU_EVENT_JSON: JSON.stringify(event)
  }

  for (const [key, value] of Object.entries(event.detail)) {
    env[`BANTU_EVENT_${key.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`] = value
  }

  return env
}
