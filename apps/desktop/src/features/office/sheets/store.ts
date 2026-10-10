import { createSession } from '../session.ts'
import { sheetsAdapter } from './adapter.ts'

/** Bantu Sheets' open workbooks in this window. */
export const sheetsSession = createSession(sheetsAdapter)
