import { type BantuEvent, matchesRule } from '../../shared/events.ts'
import type { BackendManager } from '../backend/manager.ts'
import { log } from '../log.ts'
import { readPrefs } from '../prefs.ts'

/**
 * Fire the NasTech automations waiting for this event. Each is a paused cron job: triggering a paused
 * job runs it and resumes it (NasTech's `force` fire), so it is paused again straight away to keep
 * it event-only. The run itself happens in NasTech's cron runner, with its usual history and delivery.
 */
export async function fireEventAutomations(event: BantuEvent, backend: BackendManager): Promise<void> {
  const rules = (readPrefs().eventAutomations ?? []).filter(rule => matchesRule(rule, event))

  if (rules.length === 0) {
    return
  }

  if (backend.getState().phase !== 'ready') {
    log('events', `${event.name}: ${rules.length} automation(s) skipped, NasTech is not running`)

    return
  }

  for (const rule of rules) {
    const job = `/api/cron/jobs/${encodeURIComponent(rule.jobId)}`

    try {
      await backend.rest({ method: 'POST', path: `${job}/trigger` })
      log('events', `${event.name}: ran automation ${rule.jobId}`)
    } catch (error) {
      log('events', `${event.name}: automation ${rule.jobId} did not run: ${(error as Error).message}`)
    }

    await backend.rest({ method: 'POST', path: `${job}/pause` }).catch(error => log('events', `could not re-pause ${rule.jobId}: ${(error as Error).message}`))
  }
}
