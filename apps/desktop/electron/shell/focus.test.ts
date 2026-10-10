import { describe, expect, it } from 'vitest'
import type { WmState, WmWindow } from '../../shared/ipc.ts'
import { FocusHistory } from './focus.ts'

const PANELS = new Set(['Bantu OS · Menu Bar', 'Bantu OS · Dock', 'Bantu OS · Command'])

const win = (id: number, title: string, workspaceId = 1): WmWindow => ({ id, title, appId: 'bantu-os', pid: 1, workspaceId, focused: false, floating: false, urgent: false, ours: true })

const MENUBAR = win(1, 'Bantu OS · Menu Bar')
const DOCK = win(2, 'Bantu OS · Dock')
const NASTECH = win(3, 'Bantu OS')
const DOCS = win(4, 'Bantu OS · Docs')
const DIALOG = win(5, 'Save as')

function state(windows: WmWindow[], focusedWindowId: number | null, workspace = 1): WmState {
  return {
    available: true,
    windows: windows.map(w => ({ ...w, focused: w.id === focusedWindowId })),
    workspaces: [
      { id: 1, idx: 1, name: 'personal', output: 'winit', active: workspace === 1, focused: workspace === 1, activeWindowId: null },
      { id: 2, idx: 2, name: 'work', output: 'winit', active: workspace === 2, focused: workspace === 2, activeWindowId: null }
    ],
    focusedWindowId
  }
}

const history = () => new FocusHistory(w => PANELS.has(w.title))

describe('FocusHistory', () => {
  it('gives the keys back to the app when its dialog closes and niri focuses the menu bar', () => {
    const focus = history()
    const all = [MENUBAR, DOCK, NASTECH, DOCS]

    expect(focus.follow(state(all, DOCS.id))).toBeNull()
    expect(focus.follow(state([...all, DIALOG], DIALOG.id))).toBeNull()
    expect(focus.follow(state(all, null))).toBeNull()
    expect(focus.follow(state(all, MENUBAR.id))).toBe(DOCS.id)
    expect(focus.follow(state(all, DOCS.id))).toBeNull()
  })

  it('does the same when niri reports the new focus before the closed window', () => {
    const focus = history()
    const all = [MENUBAR, DOCK, NASTECH, DOCS]

    focus.follow(state(all, NASTECH.id))
    focus.follow(state(all, DOCS.id))
    focus.follow(state([...all, DIALOG], DIALOG.id))

    expect(focus.follow(state([...all, DIALOG], DOCK.id))).toBeNull()
    expect(focus.follow(state(all, DOCK.id))).toBe(DOCS.id)
  })

  it('leaves the keys where the person put them', () => {
    const focus = history()
    const all = [MENUBAR, DOCK, NASTECH, DOCS]

    focus.follow(state(all, DOCS.id))

    expect(focus.follow(state(all, MENUBAR.id))).toBeNull()
    expect(focus.follow(state(all, DOCK.id))).toBeNull()
    expect(focus.follow(state(all, NASTECH.id))).toBeNull()
    expect(focus.follow(state(all.filter(w => w !== DOCS), NASTECH.id))).toBeNull()
  })

  it('answers once per closed window', () => {
    const focus = history()
    const all = [MENUBAR, DOCK, NASTECH, DOCS]

    focus.follow(state(all, NASTECH.id))
    focus.follow(state([...all, DIALOG], DIALOG.id))

    expect(focus.follow(state(all, MENUBAR.id))).toBe(NASTECH.id)
    expect(focus.follow(state(all, MENUBAR.id))).toBeNull()
  })

  it('skips windows that closed or sit on another workspace', () => {
    const focus = history()
    const away = win(6, 'Bantu OS · Sheets', 2)
    const all = [MENUBAR, DOCK, NASTECH, DOCS, away]

    focus.follow(state(all, NASTECH.id))
    focus.follow(state(all, DOCS.id))
    focus.follow(state(all, away.id, 2))
    focus.follow(state([...all, DIALOG], DIALOG.id))

    expect(focus.follow(state(all.filter(w => w !== DOCS), MENUBAR.id))).toBe(NASTECH.id)
  })

  it('has nothing to give back to when no app window is left on the workspace', () => {
    const focus = history()

    focus.follow(state([MENUBAR, DOCK, DIALOG], DIALOG.id))

    expect(focus.follow(state([MENUBAR, DOCK], MENUBAR.id))).toBeNull()
  })

  it('names the last app window for an overlay that closed', () => {
    const focus = history()
    const all = [MENUBAR, DOCK, NASTECH, DOCS]

    focus.follow(state(all, NASTECH.id))
    focus.follow(state(all, DOCS.id))
    focus.follow(state([...all, win(7, 'Bantu OS · Command')], 7))

    expect(focus.follow(state(all, MENUBAR.id))).toBeNull()
    expect(focus.back(state(all, MENUBAR.id))).toBe(DOCS.id)
  })
})
