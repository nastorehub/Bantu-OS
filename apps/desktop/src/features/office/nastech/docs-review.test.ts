import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reviewMenuItems } from '../docs/review-menus.ts'
import { $reviewProvider } from '../docs/review-provider.ts'
import { nastechReview, offerNasTechReview } from './docs-review.ts'

const nastech = vi.hoisted(() => ({ state: 'ready', working: new Set<string>(), askNasTech: vi.fn(async (_request: unknown) => true) }))
const docs = vi.hoisted(() => ({ text: 'Our results was better then expected.', notify: vi.fn() }))

vi.mock('./ask.ts', () => ({
  $nastechState: { get: () => nastech.state },
  askOf: (docKey: string) => ({ phase: nastech.working.has(docKey) ? 'working' : 'idle' }),
  askNasTech: nastech.askNasTech,
  draftAsk: vi.fn()
}))

vi.mock('../agent.ts', () => ({ openEntries: async () => [] }))

vi.mock('../docs/actions.ts', () => ({ hasEditor: () => true, apply: vi.fn() }))

vi.mock('../docs/store.ts', async () => {
  const { atom } = await import('nanostores')
  const editor = {
    state: {
      doc: {
        get textContent() {
          return docs.text
        }
      }
    }
  }

  return {
    docsSession: { $activeKey: atom<string | null>('report'), notify: docs.notify },
    editorOf: (key: string | null) => (key === 'report' ? editor : null),
    activeEditor: () => editor,
    $pages: atom({})
  }
})

const REVIEW_REQUEST = { app: 'docs', docKey: 'report', words: 'Review for clarity, grammar and tone', action: { id: 'review' } }

beforeEach(() => {
  nastech.state = 'ready'
  nastech.working.clear()
  docs.text = 'Our results was better then expected.'
  vi.clearAllMocks()
  $reviewProvider.set(null)
})

describe('Review with NasTech', () => {
  it('is offered while Herald Docs shows, and taken away after', () => {
    const stop = offerNasTechReview()

    expect($reviewProvider.get()).toBe(nastechReview)
    expect($reviewProvider.get()?.label).toBe('Review with NasTech')

    stop()

    expect($reviewProvider.get()).toBeNull()
  })

  it('leaves another review in place when it is taken away', () => {
    const stop = offerNasTechReview()
    const other = { label: 'Another review', run: () => {} }
    $reviewProvider.set(other)
    stop()

    expect($reviewProvider.get()).toBe(other)
  })

  it('asks NasTech for a review of the document, through its Ask NasTech bar', async () => {
    await nastechReview.run('report')

    expect(nastech.askNasTech).toHaveBeenCalledOnce()
    expect(nastech.askNasTech).toHaveBeenCalledWith(REVIEW_REQUEST)
  })

  it('waits, as the inline actions do, while NasTech is offline or already working on the document', async () => {
    nastech.state = 'offline'

    expect(nastechReview.enabled?.('report')).toBe(false)

    await nastechReview.run('report')
    nastech.state = 'ready'
    nastech.working.add('report')

    expect(nastechReview.enabled?.('report')).toBe(false)

    await nastechReview.run('report')

    expect(nastech.askNasTech).not.toHaveBeenCalled()
    expect(nastechReview.enabled?.('notes')).toBe(true)
  })

  it('says there is nothing to review in an empty document, without asking NasTech', async () => {
    docs.text = ' \n '
    await nastechReview.run('report')

    expect(docs.notify).toHaveBeenCalledWith('There is nothing to review in this document yet')
    expect(nastech.askNasTech).not.toHaveBeenCalled()
  })
})

describe('the Review menu', () => {
  it('ends with Review with NasTech while it is offered, which reviews the document in front', async () => {
    const { menu } = reviewMenuItems()

    expect(menu?.items.map((item) => item.id)).not.toContain('review-ai')

    const stop = offerNasTechReview()
    const item = menu!.items.at(-1)!

    expect(item).toMatchObject({ id: 'review-ai', label: 'Review with NasTech', dividerBefore: true })
    expect(item.shortcut).toBeUndefined()
    expect(item.enabled?.()).toBe(true)

    nastech.working.add('report')

    expect(item.enabled?.()).toBe(false)

    nastech.working.clear()
    item.run()
    await vi.waitFor(() => expect(nastech.askNasTech).toHaveBeenCalledWith(REVIEW_REQUEST))
    stop()

    expect(menu!.items.map((item) => item.id)).not.toContain('review-ai')
  })

  it('enables a review that does not say when it can run whenever a document is in front', () => {
    $reviewProvider.set({ label: 'Another review', run: () => {} })
    const item = reviewMenuItems().menu!.items.at(-1)!

    expect(item.label).toBe('Another review')
    expect(item.enabled?.()).toBe(true)
  })
})
