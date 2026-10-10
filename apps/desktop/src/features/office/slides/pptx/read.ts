import JSZip from 'jszip'
import type { Deck } from '../deck.ts'
import { readEmbeddedDeck } from './bantu-part.ts'
import { reportNotes } from './report.ts'

/*
 * Reading a PowerPoint file: Bantu's own copy of the deck when the file has one Bantu can trust
 * (it gives the deck back exactly), otherwise the slides themselves through the DrawingML reader,
 * with a note for everything it showed approximately or left out.
 */

export async function readPresentation(bytes: Uint8Array, title: string): Promise<{ model: Deck; notes: string[] }> {
  let zip: JSZip

  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    throw new Error('This is not a PowerPoint presentation')
  }

  if ((await zip.file('mimetype')?.async('string'))?.startsWith('application/vnd.oasis.opendocument')) {
    throw new Error('This is an OpenDocument presentation; Bantu Slides opens those through LibreOffice in a coming update')
  }

  const embedded = await readEmbeddedDeck(zip, title)

  if (embedded && 'deck' in embedded) {
    return { model: embedded.deck, notes: [] }
  }

  const { importPresentation } = await import('./import.ts')
  const { deck, report } = await importPresentation(zip, title)
  const notes = reportNotes(report)

  if (embedded) {
    notes.unshift('This file was changed in another app after Bantu saved it, so Bantu read its slides rather than its own copy of the deck.')
  }

  return { model: deck, notes }
}
