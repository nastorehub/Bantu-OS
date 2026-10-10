import { atom } from 'nanostores'
import type { OfficeApp } from '../../../../shared/office/files.ts'
import { openEntries } from '../agent.ts'
import type { OfficeCommand, OfficeMenu } from '../shell/commands.ts'
import { $nastechState, askNasTech, askOf, draftAsk } from './ask.ts'
import type { CleanKind, DocsAction, NasTechAction, OpenDocument, SheetsAction, SlidesAction } from './prompts.ts'

/*
 * The inline actions: NasTech rewrites, shortens, translates or summarises the selection in Bantu
 * Docs; explains a formula, fills a column from its examples or cleans data in Bantu Sheets; writes
 * speaker notes, tightens a slide, picks layouts or makes slides from a document or cells in Bantu
 * Slides. Each goes through the Ask NasTech bar with a prompt that names the call landing the change
 * as a step to undo. A window gives what only it reads cheaply: the document in front and what is
 * selected in it.
 */

export const TONES = ['Professional', 'Friendly', 'Confident', 'Casual'] as const

export const LANGUAGES = ['Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Chinese'] as const

export const CLEANINGS: readonly { clean: CleanKind; label: string }[] = [
  { clean: 'dedupe', label: 'Remove duplicate rows' },
  { clean: 'dates', label: 'Fix dates' },
  { clean: 'split', label: 'Split column' },
  { clean: 'trim', label: 'Trim spaces' },
  { clean: 'numbers', label: 'Numbers stored as text' }
]

/** What the bar shows of an action while NasTech works on it, and above its reply. */
export function actionName(action: NasTechAction): string {
  switch (action.id) {
    case 'rewrite':
      return 'Rewrite'
    case 'shorten':
      return 'Shorten'
    case 'expand':
      return 'Expand'
    case 'tone':
      return `Change tone: ${action.tone}`
    case 'translate':
      return `Translate into ${action.language}`
    case 'fix':
      return 'Fix spelling and grammar'
    case 'summarise':
      return 'Summarise'
    case 'review':
      return 'Review for clarity, grammar and tone'
    case 'explain':
      return 'Explain this formula'
    case 'fill':
      return 'Fill from examples'
    case 'clean':
      return CLEANINGS.find((entry) => entry.clean === action.clean)?.label ?? 'Clean data'
    case 'insights':
      return 'What stands out in this sheet?'
    case 'notes':
      return 'Speaker notes for this slide'
    case 'allNotes':
      return 'Speaker notes for every slide'
    case 'layouts':
      return 'Choose layouts for the content'
    case 'tighten':
      return 'Tighten this slide'
    case 'fromDocument':
      return action.into === 'this' ? `Slides from ${action.document.name}` : `New deck from ${action.document.name}`
    case 'fromSheet':
      return `Slides from ${action.workbook.name}`
  }
}

/** Whether an action can start on a document now: NasTech is reachable and not working on it already. */
export const free = (docKey: string | null): docKey is string => Boolean(docKey) && $nastechState.get() === 'ready' && askOf(docKey!).phase !== 'working'

function runAction(app: OfficeApp, docKey: string | null, action: NasTechAction): void {
  if (free(docKey)) {
    void askNasTech({ app, docKey, words: actionName(action), action, mark: app === 'docs' })
  }
}

export interface DocsSource {
  /** The document in front, while its editor is on screen. */
  docKey: () => string | null
  hasSelection: () => boolean
}

/** Bantu Docs' way to the bar and actions on the selection, for the NasTech menu and the selection bubble. */
export function docsActions(source: DocsSource): OfficeCommand[] {
  const enabled = () => free(source.docKey()) && source.hasSelection()
  const action = (id: string, label: string, chosen: DocsAction, extra: Partial<OfficeCommand> = {}): OfficeCommand => ({ id: `nastech-${id}`, label, enabled, run: () => runAction('docs', source.docKey(), chosen), ...extra })

  return [
    { id: 'nastech-ask', label: 'Ask NasTech…', enabled: () => Boolean(source.docKey()), run: () => draftAsk('docs') },
    action('rewrite', 'Rewrite', { id: 'rewrite' }, { dividerBefore: true }),
    action('shorten', 'Shorten', { id: 'shorten' }),
    action('expand', 'Expand', { id: 'expand' }),
    { id: 'nastech-tone', label: 'Change Tone', enabled, run: () => {}, submenu: TONES.map((tone) => action(`tone-${tone.toLowerCase()}`, tone, { id: 'tone', tone })) },
    {
      id: 'nastech-translate',
      label: 'Translate',
      enabled,
      run: () => {},
      submenu: [
        ...LANGUAGES.map((language) => action(`translate-${language.toLowerCase()}`, language, { id: 'translate', language })),
        { id: 'nastech-translate-other', label: 'Other Language…', enabled, dividerBefore: true, run: () => draftAsk('docs', 'Translate the selection into ') }
      ]
    },
    action('fix', 'Fix Spelling and Grammar', { id: 'fix' }),
    action('summarise', 'Summarise', { id: 'summarise' }, { dividerBefore: true })
  ]
}

/** Bantu Docs' NasTech menu. */
export function docsNasTechMenu(source: DocsSource): OfficeMenu {
  return { id: 'nastech', label: 'NasTech', items: docsActions(source) }
}

export interface SheetsSource {
  /** The workbook in front, while its sheet is on screen. */
  docKey: () => string | null
  /** The active cell, "D2", and its formula. */
  cell: () => { cell: string; formula: string | null } | null
}

/** Bantu Sheets' NasTech menu: the bar, and the actions on the selection or the active cell. */
export function sheetsNasTechMenu(source: SheetsSource): OfficeMenu {
  const enabled = () => free(source.docKey())
  const action = (id: string, label: string, chosen: SheetsAction, extra: Partial<OfficeCommand> = {}): OfficeCommand => ({ id: `nastech-${id}`, label, enabled, run: () => runAction('sheets', source.docKey(), chosen), ...extra })

  return {
    id: 'nastech',
    label: 'NasTech',
    items: [
      { id: 'nastech-ask', label: 'Ask NasTech…', enabled: () => Boolean(source.docKey()), run: () => draftAsk('sheets') },
      { id: 'nastech-formula', label: 'Formula from a description…', enabled, dividerBefore: true, run: () => draftAsk('sheets', `Write a formula in ${source.cell()?.cell ?? 'the active cell'} that `) },
      action('explain', 'Explain this formula', { id: 'explain' }, { enabled: () => enabled() && Boolean(source.cell()?.formula) }),
      action('fill', 'Fill from examples', { id: 'fill' }),
      { id: 'nastech-clean', label: 'Clean data', enabled, run: () => {}, submenu: CLEANINGS.map(({ clean, label }) => action(`clean-${clean}`, label, { id: 'clean', clean })) },
      action('insights', 'What stands out in this sheet?', { id: 'insights' }, { dividerBefore: true })
    ]
  }
}

/** The Office documents open anywhere, for the menus that list them; a window refreshes it while it shows. */
export const $openDocuments = atom<readonly OpenDocument[]>([])

export async function refreshOpenDocuments(): Promise<void> {
  const entries = await openEntries().catch(() => null)

  if (entries) {
    $openDocuments.set(entries.map(({ app, name, path, selection }) => ({ app, name, path, ...(selection ? { selection } : {}) })))
  }
}

/** A submenu of the documents open in an app, read as the menu shows it. */
function openIn(app: 'docs' | 'sheets', item: (doc: OpenDocument, index: number) => OfficeCommand): OfficeCommand[] {
  const docs = $openDocuments.get().filter((doc) => doc.app === app)

  return docs.length ? docs.map(item) : [{ id: `nastech-none-${app}`, label: app === 'docs' ? 'No document is open in Bantu Docs' : 'No workbook is open in Bantu Sheets', enabled: () => false, run: () => {} }]
}

/** Bantu Slides' NasTech menu: the bar, the actions on the slide in front or the whole deck, and slides made from a topic, a document or cells. */
export function slidesNasTechMenu(source: { docKey: () => string | null }): OfficeMenu {
  const enabled = () => free(source.docKey())
  const action = (id: string, label: string, chosen: SlidesAction, extra: Partial<OfficeCommand> = {}): OfficeCommand => ({ id: `nastech-${id}`, label, enabled, run: () => runAction('slides', source.docKey(), chosen), ...extra })

  return {
    id: 'nastech',
    label: 'NasTech',
    items: [
      { id: 'nastech-ask', label: 'Ask NasTech…', enabled: () => Boolean(source.docKey()), run: () => draftAsk('slides') },
      action('notes', 'Speaker Notes for This Slide', { id: 'notes' }, { dividerBefore: true }),
      action('all-notes', 'Speaker Notes for Every Slide', { id: 'allNotes' }),
      action('tighten', 'Tighten This Slide', { id: 'tighten' }),
      action('layouts', 'Choose Layouts for the Content', { id: 'layouts' }),
      { id: 'nastech-topic', label: 'A Deck from a Topic…', enabled, dividerBefore: true, run: () => draftAsk('slides', 'Make a deck about ') },
      {
        id: 'nastech-from-document',
        label: 'Add Slides from a Document',
        enabled,
        run: () => {},
        get submenu() {
          return openIn('docs', (doc, index) => action(`from-document-${index}`, doc.name, { id: 'fromDocument', document: doc, into: 'this' }))
        }
      },
      {
        id: 'nastech-deck-from-document',
        label: 'New Deck from a Document',
        enabled,
        run: () => {},
        get submenu() {
          return openIn('docs', (doc, index) => action(`deck-from-document-${index}`, doc.name, { id: 'fromDocument', document: doc, into: 'new' }))
        }
      },
      {
        id: 'nastech-from-sheet',
        label: 'Add Slides from a Sheet',
        enabled,
        run: () => {},
        get submenu() {
          return openIn('sheets', (doc, index) => action(`from-sheet-${index}`, doc.name, { id: 'fromSheet', workbook: doc }))
        }
      }
    ]
  }
}
