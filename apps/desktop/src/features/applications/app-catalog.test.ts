import { describe, expect, it } from 'vitest'
import { distinctAppLabel } from '../../shell/apps.ts'
import { buildCatalog, filterTiles } from './app-catalog.ts'

const NAUTILUS = { name: 'Files', path: '/usr/share/applications/org.gnome.Nautilus.desktop', bundleId: 'org.gnome.Nautilus' }

describe('distinctAppLabel', () => {
  it('names an installed app after its id when Bantu already shows that name', () => {
    expect(distinctAppLabel(NAUTILUS, new Set(['files']))).toBe('Files (Nautilus)')
  })

  it('leaves every other name alone', () => {
    expect(distinctAppLabel({ name: 'Text Editor', bundleId: 'org.gnome.TextEditor' }, new Set(['files']))).toBe('Text Editor')
    expect(distinctAppLabel({ name: 'Files' }, new Set(['files']))).toBe('Files')
  })
})

describe('buildCatalog', () => {
  it('keeps Bantu Files and GNOME Files apart, and finds both by "files"', () => {
    const tiles = buildCatalog([NAUTILUS])

    expect(tiles.filter(tile => tile.label === 'Files')).toHaveLength(1)
    expect(filterTiles(tiles, 'all', 'files').map(tile => tile.label)).toEqual(expect.arrayContaining(['Files', 'Files (Nautilus)']))
  })

  it('puts Bantu Docs, Sheets and Slides after Bantu Canvas, found by the names people know', () => {
    const labels = buildCatalog([]).map(tile => tile.label)
    const canvas = labels.indexOf('Bantu Canvas')

    expect(labels.slice(canvas, canvas + 4)).toEqual(['Bantu Canvas', 'Bantu Docs', 'Bantu Sheets', 'Bantu Slides'])
    expect(filterTiles(buildCatalog([]), 'all', 'excel').map(tile => tile.label)).toEqual(['Bantu Sheets'])
    expect(filterTiles(buildCatalog([]), 'productivity', 'powerpoint').map(tile => tile.label)).toEqual(['Bantu Slides'])
  })
})
