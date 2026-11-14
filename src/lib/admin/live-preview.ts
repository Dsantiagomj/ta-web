import type { CollectionAdminOptions, Field, UIField } from 'payload'

import { guidePreviewUrl, previewOrigin } from '../guides/preview'
import { panelStrings } from './strings'

// Lo que comparten las colecciones de Torre en el panel: la vista previa de su página y la
// línea «En la web» arriba de la barra lateral (A-16, A-20).

const s = panelStrings.livePreview

/**
 * Los tamaños de la vista previa en vivo (A-20): un móvil, una tableta apaisada y un
 * escritorio, los mismos anchos que las capturas de DESIGN.md.
 */
export const livePreviewBreakpoints = [
  { name: 'movil', label: s.mobile, width: 390, height: 844 },
  { name: 'tableta', label: s.tablet, width: 1024, height: 768 },
  { name: 'escritorio', label: s.desktop, width: 1440, height: 900 },
]

/**
 * La vista previa de una colección con página en /<slug>: el panel abre /vista-previa con el
 * último borrador (src/lib/guides/preview.ts), en vivo y en una pestaña aparte.
 */
export const pagePreview = {
  livePreview: {
    url: ({ data, req }) => guidePreviewUrl(data?.slug, previewOrigin(process.env, req.origin)),
    breakpoints: livePreviewBreakpoints,
  },
  preview: (doc, { req }) => guidePreviewUrl(doc?.slug, previewOrigin(process.env, req.origin)),
} satisfies Pick<CollectionAdminOptions, 'livePreview' | 'preview'>

/**
 * La línea de la barra lateral que dice qué ve un visitante (A-16,
 * src/components/admin/PublishStatus.tsx). No guarda nada: no cambia la base.
 */
export const publishStatusField: UIField = {
  name: 'publishStatus',
  type: 'ui',
  label: panelStrings.publishStatus.label,
  admin: {
    position: 'sidebar',
    components: { Field: '/components/admin/PublishStatus#PublishStatus' },
  },
}

const inSidebar = (field: Field) =>
  'admin' in field && (field.admin as { position?: string } | undefined)?.position === 'sidebar'

/** Los campos de una colección con «En la web» como primero de la barra lateral. */
export function withPublishStatus(fields: Field[]): Field[] {
  const first = fields.findIndex(inSidebar)
  const at = first === -1 ? fields.length : first
  return [...fields.slice(0, at), publishStatusField, ...fields.slice(at)]
}
