import type { SelectField } from 'payload'

import { linkedQuestId } from '../lib/guides/autofill'

import type { ValuesSource } from '../lib/achievements/dofusdb-values'
import { achievementStrings, PAGE_STATES } from '../lib/achievements/strings'
import { panelStrings } from '../lib/admin/strings'
import { validateSlug } from './QuestGuides'

/**
 * La nota bajo un campo que copia DofusDB: si el valor viene de DofusDB o Torre lo cambió,
 * y qué da DofusDB (src/components/achievement-admin/DofusDbNote.tsx). `help` va debajo,
 * como el porqué de un campo que solo cambia un administrador.
 */
export function dofusDbNote(source: ValuesSource, field: string, help?: string) {
  return {
    components: {
      Description: {
        path: '/components/achievement-admin/DofusDbNote#DofusDbNote',
        clientProps: help ? { source, field, help } : { source, field },
      },
    },
  }
}

/**
 * Si la página se ve en el sitio. Es de Torre: el refresco de DofusDB la crea «En
 * preparación» y nunca la cambia.
 */
export const stateField: SelectField = {
  name: 'state',
  label: panelStrings.state.label,
  type: 'select',
  required: true,
  defaultValue: 'preparing',
  options: PAGE_STATES.map((value) => ({ value, label: achievementStrings.states[value] })),
  admin: { position: 'sidebar', description: achievementStrings.admin.stateDescription },
}

type LinkedOptions = { data?: Record<string, unknown> }
const isLinked = (link: string, data?: Record<string, unknown>) =>
  linkedQuestId(data?.[link]) !== null

/**
 * El nombre: vacío vale si hay dato de DofusDB enlazado, porque el hook lo rellena al
 * guardar (como el título de las guías). Sin él, el panel lo pide.
 */
export function linkedNameValidator(link: string) {
  return (value: string | null | undefined, { data }: LinkedOptions): true | string =>
    value?.trim() || isLinked(link, data) ? true : achievementStrings.admin.nameRequired
}

/** El slug: vacío vale si hay dato de DofusDB, porque sale del nombre; si no, como las guías. */
export function linkedSlugValidator(link: string) {
  return (value: string | null | undefined, { data }: LinkedOptions): true | string =>
    !value && isLinked(link, data) ? true : validateSlug(value)
}
