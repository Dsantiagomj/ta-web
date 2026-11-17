import type { UploadField } from 'payload'

import { panelStrings } from '../lib/admin/strings'

const t = panelStrings.zoneBackground

/**
 * La imagen propia de fondo de una guía de misión o una página de logro: gana al fondo de la
 * subzona de su misión (src/lib/zones/read.ts). Opcional.
 */
export const pageBackgroundField: UploadField = {
  name: 'background',
  label: t.pageOverride,
  type: 'upload',
  relationTo: 'media',
  admin: { position: 'sidebar', description: t.pageOverrideHelp },
}
