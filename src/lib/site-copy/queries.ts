import type { Payload } from 'payload'

import { type IndexTexts } from './defaults'
import { resolveIndexTexts, resolveSiteSettings, type SiteSettings } from './resolve'

// Los dos globales, leídos como un visitante: lo que sale en la web.

/** «Ajustes del sitio», con la imagen al compartir poblada. */
export async function readSiteSettings(payload: Payload): Promise<SiteSettings> {
  return resolveSiteSettings(
    await payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false }),
  )
}

/** «Portada e índices». */
export async function readIndexTexts(payload: Payload): Promise<IndexTexts> {
  return resolveIndexTexts(
    await payload.findGlobal({ slug: 'index-texts', depth: 0, overrideAccess: false }),
  )
}
