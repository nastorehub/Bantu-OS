import type { BantuOSApi } from '../../preload/index.ts'

declare global {
  interface Window {
    bantuOS: BantuOSApi
  }
}

export {}
