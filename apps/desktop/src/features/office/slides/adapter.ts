import type { OfficeAdapter } from '../types.ts'
import type { Deck } from './deck.ts'
import { newDeck } from './model.ts'

/*
 * Bantu Slides' files: PowerPoint presentations read and written by Bantu's own converters
 * (loaded when a file is opened or saved), and the print view a PDF is made from.
 */

export const slidesAdapter: OfficeAdapter<Deck> = {
  app: 'slides',
  defaultFormat: '.pptx',
  blank: (name) => newDeck(name),
  read: async (bytes, extension, name) => {
    if (extension !== '.pptx') {
      throw new Error(`Bantu Slides opens PowerPoint presentations (.pptx); ${extension || 'this file'} comes in a later version`)
    }

    const { readPresentation } = await import('./pptx/read.ts')

    return readPresentation(bytes, name)
  },
  write: async (model, extension) => {
    if (extension !== '.pptx') {
      throw new Error(`Bantu Slides saves PowerPoint presentations (.pptx); ${extension} comes in a later version`)
    }

    const [{ writePptx }, { shrinkFactors }] = await Promise.all([import('./pptx/export.ts'), import('./view/fit.ts')])

    // Bantu's own copy of the deck goes in with the slides, so nothing is lost for Bantu.
    return { bytes: await writePptx(model, { shrink: (body) => shrinkFactors.get(body) }), losses: [] }
  },
  print: async (model, name) => {
    const { printDeck } = await import('./print.tsx')

    return printDeck(model, name)
  }
}
