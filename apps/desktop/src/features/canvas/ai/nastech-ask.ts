/*
 * Asking NasTech from the Canvas window: the pictures it needs are saved under /tmp, and the
 * request goes the way every "Ask NasTech" in Herald goes, to the NasTech window (its own renderer
 * on Linux), where it is sent as a prompt.
 */

import { isPanels, relayToMain } from '../../../store/shell.ts'
import { describeLayers } from '../agent-model.ts'
import type { CanvasDocument } from '../engine/document.ts'
import { flatten } from '../engine/project.ts'
import type { Raster } from '../engine/raster.ts'
import { $autosave, save } from '../store.ts'
import { compositeArea } from '../tools/screen.ts'
import { editRequest, generatedLayerRequest, generationBox, generativeFillRequest, type ImageContext, layerLine } from './nastech-requests.ts'

export const REQUEST_FOLDER = '/tmp/herald-canvas-ai'

/** A request's own folder, so two requests never share files. */
export const requestFolder = (): string => `${REQUEST_FOLDER}/${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`

const rawOf = (raster: Raster) => ({ width: raster.width, height: raster.height, channels: raster.channels, data: new Uint8Array(raster.data.buffer, raster.data.byteOffset, raster.data.byteLength) })

/** The image as NasTech should find it: saved (so its project on disk is current), or the one in front. */
async function contextOf(doc: CanvasDocument): Promise<ImageContext> {
  if (!doc.path && isPanels) {
    throw new Error('Save the image first, so NasTech can open it')
  }

  if (doc.path && doc.modified && $autosave.get()) {
    await save(doc)
  }

  return { project: doc.path, name: doc.name, width: doc.state.width, height: doc.state.height }
}

function send(text: string, attachments: string[]): void {
  relayToMain({ type: 'send-prompt', text, attachments })
}

/** Edit > Generative Fill: NasTech makes a picture for the selected area and places it there, masked to the selection. */
export async function prepareGenerativeFill(doc: CanvasDocument, prompt: string): Promise<{ text: string; attachments: string[] }> {
  const selection = doc.state.selection
  const bounds = selection?.opaqueBounds()

  if (!selection || !bounds) {
    throw new Error('Select the area to fill first')
  }

  const image = await contextOf(doc)
  const box = generationBox(bounds, doc.state.width, doc.state.height)
  const folder = requestFolder()
  const context = await window.heraldOS.canvas.writeFile(`${folder}/context.png`, rawOf(compositeArea(doc, box)))
  const mask = await window.heraldOS.canvas.writeFile(`${folder}/mask.png`, rawOf(selection.crop(box)))

  return { text: generativeFillRequest({ image, prompt, box, context, mask, result: `${folder}/result.png` }), attachments: [context, mask] }
}

/** Layer > New Generated Layer: NasTech makes a picture and places it as a layer (in the selection's box when there is one). */
export async function prepareGeneratedLayer(doc: CanvasDocument, prompt: string): Promise<{ text: string; attachments: string[] }> {
  const image = await contextOf(doc)
  const box = doc.state.selection?.opaqueBounds() ?? null

  return { text: generatedLayerRequest({ image, prompt, box, result: `${requestFolder()}/result.png` }), attachments: [] }
}

/** The Ask NasTech field: an edit described in words, planned and made by NasTech with the canvas tool. */
export async function prepareEdit(doc: CanvasDocument, request: string): Promise<{ text: string; attachments: string[] }> {
  const image = await contextOf(doc)
  const { state } = doc
  const scale = Math.min(1, 1024 / Math.max(state.width, state.height))
  const picture = await window.heraldOS.canvas.writeFile(`${requestFolder()}/preview.png`, rawOf(flatten(state, scale)))
  const text = editRequest({ image, request, layers: describeLayers(state).map(layerLine), selection: state.selection?.opaqueBounds() ?? null, preview: picture })

  return { text, attachments: [picture] }
}

/** Prepare a request and send it to NasTech. */
export async function askNasTech(prepared: Promise<{ text: string; attachments: string[] }>): Promise<void> {
  const { text, attachments } = await prepared
  send(text, attachments)
}
