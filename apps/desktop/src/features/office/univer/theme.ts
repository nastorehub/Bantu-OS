import { defaultTheme } from '@univerjs/themes'
import { bantuPalette } from './palette.ts'

export type UniverTheme = typeof defaultTheme

const token = (style: CSSStyleDeclaration, name: string, fallback: string): string => style.getPropertyValue(name).trim() || fallback

/** Univer's palette and scheme from the page's current Bantu theme. */
export function bantuUniverTheme(): { theme: UniverTheme; darkMode: boolean } {
  const style = getComputedStyle(document.documentElement)
  const darkMode = !(style.colorScheme || token(style, 'color-scheme', 'dark')).includes('light')
  const { primary, gray } = bantuPalette({ accent: token(style, '--color-accent', '#2f7dff'), background: token(style, '--color-bg', '#050f33'), dark: darkMode })

  return { theme: { ...defaultTheme, primary, gray }, darkMode }
}
