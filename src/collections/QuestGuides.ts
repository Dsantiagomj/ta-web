import type { CollectionConfig, Field } from 'payload'

import { CalloutBlock } from '../blocks/CalloutBlock'
import { FightBlock } from '../blocks/FightBlock'
import { ImageBlock } from '../blocks/ImageBlock'
import { RichTextBlock } from '../blocks/RichTextBlock'
import { StepBlock } from '../blocks/StepBlock'
import { VideoBlock } from '../blocks/VideoBlock'
import { linkedQuestId } from '../lib/guides/autofill'
import { isDungeonNote, needNote, noteKey } from '../lib/guides/need-notes'
import { guidePreviewUrl, previewOrigin } from '../lib/guides/preview'
import { isReservedSlug, isSlugFormat } from '../lib/guides/slug'
import { guideStrings } from '../lib/guides/strings'
import type { FillableField, NotedField } from '../lib/guides/summary'
import { isPanelUser, readPublishedOrAll } from './editorial-access'
import { validateOptionalUrl } from './Media'
import { fillFromQuest } from './quest-guide-autofill'
import {
  revalidateGuidePagesAfterChange,
  revalidateGuidePagesAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'

/**
 * Slug plano en ASCII: minúsculas, cifras y guiones sueltos, sin guiones en los extremos.
 * Sin tildes ni eñes, para que la URL no se codifique, y sin chocar con una ruta del
 * sitio (/sistema, /admin…). Devuelve true o el mensaje de error.
 */
export function validateSlug(value: string | null | undefined): true | string {
  if (!isSlugFormat(value)) {
    return 'El slug solo admite minúsculas sin tildes, cifras y guiones sueltos (aprendizaje-escudero)'
  }
  return isReservedSlug(value) ? guideStrings.admin.slugReserved(value) : true
}

type GuideValidationOptions = { data: { quest?: unknown } }

/**
 * Título vacío solo si hay misión: al guardar, fillFromQuest pone su nombre. Sin misión,
 * el panel pide un título con un mensaje claro.
 */
export function validateGuideTitle(
  value: string | null | undefined,
  { data }: GuideValidationOptions,
): true | string {
  if (value?.trim() || linkedQuestId(data?.quest) !== null) return true
  return guideStrings.admin.titleRequired
}

/** Como validateSlug, pero vacío vale si hay misión: el slug sale de ella al guardar. */
export function validateGuideSlug(
  value: string | null | undefined,
  { data }: GuideValidationOptions,
): true | string {
  if (!value && linkedQuestId(data?.quest) !== null) return true
  return validateSlug(value)
}

type PickValidationOptions = { data?: { summary?: { needs?: { notes?: string | null } | null } } }

/**
 * La nota de una mazmorra elegida a mano tiene que ser una nota de mazmorra de Notas, con
 * o sin su cantidad: así se casa con su fila de «Necesitarás en total».
 */
export function validatePickedDungeonNote(
  value: string | null | undefined,
  { data }: PickValidationOptions,
): true | string {
  const key = value?.trim() ? noteKey(value) : ''
  const notes = (data?.summary?.needs?.notes ?? '').split('\n').filter((line) => line.trim())
  const found = notes.some(
    (line) => isDungeonNote(needNote(line.trim()).label) && noteKey(line) === key,
  )
  return key && found ? true : guideStrings.admin.dungeonPickUnknownNote
}

// Cada campo del resumen lleva una nota que lo compara con lo que da DofusDB.
function noteComponent(summaryField: NotedField) {
  return {
    path: '/components/quest-guide-admin/SummaryNote#SummaryNote',
    clientProps: { summaryField },
  }
}

function summaryAdmin(summaryField: FillableField) {
  return {
    placeholder: guideStrings.admin.summaryPlaceholder,
    components: { Description: noteComponent(summaryField) },
  }
}

const summaryFields: Field[] = [
  {
    name: 'prerequisites',
    label: 'Prerrequisitos',
    type: 'textarea',
    localized: true,
    admin: summaryAdmin('prerequisites'),
  },
  {
    name: 'needs',
    label: 'Necesitarás',
    type: 'group',
    fields: [
      {
        name: 'items',
        label: 'Objetos',
        labels: { singular: 'Objeto', plural: 'Objetos' },
        type: 'array',
        admin: { components: { Description: noteComponent('needs') } },
        fields: [
          {
            name: 'item',
            label: 'Objeto',
            type: 'relationship',
            relationTo: 'items',
            required: true,
          },
          {
            name: 'quantity',
            label: 'Cantidad',
            type: 'number',
            required: true,
            min: 1,
            defaultValue: 1,
          },
        ],
      },
      {
        name: 'notes',
        label: 'Notas',
        type: 'textarea',
        localized: true,
        admin: { description: guideStrings.admin.needsNotesDescription },
      },
      {
        // La mazmorra que no se adivina por el nombre («Mazmorra Ben Ripata»): gana a la
        // que casa sola (src/lib/achievements/dungeons.ts, dungeonChooser).
        name: 'dungeons',
        label: guideStrings.admin.dungeonPicksLabel,
        labels: { singular: 'Mazmorra', plural: 'Mazmorras' },
        type: 'array',
        admin: { description: guideStrings.admin.dungeonPicksDescription },
        fields: [
          {
            name: 'note',
            label: 'Nota',
            type: 'text',
            required: true,
            localized: true,
            validate: validatePickedDungeonNote,
          },
          {
            name: 'dungeon',
            label: 'Mazmorra',
            type: 'relationship',
            relationTo: 'dungeons',
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'rewards',
    label: 'Recompensas',
    type: 'textarea',
    localized: true,
    admin: summaryAdmin('rewards'),
  },
  {
    name: 'startNpc',
    label: 'PNJ de inicio',
    type: 'text',
    localized: true,
    admin: summaryAdmin('startNpc'),
  },
  { name: 'startX', label: 'X de inicio', type: 'number', admin: summaryAdmin('startX') },
  { name: 'startY', label: 'Y de inicio', type: 'number', admin: summaryAdmin('startY') },
]

export const questGuidesAccess = {
  read: readPublishedOrAll,
  create: isPanelUser,
  update: isPanelUser,
  delete: isPanelUser,
}

// Guías de misiones de Torre. Se empieza eligiendo la misión de DofusDB: de ella salen el
// título, el slug, el SEO y el resumen, que se guardan en la guía y Torre puede cambiar.
// La importación trae el resumen de Squarespace y DofusDB rellena lo que falte.
export const QuestGuides: CollectionConfig = {
  slug: 'quest-guides',
  labels: { singular: 'Guía de misión', plural: 'Guías de misiones' },
  admin: {
    useAsTitle: 'title',
    group: 'Guías',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    // La página pública en el panel, borrador incluido (src/lib/guides/preview.ts).
    livePreview: {
      url: ({ data, req }) => guidePreviewUrl(data?.slug, previewOrigin(process.env, req.origin)),
      breakpoints: [{ name: 'movil', label: 'Móvil', width: 390, height: 844 }],
    },
    preview: (doc, { req }) => guidePreviewUrl(doc?.slug, previewOrigin(process.env, req.origin)),
  },
  access: questGuidesAccess,
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: {
    // Primero el slug sale de la misión; luego no puede ser el de un logro o un metalogro.
    beforeValidate: [fillFromQuest, rejectSharedSlug('quest-guides')],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateGuidePagesAfterChange],
    afterDelete: [revalidateGuidePagesAfterDelete],
  },
  fields: [
    {
      // Una sola misión por guía: es la que rellena el título, el slug, el SEO y el resumen.
      name: 'quest',
      label: 'Misión de DofusDB',
      type: 'relationship',
      relationTo: 'quests',
      admin: {
        description: guideStrings.admin.questDescription,
        // Muestra la descripción y rellena el formulario al elegir la misión.
        components: {
          Description: '/components/quest-guide-admin/QuestAutofill#QuestAutofill',
        },
      },
    },
    {
      name: 'title',
      label: 'Título',
      type: 'text',
      required: true,
      localized: true,
      validate: validateGuideTitle,
      admin: { description: guideStrings.admin.titleDescription },
    },
    {
      // Sin traducir: la URL es la misma en todos los idiomas.
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateGuideSlug,
      admin: {
        position: 'sidebar',
        description: guideStrings.admin.slugDescription,
      },
    },
    {
      name: 'summary',
      label: 'Resumen',
      type: 'group',
      admin: { description: guideStrings.admin.summaryDescription },
      fields: summaryFields,
    },
    {
      name: 'body',
      label: 'Contenido',
      labels: { singular: 'Bloque', plural: 'Bloques' },
      type: 'blocks',
      blocks: [RichTextBlock, ImageBlock, VideoBlock, CalloutBlock, FightBlock, StepBlock],
    },
    {
      name: 'seo',
      label: 'SEO',
      type: 'group',
      admin: { description: guideStrings.admin.seoDescription },
      fields: [
        { name: 'metaTitle', label: 'Título SEO', type: 'text', localized: true },
        {
          name: 'metaDescription',
          label: 'Descripción SEO',
          type: 'textarea',
          localized: true,
          maxLength: 160,
        },
      ],
    },
    {
      name: 'originalUrl',
      label: 'URL original',
      type: 'text',
      validate: validateOptionalUrl,
      admin: {
        position: 'sidebar',
        description: 'URL de la página en Squarespace',
      },
    },
  ],
}
