import type { CollectionBeforeValidateHook, CollectionConfig, Field } from 'payload'

import { checklistStrings } from '../lib/checklists/strings'
import { assignStepIds, type StepIdentity } from '../lib/checklists/step-ids'
import { stateField } from './achievement-fields'
import {
  validateClosedSteps,
  validateNeedItem,
  validateSegmentQuest,
  validateStepRef,
  validateStopObjective,
} from './checklist-rules'
import { isPanelUser, readPublishedOrAll } from './editorial-access'
import { validateOptionalUrl } from './Media'
import { validateSlug } from './QuestGuides'
import {
  revalidateChecklistsAfterChange,
  revalidateChecklistsAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'

const s = checklistStrings.admin

type SiblingData = { kind?: unknown; mode?: unknown } | undefined
const isKind = (kind: string) => (_: unknown, siblingData: SiblingData) =>
  siblingData?.kind === kind
const someQuests = (_: unknown, siblingData: SiblingData) => siblingData?.mode === 'some'

const steps = (value: unknown): StepIdentity[] =>
  Array.isArray(value) ? (value as StepIdentity[]) : []

/**
 * Cada paso recibe su stepId antes de validar, para que los tramos «aquí se resuelve» y las
 * misiones opcionales puedan apuntar a él. Se conserva al editar, reordenar o reimportar
 * (src/lib/checklists/step-ids.ts).
 */
const keepStepIds: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data || !Array.isArray(data.steps)) return data
  return { ...data, steps: assignStepIds(steps(data.steps), steps(originalDoc?.steps)) }
}

const localizedText = (name: string, label: string, description?: string): Field => ({
  name,
  label,
  type: 'text',
  localized: true,
  ...(description ? { admin: { description } } : {}),
})

// El texto de Torre en tramos, en su orden: normal, «detente aquí» (deja una misión a medias
// en un objetivo) o «aquí se resuelve» (termina las que otros pasos dejaron a medias).
const segmentFields: Field[] = [
  {
    name: 'kind',
    label: 'Tipo',
    type: 'select',
    required: true,
    defaultValue: 'plain',
    options: (['plain', 'stop', 'resolve'] as const).map((value) => ({
      value,
      label: checklistStrings.segmentKinds[value],
    })),
  },
  { name: 'text', label: 'Texto', type: 'textarea', required: true, localized: true },
  {
    name: 'quest',
    label: 'Misión',
    type: 'relationship',
    relationTo: 'quests',
    validate: validateSegmentQuest,
    admin: { condition: isKind('stop'), description: s.segmentQuestDescription },
  },
  {
    name: 'stopObjective',
    label: 'Objetivo donde parar',
    type: 'number',
    validate: validateStopObjective,
    admin: { condition: isKind('stop'), description: s.stopObjectiveDescription },
  },
  {
    name: 'closes',
    label: 'Pasos que termina',
    type: 'text',
    hasMany: true,
    validate: validateClosedSteps,
    admin: { condition: isKind('resolve'), description: s.closesDescription },
  },
]

const stepFields: Field[] = [
  {
    // La clave del progreso del paso (AGENTS.md, Members and progress). Se ve para poder
    // copiarla en «Pasos que termina», pero solo la escribe keepStepIds.
    name: 'stepId',
    label: 'Identificador',
    type: 'text',
    index: true,
    admin: { readOnly: true, description: s.stepIdDescription },
  },
  {
    // El número del paso en la checklist antigua: la migración del progreso guardado.
    name: 'legacyNumber',
    type: 'number',
    admin: { hidden: true },
  },
  {
    name: 'segments',
    label: 'Texto',
    labels: { singular: 'Tramo', plural: 'Tramos' },
    type: 'array',
    admin: { description: s.segmentsDescription },
    fields: segmentFields,
  },
  {
    name: 'note',
    label: 'Nota',
    type: 'richText',
    localized: true,
    admin: { description: s.noteDescription },
  },
  {
    name: 'achievements',
    label: 'Logros',
    labels: { singular: 'Logro', plural: 'Logros' },
    type: 'array',
    // Con el nombre por defecto, la clave foránea de su tabla de versiones pasa de los 63
    // caracteres de Postgres y se truncaría.
    dbName: 'checklists_step_ach',
    fields: [
      {
        name: 'achievement',
        label: 'Logro',
        type: 'relationship',
        relationTo: 'achievements',
        required: true,
      },
      {
        name: 'mode',
        label: 'Qué se hace',
        type: 'select',
        required: true,
        defaultValue: 'all',
        options: (['all', 'some'] as const).map((value) => ({
          value,
          label: checklistStrings.achievementModes[value],
        })),
      },
      {
        name: 'on',
        label: 'Misiones del logro',
        type: 'number',
        hasMany: true,
        min: 1,
        admin: { condition: someQuests, description: s.achievementOnDescription },
      },
    ],
  },
  {
    name: 'quests',
    label: 'Misiones',
    labels: { singular: 'Misión', plural: 'Misiones' },
    type: 'array',
    fields: [
      {
        name: 'quest',
        label: 'Misión',
        type: 'relationship',
        relationTo: 'quests',
        required: true,
      },
      {
        name: 'kind',
        label: 'Tipo',
        type: 'select',
        required: true,
        defaultValue: 'mandatory',
        options: (['mandatory', 'optional', 'take'] as const).map((value) => ({
          value,
          label: checklistStrings.questKinds[value],
        })),
      },
      localizedText('note', 'Nota', s.questNoteDescription),
      {
        name: 'optionalDoneBy',
        label: 'La termina el paso',
        type: 'text',
        validate: validateStepRef,
        admin: { condition: isKind('optional'), description: s.optionalDoneByDescription },
      },
    ],
  },
  {
    name: 'needs',
    label: 'Necesitarás',
    labels: { singular: 'Objeto', plural: 'Objetos' },
    type: 'array',
    fields: [
      {
        name: 'item',
        label: 'Objeto',
        type: 'relationship',
        relationTo: 'items',
        validate: validateNeedItem,
        admin: { description: s.needItemDescription },
      },
      localizedText('label', 'Texto', s.needLabelDescription),
      {
        name: 'quantity',
        label: 'Cantidad',
        type: 'number',
        required: true,
        min: 1,
        defaultValue: 1,
      },
      localizedText('note', 'Nota'),
      {
        name: 'category',
        label: 'Grupo',
        type: 'select',
        options: (
          ['resources', 'consumables', 'equipment', 'souls', 'creatures', 'cosmetics'] as const
        ).map((value) => ({ value, label: checklistStrings.needCategories[value] })),
        admin: { description: s.needCategoryDescription },
      },
      {
        name: 'countsInTotal',
        label: 'Cuenta en los totales',
        type: 'checkbox',
        defaultValue: true,
        admin: { description: s.needCountsInTotalDescription },
      },
      {
        name: 'quests',
        label: 'Para las misiones',
        type: 'relationship',
        relationTo: 'quests',
        hasMany: true,
        admin: { description: s.needQuestsDescription },
      },
    ],
  },
  {
    name: 'figure',
    label: 'Figura',
    type: 'group',
    admin: { description: s.figureDescription },
    fields: [
      { name: 'npc', label: 'PNJ', type: 'relationship', relationTo: 'npcs' },
      { name: 'image', label: 'Imagen', type: 'upload', relationTo: 'media' },
      localizedText('role', 'Papel', s.figureRoleDescription),
    ],
  },
  {
    name: 'bosses',
    label: 'Jefes',
    type: 'relationship',
    relationTo: 'monsters',
    hasMany: true,
    admin: { description: s.bossesDescription },
  },
  {
    name: 'icon',
    label: 'Icono',
    type: 'upload',
    relationTo: 'media',
    admin: { description: s.iconDescription },
  },
  {
    name: 'banner',
    label: 'Banner',
    type: 'upload',
    relationTo: 'media',
    admin: { description: s.bannerDescription },
  },
]

// Las checklists de Torre: los pasos de cada Dofus, en su orden. Son de Torre, con
// borradores; el progreso de cada persona va por el stepId de cada paso.
export const Checklists: CollectionConfig = {
  slug: 'checklists',
  labels: { singular: 'Checklist', plural: 'Checklists' },
  admin: {
    useAsTitle: 'name',
    group: 'Guías',
    defaultColumns: ['name', 'order', 'state', '_status', 'updatedAt'],
  },
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    delete: isPanelUser,
  },
  // Una copia se llevaría los stepId de sus pasos: dos checklists compartirían progreso.
  disableDuplicate: true,
  versions: { drafts: true, maxPerDoc: 50 },
  defaultSort: 'order',
  hooks: {
    beforeValidate: [rejectSharedSlug('checklists'), keepStepIds],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateChecklistsAfterChange],
    afterDelete: [revalidateChecklistsAfterDelete],
  },
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: s.nameDescription },
    },
    {
      // Sin traducir: la URL es la misma en todos los idiomas. Comparte /<slug> con las guías.
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
      admin: { position: 'sidebar', description: s.slugDescription },
    },
    { ...stateField, admin: { ...stateField.admin, description: s.stateDescription } },
    {
      name: 'legacyHref',
      label: 'Enlace en Squarespace',
      type: 'text',
      validate: validateOptionalUrl,
      admin: {
        position: 'sidebar',
        condition: (data) => data?.state === 'preparing',
        description: s.legacyHrefDescription,
      },
    },
    {
      name: 'order',
      label: 'Orden',
      type: 'number',
      required: true,
      admin: { position: 'sidebar', description: s.orderDescription },
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'textarea',
      localized: true,
      admin: { description: s.descriptionDescription },
    },
    {
      name: 'dofusGuide',
      label: 'Guía del Dofus',
      type: 'relationship',
      relationTo: 'dofus-guides',
      admin: { description: s.dofusGuideDescription },
    },
    {
      name: 'prerequisites',
      label: 'Prerrequisitos',
      type: 'group',
      admin: { description: s.prerequisitesDescription },
      fields: [
        {
          name: 'intro',
          label: 'Introducción',
          type: 'textarea',
          localized: true,
          admin: { description: s.prerequisitesIntroDescription },
        },
        {
          name: 'groups',
          label: 'Grupos',
          labels: { singular: 'Grupo', plural: 'Grupos' },
          type: 'array',
          fields: [
            localizedText('title', 'Título'),
            {
              name: 'rows',
              label: 'Filas',
              labels: { singular: 'Fila', plural: 'Filas' },
              type: 'array',
              fields: [
                {
                  name: 'key',
                  label: 'Clave',
                  type: 'text',
                  required: true,
                  admin: { description: s.prerequisiteKeyDescription },
                },
                { name: 'text', label: 'Texto', type: 'text', required: true, localized: true },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'steps',
      label: 'Pasos',
      labels: { singular: 'Paso', plural: 'Pasos' },
      type: 'array',
      admin: { description: s.stepsDescription },
      fields: stepFields,
    },
    {
      // Lo que necesita la migración del progreso guardado en la checklist antigua: el
      // prefijo de sus claves, las del checklist clásico, la versión de la guía y la
      // numeración de sus pasos en cada versión. Lo escribe la importación.
      name: 'legacy',
      type: 'group',
      admin: { hidden: true },
      fields: [
        { name: 'prefix', type: 'text' },
        { name: 'classicKeys', type: 'json' },
        { name: 'guideVersion', type: 'number' },
        { name: 'previousSteps', type: 'json' },
      ],
    },
    {
      // Lo último que escribió la importación en cada campo: al repetirla, un campo que ya no
      // coincide lo cambió Torre y no se toca, como en las guías de Dofus.
      name: 'importSnapshot',
      type: 'json',
      admin: { hidden: true },
    },
  ],
}
