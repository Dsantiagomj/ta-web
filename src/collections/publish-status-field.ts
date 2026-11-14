import type { UIField } from 'payload'

import { panelStrings } from '../lib/admin/strings'

/**
 * La línea de la barra lateral que dice qué ve un visitante (A-16,
 * src/components/admin/PublishStatus.tsx). Va primera entre los campos de la barra lateral.
 * No guarda nada: no cambia la base.
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
