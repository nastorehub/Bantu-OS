import { ipcMain } from 'electron'
import type { BantuEvent, BantuEventName } from '../../shared/events.ts'
import { IPC } from '../../shared/ipc.ts'
import { log } from '../log.ts'

type Listener = (event: BantuEvent) => void

const RECENT_MAX = 50

/** One place every event source reports to; hooks and event automations listen. */
class EventBus {
  private readonly listeners = new Set<Listener>()
  private readonly recent: BantuEvent[] = []

  emit(name: BantuEventName, detail: Record<string, string | number | boolean | undefined> = {}): void {
    const clean: Record<string, string> = {}

    for (const [key, value] of Object.entries(detail)) {
      if (value !== undefined && value !== '') {
        clean[key] = String(value)
      }
    }

    const event: BantuEvent = { name, at: Date.now(), detail: clean }
    this.recent.unshift(event)
    this.recent.splice(RECENT_MAX)
    log('events', `${name}${Object.keys(clean).length ? ` ${JSON.stringify(clean)}` : ''}`)

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        log('events', `a ${name} listener failed: ${(error as Error).message}`)
      }
    }
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  recentEvents(): BantuEvent[] {
    return [...this.recent]
  }

  registerIpc(): void {
    ipcMain.handle(IPC.eventsRecent, () => this.recentEvents())
  }
}

export const events = new EventBus()
