// Imported (not a public URL) so Vite rewrites it relative to `base` for the packaged `file://` renderer.
import nastechMarkUrl from '../assets/brand/nastech-mark.png'
import nastechMarkDarkUrl from '../assets/brand/nastech-mark-dark.png'
import { cn } from '../lib/cn.ts'

/** The exact NasTech Agent Bantu mark, with upstream light/dark artwork. */
export function NasTechLogo({ height = 14, className }: { height?: number; className?: string }) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={nastechMarkDarkUrl} />
      <img src={nastechMarkUrl} alt="NasTech Agent" height={height} style={{ height, width: 'auto' }} draggable={false} className={cn('shrink-0 select-none', className)} />
    </picture>
  )
}
