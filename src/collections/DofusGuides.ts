import type { Block, CollectionConfig, Field } from 'payload'

import { CalloutBlock } from '../blocks/CalloutBlock'
import { FightBlock } from '../blocks/FightBlock'
import { ImageBlock } from '../blocks/ImageBlock'
import { RichTextBlock } from '../blocks/RichTextBlock'
import { StepBlock } from '../blocks/StepBlock'
import { validateVideoUrl, VideoBlock } from '../blocks/VideoBlock'
import { dofusGuideStrings } from '../lib/dofus-guides/strings'
import { guidePreviewUrl, previewOrigin } from '../lib/guides/preview'
import { stateField } from './achievement-fields'
import { isPanelUser, readPublishedOrAll } from './editorial-access'
import { validateOptionalUrl } from './Media'
import { validateSlug } from './QuestGuides'
import {
  revalidateDofusGuidesAfterChange,
  revalidateDofusGuidesAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'

const s = dofusGuideStrings.admin

/** Un color hexadecimal de seis cifras (#2a5aaa), o nada. Devuelve true o el mensaje. */
export function validateColor(value: string | null | undefined): true | string {
  if (!value) return true
  return /^#[0-9a-f]{6}$/i.test(value) ? true : s.colorInvalid
}

/** El vídeo es opcional; si lo hay, un enlace https de YouTube, como el bloque de vídeo. */
function validateOptionalVideo(value: string | null | undefined): true | string {
  return value ? validateVideoUrl(value) : true
}

type SiblingOptions = { siblingData?: { item?: unknown } }

/** Un objeto sin enlazar necesita su nombre: sin él la fila quedaría vacía. */
function validateNeedName(
  value: string | null | undefined,
  { siblingData }: SiblingOptions,
): true | string {
  if (value?.trim() || siblingData?.item) return true
  return s.needItemNameRequired
}

const note: Field = {
  name: 'note',
  label: 'Nota',
  type: 'text',
  localized: true,
  admin: { description: s.noteDescription },
}

// Una fila de Necesitarás: un objeto del juego con su cantidad, que se copia de un clic.
const NeedItemBlock: Block = {
  slug: 'needItem',
  interfaceName: 'DofusNeedItemBlock',
  labels: { singular: 'Objeto', plural: 'Objetos' },
  fields: [
    { name: 'item', label: 'Objeto', type: 'relationship', relationTo: 'items' },
    {
      name: 'quantity',
      label: 'Cantidad',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      localized: true,
      validate: validateNeedName,
      admin: { description: s.needItemNameDescription },
    },
    note,
  ],
}

// Una fila de Necesitarás que no es un objeto: un oficio, una mazmorra, kamas o una nota.
const NeedNoteBlock: Block = {
  slug: 'needNote',
  interfaceName: 'DofusNeedNoteBlock',
  labels: { singular: 'Nota', plural: 'Notas' },
  fields: [{ name: 'text', label: 'Texto', type: 'richText', required: true, localized: true }],
}

const achievementField: Field = {
  name: 'achievement',
  label: 'Logro',
  type: 'relationship',
  relationTo: 'achievement-pages',
  required: true,
}

// Un logro con sus misiones: salen de su página de logro, que es donde se editan.
const AchievementPartBlock: Block = {
  slug: 'dofusAchievement',
  interfaceName: 'DofusAchievementBlock',
  labels: { singular: 'Logro', plural: 'Logros' },
  fields: [achievementField, note],
}

// Un metalogro con sus logros en orden, como el Plateado («Un comienzo ejemplar»).
const MetalogroPartBlock: Block = {
  slug: 'dofusMetalogro',
  interfaceName: 'DofusMetalogroBlock',
  labels: { singular: 'Metalogro', plural: 'Metalogros' },
  fields: [
    { name: 'name', label: 'Nombre', type: 'text', required: true, localized: true },
    {
      name: 'achievements',
      label: 'Logros',
      labels: { singular: 'Logro', plural: 'Logros' },
      type: 'array',
      // Con el nombre por defecto, el índice de su tabla de versiones pasa de los 63
      // caracteres de Postgres y se truncaría.
      dbName: 'dofus_meta_ach',
      fields: [achievementField, note],
    },
  ],
}

// Una lista de misiones sueltas con su título, como «También algunas misiones random».
const QuestsPartBlock: Block = {
  slug: 'dofusQuests',
  interfaceName: 'DofusQuestsBlock',
  labels: { singular: 'Misiones sueltas', plural: 'Misiones sueltas' },
  fields: [
    { name: 'title', label: 'Título', type: 'text', localized: true },
    {
      name: 'quests',
      label: 'Misiones',
      labels: { singular: 'Misión', plural: 'Misiones' },
      type: 'array',
      fields: [
        {
          name: 'guide',
          label: 'Guía',
          type: 'relationship',
          relationTo: 'quest-guides',
          required: true,
        },
        note,
      ],
    },
  ],
}

// Una misión que es un paso por sí sola, como las de los dioses del Nebuloso.
const QuestPartBlock: Block = {
  slug: 'dofusQuest',
  interfaceName: 'DofusQuestBlock',
  labels: { singular: 'Misión', plural: 'Misiones' },
  fields: [
    {
      name: 'guide',
      label: 'Guía',
      type: 'relationship',
      relationTo: 'quest-guides',
      required: true,
    },
    note,
  ],
}

// Un consejo de Torre entre los logros, como el de la misión del Cacao.
const NotePartBlock: Block = {
  slug: 'dofusNote',
  interfaceName: 'DofusNoteBlock',
  labels: { singular: 'Nota', plural: 'Notas' },
  fields: [{ name: 'text', label: 'Texto', type: 'richText', required: true, localized: true }],
}

const richText = (name: string, label: string): Field => ({
  name,
  label,
  type: 'richText',
  localized: true,
})

// Las guías de los Dofus de Torre: qué pide cada Dofus y qué logros y misiones lo dan. Son
// de Torre, con borradores; las misiones de cada logro salen de su página de logro.
export const DofusGuides: CollectionConfig = {
  slug: 'dofus-guides',
  labels: { singular: 'Guía de Dofus', plural: 'Guías de Dofus' },
  admin: {
    useAsTitle: 'name',
    group: 'Guías',
    defaultColumns: ['name', 'order', 'state', '_status', 'updatedAt'],
    // La página pública en el panel, borrador incluido, como las guías y los logros.
    livePreview: {
      url: ({ data, req }) => guidePreviewUrl(data?.slug, previewOrigin(process.env, req.origin)),
      breakpoints: [{ name: 'movil', label: 'Móvil', width: 390, height: 844 }],
    },
    preview: (doc, { req }) => guidePreviewUrl(doc?.slug, previewOrigin(process.env, req.origin)),
  },
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    delete: isPanelUser,
  },
  versions: { drafts: true, maxPerDoc: 50 },
  defaultSort: 'order',
  hooks: {
    beforeValidate: [rejectSharedSlug('dofus-guides')],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateDofusGuidesAfterChange],
    afterDelete: [revalidateDofusGuidesAfterDelete],
  },
  fields: [
    {
      name: 'dofus',
      label: 'Dofus de DofusDB',
      type: 'relationship',
      relationTo: 'items',
      unique: true,
      admin: { description: s.dofusDescription },
    },
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
    stateField,
    {
      name: 'order',
      label: 'Orden',
      type: 'number',
      required: true,
      admin: { position: 'sidebar', description: s.orderDescription },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'level',
          label: 'Nivel',
          type: 'number',
          min: 1,
          admin: { description: s.levelDescription },
        },
        {
          name: 'tag',
          label: 'Etiqueta',
          type: 'select',
          options: (['primordial', 'event'] as const).map((value) => ({
            value,
            label: dofusGuideStrings.tags[value],
          })),
          admin: { description: s.tagDescription },
        },
        {
          name: 'color',
          label: 'Color',
          type: 'text',
          validate: validateColor,
          admin: { description: s.colorDescription },
        },
      ],
    },
    {
      name: 'aliases',
      label: 'Otros nombres',
      type: 'text',
      localized: true,
      admin: { description: s.aliasesDescription },
    },
    richText('prerequisites', 'Prerrequisitos'),
    {
      name: 'needs',
      label: 'Necesitarás',
      type: 'group',
      admin: { description: s.needsDescription },
      fields: [
        {
          name: 'title',
          label: 'Título',
          type: 'text',
          localized: true,
          admin: { description: s.needsTitleDescription },
        },
        {
          name: 'groups',
          label: 'Grupos',
          labels: { singular: 'Grupo', plural: 'Grupos' },
          type: 'array',
          fields: [
            { name: 'name', label: 'Nombre del grupo', type: 'text', localized: true },
            {
              name: 'rows',
              label: 'Filas',
              labels: { singular: 'Fila', plural: 'Filas' },
              type: 'blocks',
              blocks: [NeedItemBlock, NeedNoteBlock],
            },
          ],
        },
      ],
    },
    richText('rewards', 'Recompensas'),
    richText('intro', 'Introducción'),
    {
      name: 'parts',
      label: 'Logros y misiones',
      labels: { singular: 'Parte', plural: 'Partes' },
      type: 'blocks',
      admin: { description: s.partsDescription },
      blocks: [
        AchievementPartBlock,
        MetalogroPartBlock,
        QuestsPartBlock,
        QuestPartBlock,
        NotePartBlock,
      ],
    },
    {
      name: 'body',
      label: 'Paso a paso',
      labels: { singular: 'Bloque', plural: 'Bloques' },
      type: 'blocks',
      admin: { description: s.bodyDescription },
      blocks: [RichTextBlock, ImageBlock, VideoBlock, CalloutBlock, FightBlock, StepBlock],
    },
    richText('outro', 'Cierre'),
    {
      name: 'video',
      label: 'Vídeo',
      type: 'text',
      validate: validateOptionalVideo,
      admin: { description: s.videoDescription },
    },
    {
      name: 'videoPoster',
      label: 'Portada del vídeo',
      type: 'upload',
      relationTo: 'media',
      admin: { description: s.videoPosterDescription },
    },
    {
      name: 'checklist',
      label: 'Checklist',
      type: 'group',
      admin: { description: s.checklistDescription },
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', localized: true },
        { name: 'url', label: 'Enlace', type: 'text', validate: validateOptionalUrl },
      ],
    },
    {
      // Lo último que escribió la importación en cada campo: al repetirla, un campo que ya no
      // coincide lo cambió Torre y no se toca (scripts/import/dofus-guides/load.ts).
      name: 'importSnapshot',
      type: 'json',
      admin: { hidden: true },
    },
    {
      name: 'originalUrl',
      label: 'URL original',
      type: 'text',
      validate: validateOptionalUrl,
      admin: { position: 'sidebar', description: 'URL de la página en Squarespace' },
    },
  ],
}
