import { $reviewProvider, type ReviewProvider } from '../docs/review-provider.ts'
import { docsSession, editorOf } from '../docs/store.ts'
import { actionName, free } from './actions.ts'
import { askNasTech } from './ask.ts'
import type { DocsAction } from './prompts.ts'

/*
 * Review > Review with NasTech in Herald Docs: NasTech reads the document in front and leaves its
 * clarity, grammar and tone comments on exact passages in one add_comments call, so the review is
 * one step to undo. It goes through the document's Ask NasTech bar like the inline actions: the
 * same session, progress, cancel, undo and way to the NasTech window.
 */

const REVIEW: DocsAction = { id: 'review' }

export const nastechReview: ReviewProvider = {
  label: 'Review with NasTech',
  enabled: free,
  run: async (docKey) => {
    if (!free(docKey)) {
      return
    }

    const editor = editorOf(docKey)

    if (editor && !editor.state.doc.textContent.trim()) {
      docsSession.notify('There is nothing to review in this document yet')

      return
    }

    await askNasTech({ app: 'docs', docKey, words: actionName(REVIEW), action: REVIEW })
  }
}

/** Offer the review in Herald Docs' Review menu; the function returned takes it away again. */
export function offerNasTechReview(): () => void {
  $reviewProvider.set(nastechReview)

  return () => {
    if ($reviewProvider.get() === nastechReview) {
      $reviewProvider.set(null)
    }
  }
}
