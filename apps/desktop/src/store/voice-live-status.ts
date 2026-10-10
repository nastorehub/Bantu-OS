import { rest } from '../lib/rest.ts'

/** `GET /api/audio/voice-live/status`: whether GPT-Live can start on this runtime (non-secret). */
export interface LiveStatus {
  mode: 'chained' | 'gpt-live'
  available: boolean
  reason: string | null
  model: string
  voice: string
}

export async function fetchLiveStatus(): Promise<LiveStatus> {
  try {
    const raw = await rest.get<Partial<LiveStatus> & { ok?: boolean }>('/api/audio/voice-live/status')

    return {
      mode: raw.mode === 'gpt-live' ? 'gpt-live' : 'chained',
      available: Boolean(raw.available),
      reason: raw.reason ?? null,
      model: raw.model ?? 'gpt-live-1',
      voice: raw.voice ?? 'marin'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // A 404 means the runtime predates the voice-live routes (nastech < 0.21.3).
    const reason = /404/.test(message) ? 'NasTech is older than 0.21.3; run `nastech update` for the Live engine.' : message

    return { mode: 'chained', available: false, reason, model: 'gpt-live-1', voice: 'marin' }
  }
}
