import type { Field } from 'payload'

import type { ValuesSource } from '../lib/achievements/dofusdb-values'
import { achievementStrings, type PageState } from '../lib/achievements/strings'

/**
 * La nota bajo un campo que copia DofusDB: si el valor viene de DofusDB o Torre lo cambió,
 * y qué da DofusDB (src/components/achievement-admin/DofusDbNote.tsx).
 */
export function dofusDbNote(source: ValuesSource, field: string) {
  return {
    components: {
      Description: {
        path: '/components/achievement-admin/DofusDbNote#DofusDbNote',
        clientProps: { source, field },
      },
    },
  }
}

const STATES: PageState[] = ['published', 'preparing']

/**
 * Si la página se ve en el sitio. Es de Torre: el refresco de DofusDB la crea «En
 * preparación» y nunca la cambia.
 */
export const stateField: Field = {
  name: 'state',
  label: 'Estado',
  type: 'select',
  required: true,
  defaultValue: 'preparing',
  options: STATES.map((value) => ({ value, label: achievementStrings.states[value] })),
  admin: { position: 'sidebar', description: achievementStrings.admin.stateDescription },
}
