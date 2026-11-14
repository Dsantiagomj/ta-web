import type { CollectionBeforeValidateHook, CollectionConfig, Condition, Field } from 'payload'

import { checklistDetailsEndpoint } from '../endpoints/checklist-details'
import { validateColor } from '../lib/dofus-guides/color'
import { checklistStrings } from '../lib/checklists/strings'
import { assignStepIds, type StepIdentity } from '../lib/checklists/step-ids'
import { stateField } from './achievement-fields'
import { placeInTabs } from './field-tabs'
import {
  validateClosedSteps,
  validateNeedItem,
  validateNeedPrerequisite,
  validateSegmentQuest,
  validateStepRef,
  validateStepRefs,
  validateStopObjective,
} from './checklist-rules'
import {
  lockedOnceSet,
  adminOrNotImported,
  isPanelUser,
  readPublishedOrAll,
} from './editorial-access'
import { keepSavedValue, LOCKED_ONCE_SAVED_FIELD, rememberRowsWithoutId } from './locked-once-saved'
import { validateOptionalUrl } from './Media'
import { validateSlug } from './QuestGuides'
import {
  revalidateChecklistsAfterChange,
  revalidateChecklistsAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'
import { rowLabel } from './row-label'
import { SLUG_LABEL, slugAdmin } from './slug-field'
import { panelStrings } from '../lib/admin/strings'
import { pagePreview, withPublishStatus } from '../lib/admin/live-preview'

const s = checklistStrings.admin
const rows = panelStrings.rowLabels

type SiblingData = { kind?: unknown; mode?: unknown } | undefined
const isKind = (kind: string) => (_: unknown, siblingData: SiblingData) =>
  siblingData?.kind === kind
const someQuests = (_: unknown, siblingData: SiblingData) =>
  siblingData?.mode === 'some' || siblingData?.mode === 'upto'

const SEGMENT_KINDS = ['plain', 'stop', 'resolve', 'note', 'tip', 'must', 'includes'] as const

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

// Una parada: la misión que se deja a medias, su objetivo y sus opciones. La lleva el tramo
// «detente aquí» y cada una de sus «más paradas».
type PointAdmin = { description: string; condition?: Condition }

// Los selectores del panel (A-19): pasos por su nombre y objetivos por su texto.
const STEP_REF_FIELD = '/components/admin/StepRefField#StepRefField'
const STOP_OBJECTIVE_FIELD = '/components/admin/StopObjectiveField#StopObjectiveField'
const stopPointFields = (
  admin: (description: string) => PointAdmin,
  questValidate?: typeof validateSegmentQuest,
): Field[] => [
  {
    name: 'quest',
    label: 'Misión',
    type: 'relationship',
    relationTo: 'quests',
    ...(questValidate && { validate: questValidate }),
    admin: admin(s.segmentQuestDescription),
  },
  {
    name: 'stopObjective',
    label: 'Parar antes del objetivo',
    type: 'number',
    validate: validateStopObjective,
    // Se elige por su texto entre los de la misión (A-19); se guarda su índice desde 0.
    admin: { ...admin(s.stopObjectiveDescription), components: { Field: STOP_OBJECTIVE_FIELD } },
  },
  {
    // Sin valor por defecto: sin marcar se guarda vacío, como lo deja la importación.
    name: 'later',
    label: 'La termina un paso posterior',
    type: 'checkbox',
    admin: admin(s.stopLaterDescription),
  },
  {
    name: 'line',
    label: 'Texto en la misión',
    type: 'text',
    localized: true,
    admin: admin(s.stopLineDescription),
  },
  {
    name: 'resumeLine',
    label: 'Texto al resolverse',
    type: 'text',
    localized: true,
    admin: admin(s.stopResumeLineDescription),
  },
]

// El texto de Torre en tramos, en su orden: normal, «detente aquí» (deja una misión a medias
// en un objetivo), «aquí se resuelve» (termina las que otros pasos dejaron a medias) o un aviso
// de la guía (nota, consejo, lo que hay que hacer, lo que incluye el paso).
const onStop = (description: string): PointAdmin => ({
  condition: isKind('stop') as Condition,
  description,
})
const segmentFields: Field[] = [
  {
    name: 'kind',
    label: 'Tipo',
    type: 'select',
    required: true,
    defaultValue: 'plain',
    options: SEGMENT_KINDS.map((value) => ({
      value,
      label: checklistStrings.segmentKinds[value],
    })),
  },
  { name: 'text', label: 'Texto', type: 'textarea', required: true, localized: true },
  ...stopPointFields(onStop),
  {
    name: 'more',
    label: 'Más paradas',
    labels: { singular: 'Parada', plural: 'Paradas' },
    type: 'array',
    // Con el nombre por defecto, las claves foráneas de su tabla de versiones pasan de los 63
    // caracteres de Postgres.
    dbName: 'checklists_seg_more',
    admin: onStop(s.stopMoreDescription),
    fields: stopPointFields((description) => ({ description }), validateSegmentQuest),
  },
  {
    name: 'closes',
    label: 'Pasos que termina',
    type: 'text',
    hasMany: true,
    validate: validateClosedSteps,
    admin: {
      condition: isKind('resolve'),
      description: s.closesDescription,
      components: { Field: STEP_REF_FIELD },
    },
  },
]

// La clave del progreso del paso (AGENTS.md, Members and progress). Se ve para poder
// copiarla en «Pasos que termina», pero solo la escribe keepStepIds. Va al final del paso,
// en un desplegable cerrado: el desplegable solo lo coloca en el panel, no cambia la base.
const technicalFields: Field = {
  type: 'collapsible',
  label: panelStrings.technical.label,
  admin: { initCollapsed: true },
  fields: [
    {
      name: 'stepId',
      label: 'Identificador',
      type: 'text',
      index: true,
      // Nace con la fila: un paso recién añadido se puede elegir en «Pasos que termina» sin
      // guardar antes. keepStepIds lo conserva si ningún otro paso lo tiene (un duplicado no).
      defaultValue: () => globalThis.crypto.randomUUID(),
      admin: {
        readOnly: true,
        components: {
          Description: {
            path: '/components/admin/CopyValueDescription#CopyValueDescription',
            clientProps: { help: s.stepIdDescription, what: s.stepIdCopyLabel },
          },
        },
      },
    },
  ],
}

const needItemFields: Field[] = [
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
]

/**
 * Una lista de «Necesitarás»: la de un paso o la de los prerrequisitos. Cada fila es un objeto
 * del juego o un texto, con sus otras opciones, su grupo y si cuenta en los totales.
 */
function needsField(
  name: string,
  { description, dbName, extra = [] }: { description?: string; dbName?: string; extra?: Field[] },
): Field {
  return {
    name,
    label: 'Necesitarás',
    labels: { singular: 'Objeto', plural: 'Objetos' },
    type: 'array',
    ...(dbName && { dbName }),
    admin: {
      initCollapsed: true,
      ...(description && { description }),
      components: rowLabel('RelationRowLabel', {
        singular: rows.need,
        textField: 'label',
        relationField: 'item',
        relationTo: 'items',
      }),
    },
    fields: [
      ...needItemFields,
      {
        name: 'alternatives',
        label: 'O también',
        labels: { singular: 'Opción', plural: 'Opciones' },
        type: 'array',
        dbName: `${dbName ?? 'checklists_need'}_alts`,
        admin: { initCollapsed: true, description: s.needAlternativesDescription },
        fields: needItemFields,
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
      localizedText('group', 'Apartado', s.needGroupDescription),
      {
        name: 'countsInTotal',
        label: 'Cuenta en los totales',
        type: 'checkbox',
        defaultValue: true,
        admin: { description: s.needCountsInTotalDescription },
      },
      {
        // Sin valor por defecto, como «La termina un paso posterior».
        name: 'reusable',
        label: 'Se conserva',
        type: 'checkbox',
        admin: { description: s.needReusableDescription },
      },
      ...extra,
      {
        name: 'quests',
        label: 'Para las misiones',
        type: 'relationship',
        relationTo: 'quests',
        hasMany: true,
        admin: { description: s.needQuestsDescription },
      },
    ],
  }
}

const stepFieldList: Field[] = [
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
    admin: {
      description: s.segmentsDescription,
      initCollapsed: true,
      components: rowLabel('SegmentLabel'),
    },
    fields: segmentFields,
  },
  {
    name: 'closes',
    label: 'También termina',
    type: 'text',
    hasMany: true,
    validate: validateStepRefs,
    admin: { description: s.stepClosesDescription, components: { Field: STEP_REF_FIELD } },
  },
  {
    name: 'updates',
    label: 'Avanza los pasos',
    type: 'text',
    hasMany: true,
    validate: validateStepRefs,
    admin: { description: s.stepUpdatesDescription, components: { Field: STEP_REF_FIELD } },
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
    admin: {
      components: rowLabel('RelationRowLabel', {
        singular: rows.achievement,
        relationField: 'achievement',
        relationTo: 'achievements',
      }),
    },
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
        options: (['all', 'some', 'upto'] as const).map((value) => ({
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
    admin: {
      components: rowLabel('RelationRowLabel', {
        singular: rows.quest,
        relationField: 'quest',
        relationTo: 'quests',
      }),
    },
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
      localizedText('label', 'Nombre de la fila', s.questLabelDescription),
      {
        name: 'alternatives',
        label: 'O cualquiera de estas',
        type: 'relationship',
        relationTo: 'quests',
        hasMany: true,
        admin: { description: s.questAlternativesDescription },
      },
      {
        name: 'optionalDoneBy',
        label: 'La termina el paso',
        type: 'text',
        validate: validateStepRef,
        admin: {
          condition: isKind('optional'),
          description: s.optionalDoneByDescription,
          components: { Field: STEP_REF_FIELD },
        },
      },
    ],
  },
  needsField('needs', {}),
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
  localizedText('zone', 'Zona', s.zoneDescription),
]

const tabsOf = panelStrings.stepTabs
const [legacyNumber, ...visibleStepFields] = stepFieldList

// Un paso abierto pasaba de los 4 000 px (A-18): sus campos van en pestañas, que solo los
// colocan (no tienen nombre, así que no cambian lo guardado), y los datos técnicos al final.
// placeInTabs para si un campo del paso se queda sin pestaña.
const stepFields: Field[] = [
  legacyNumber,
  placeInTabs(visibleStepFields, [
    { label: tabsOf.text, names: ['zone', 'segments', 'closes', 'updates', 'note'] },
    { label: tabsOf.quests, names: ['quests', 'achievements', 'bosses'] },
    { label: tabsOf.needs, names: ['needs'] },
    { label: tabsOf.images, names: ['banner', 'icon', 'figure'] },
  ]),
  technicalFields,
]

// Las checklists de Torre: los pasos de cada Dofus, en su orden. Son de Torre, con
// borradores; el progreso de cada persona va por el stepId de cada paso.
export const Checklists: CollectionConfig = {
  slug: 'checklists',
  labels: { singular: 'Checklist', plural: 'Checklists' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.content,
    hideAPIURL: true,
    defaultColumns: ['name', 'order', 'state', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
    // La vista previa abre la página de la checklist con el último borrador (/vista-previa).
    ...pagePreview,
  },
  endpoints: [checklistDetailsEndpoint],
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    // Lo importado solo lo borra un administrador (docs/research/backlog.md, A-15).
    delete: adminOrNotImported('importSnapshot'),
  },
  // Una copia se llevaría los stepId de sus pasos: dos checklists compartirían progreso.
  disableDuplicate: true,
  versions: { drafts: true, maxPerDoc: 50 },
  defaultSort: 'order',
  hooks: {
    // Las filas de prerrequisitos que llegan sin id no cambian una clave guardada (A-23).
    beforeOperation: [rememberRowsWithoutId('prerequisites.groups.rows')],
    beforeValidate: [rejectSharedSlug('checklists'), keepStepIds],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateChecklistsAfterChange],
    afterDelete: [revalidateChecklistsAfterDelete],
  },
  fields: withPublishStatus([
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
      label: SLUG_LABEL,
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
      admin: slugAdmin(s.slugDescription),
    },
    { ...stateField, admin: { ...stateField.admin, description: s.stateDescription } },
    {
      // Una checklist de pasos (una guía) o de almas (el Ocre): las almas salen de la misión.
      name: 'kind',
      label: 'Tipo de checklist',
      type: 'select',
      // Vacío es una de pasos: lo que ya había no cambia.
      defaultValue: 'steps',
      options: (['steps', 'souls'] as const).map((value) => ({
        value,
        label: checklistStrings.kinds[value],
      })),
      admin: { position: 'sidebar', description: s.kindDescription },
    },
    {
      name: 'soulsQuest',
      label: 'Misión de las almas',
      type: 'relationship',
      relationTo: 'quests',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.kind === 'souls',
        description: s.soulsQuestDescription,
      },
    },
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
      access: lockedOnceSet('order'),
      admin: {
        position: 'sidebar',
        description: `${s.orderDescription} ${panelStrings.locks.order}`,
      },
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
      // La tarjeta del índice /checklists (DESIGN.md, Checklists index). El encuadre va en % de
      // la tarjeta; lo que se deja vacío toma el de siempre (checklists-index.css).
      name: 'card',
      label: 'Tarjeta del índice',
      type: 'group',
      // En la barra lateral, con el estado y el orden: no empuja los pasos hacia abajo.
      admin: { position: 'sidebar', description: s.card.description },
      fields: [
        {
          name: 'scene',
          label: 'Escena',
          type: 'upload',
          relationTo: 'media',
          admin: { description: s.card.scene },
        },
        {
          name: 'npc',
          label: 'PNJ',
          type: 'upload',
          relationTo: 'media',
          admin: { description: s.card.npc },
        },
        {
          name: 'npcHeight',
          label: 'Alto del PNJ (%)',
          type: 'number',
          min: 20,
          max: 120,
          admin: { description: s.card.npcHeight, placeholder: '52' },
        },
        {
          name: 'npcRight',
          label: 'Hacia fuera por la derecha (%)',
          type: 'number',
          min: -80,
          max: 40,
          admin: { description: s.card.npcRight, placeholder: '-14' },
        },
        {
          name: 'npcTop',
          label: 'Desde arriba (%)',
          type: 'number',
          min: -20,
          max: 60,
          admin: { description: s.card.npcTop, placeholder: '9' },
        },
        {
          name: 'color',
          label: 'Color',
          type: 'text',
          validate: validateColor,
          admin: {
            description: s.card.color,
            className: 'ta-color',
            // El campo de texto de Payload con el selector de color delante, como en las guías
            // de Dofus (A-22).
            components: {
              Field: '/components/admin/ColorField#ColorField',
              beforeInput: ['/components/admin/ColorField#ColorSwatch'],
            },
          },
        },
      ],
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
          admin: {
            components: rowLabel('TextRowLabel', { singular: rows.group, field: 'title' }),
          },
          fields: [
            localizedText('title', 'Título'),
            {
              name: 'rows',
              label: 'Filas',
              labels: { singular: 'Fila', plural: 'Filas' },
              type: 'array',
              admin: {
                components: rowLabel('TextRowLabel', { singular: rows.row, field: 'text' }),
              },
              fields: [
                {
                  name: 'key',
                  label: 'Clave',
                  type: 'text',
                  required: true,
                  // Se escribe al crear la fila y luego no cambia (A-23).
                  hooks: { beforeChange: [keepSavedValue] },
                  admin: {
                    description: s.prerequisiteKeyDescription,
                    components: { Field: LOCKED_ONCE_SAVED_FIELD },
                  },
                },
                { name: 'text', label: 'Texto', type: 'text', required: true, localized: true },
              ],
            },
          ],
        },
        {
          name: 'notes',
          label: 'Avisos',
          labels: { singular: 'Aviso', plural: 'Avisos' },
          type: 'array',
          dbName: 'checklists_pre_notes',
          admin: {
            description: s.prerequisiteNotesDescription,
            components: rowLabel('TextRowLabel', { singular: rows.note, field: 'title' }),
          },
          fields: [
            localizedText('title', 'Título'),
            { name: 'text', label: 'Texto', type: 'textarea', required: true, localized: true },
          ],
        },
        needsField('needs', {
          description: s.prerequisiteNeedsDescription,
          dbName: 'checklists_pre_needs',
          extra: [
            {
              name: 'prerequisite',
              label: 'Prerrequisito',
              type: 'text',
              validate: validateNeedPrerequisite,
              admin: { description: s.needPrerequisiteDescription },
            },
          ],
        }),
      ],
    },
    {
      // El esquema que reordena los pasos con botones y con el teclado (A-18).
      name: 'stepOutline',
      label: panelStrings.stepOutline.label,
      type: 'ui',
      admin: { components: { Field: '/components/admin/StepOutline#StepOutline' } },
    },
    {
      name: 'steps',
      label: 'Pasos',
      labels: { singular: 'Paso', plural: 'Pasos' },
      type: 'array',
      admin: {
        description: s.stepsDescription,
        initCollapsed: true,
        components: rowLabel('ChecklistStepLabel'),
      },
      fields: stepFields,
    },
    {
      name: 'completedBy',
      label: 'Misiones que se terminan solas',
      labels: { singular: 'Misión', plural: 'Misiones' },
      type: 'array',
      admin: {
        description: s.completedByDescription,
        initCollapsed: true,
        components: rowLabel('RelationRowLabel', {
          singular: rows.quest,
          relationField: 'quest',
          relationTo: 'quests',
        }),
      },
      fields: [
        {
          name: 'quest',
          label: 'Misión',
          type: 'relationship',
          relationTo: 'quests',
          required: true,
        },
        {
          name: 'by',
          label: 'Se termina al terminar',
          type: 'relationship',
          relationTo: 'quests',
          hasMany: true,
          required: true,
          admin: { description: s.completedByByDescription },
        },
      ],
    },
    {
      // Lo que necesita la migración del progreso guardado en la checklist antigua: el
      // prefijo de sus claves, las del checklist clásico, la versión de la guía, la
      // numeración de sus pasos en cada versión y las claves de objetos que cambiaron. Lo
      // escribe la importación.
      name: 'legacy',
      type: 'group',
      admin: { hidden: true },
      fields: [
        { name: 'prefix', type: 'text' },
        { name: 'classicKeys', type: 'json' },
        { name: 'guideVersion', type: 'number' },
        { name: 'previousSteps', type: 'json' },
        // Las claves de objetos que cambiaron en la checklist antigua: vieja → [nueva, pasos].
        { name: 'ownedMoves', type: 'json' },
        // Las filas genéricas antiguas («clase», «alt:…») → la primera de sus misiones.
        { name: 'genericQuests', type: 'json' },
      ],
    },
    {
      // Lo último que escribió la importación en cada campo: al repetirla, un campo que ya no
      // coincide lo cambió Torre y no se toca, como en las guías de Dofus.
      name: 'importSnapshot',
      type: 'json',
      admin: { hidden: true },
    },
  ]),
}
