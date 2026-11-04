import type { Access, CollectionConfig } from 'payload'

import { CalloutBlock } from '../blocks/CalloutBlock'
import { ImageBlock } from '../blocks/ImageBlock'
import { RichTextBlock } from '../blocks/RichTextBlock'
import { VideoBlock } from '../blocks/VideoBlock'
import { firstQuestId } from '../lib/guides/autofill'
import { guideStrings } from '../lib/guides/strings'
import { validateOptionalUrl } from './Media'
import { fillFromQuest } from './quest-guide-autofill'

/**
 * Slug plano en ASCII: minúsculas, cifras y guiones sueltos, sin guiones en los extremos.
 * Sin tildes ni eñes, para que la URL no se codifique. Devuelve true o el mensaje de error.
 */
export function validateSlug(value: string | null | undefined): true | string {
  if (value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return true
  return 'El slug solo admite minúsculas sin tildes, cifras y guiones sueltos (aprendizaje-escudero)'
}

type GuideValidationOptions = { data: { quests?: unknown } }

/**
 * Título vacío solo si hay misión: al guardar, fillFromQuest pone su nombre. Sin misión,
 * el panel pide un título con un mensaje claro.
 */
export function validateGuideTitle(
  value: string | null | undefined,
  { data }: GuideValidationOptions,
): true | string {
  if (value?.trim() || firstQuestId(data?.quests) !== null) return true
  return guideStrings.admin.titleRequired
}

/** Como validateSlug, pero vacío vale si hay misión: el slug sale de ella al guardar. */
export function validateGuideSlug(
  value: string | null | undefined,
  { data }: GuideValidationOptions,
): true | string {
  if (!value && firstQuestId(data?.quests) !== null) return true
  return validateSlug(value)
}

// Las cuentas del panel son las únicas sesiones de Payload: los miembros usan Better Auth.
const isPanelUser: Access = ({ req: { user } }) => Boolean(user)

// Torre ve todo desde el panel, borradores incluidos; el resto solo ve lo publicado.
const readPublishedOrAll: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }

export const questGuidesAccess = {
  read: readPublishedOrAll,
  create: isPanelUser,
  update: isPanelUser,
  delete: isPanelUser,
}

// Guías de misiones de Torre. Se empieza eligiendo la misión de DofusDB: de ella salen el
// título, el slug, el SEO y el resumen. El resumen guarda solo lo que Torre cambia; la
// importación lo rellena con lo que había en Squarespace.
export const QuestGuides: CollectionConfig = {
  slug: 'quest-guides',
  labels: { singular: 'Guía de misión', plural: 'Guías de misiones' },
  admin: {
    useAsTitle: 'title',
    group: 'Guías',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  access: questGuidesAccess,
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: { beforeValidate: [fillFromQuest] },
  fields: [
    {
      name: 'quests',
      label: 'Misiones',
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
      admin: {
        description: guideStrings.admin.questsDescription,
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
      fields: [
        { name: 'prerequisites', label: 'Prerrequisitos', type: 'textarea', localized: true },
        { name: 'needs', label: 'Necesitarás', type: 'textarea', localized: true },
        { name: 'rewards', label: 'Recompensas', type: 'textarea', localized: true },
        { name: 'startNpc', label: 'PNJ de inicio', type: 'text', localized: true },
        { name: 'startX', label: 'X de inicio', type: 'number' },
        { name: 'startY', label: 'Y de inicio', type: 'number' },
      ],
    },
    {
      name: 'body',
      label: 'Contenido',
      labels: { singular: 'Bloque', plural: 'Bloques' },
      type: 'blocks',
      blocks: [RichTextBlock, ImageBlock, VideoBlock, CalloutBlock],
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
