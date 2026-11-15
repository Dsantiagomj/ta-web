import type { CollectionConfig } from 'payload'

import { CalloutBlock } from '../blocks/CalloutBlock'
import { FightBlock } from '../blocks/FightBlock'
import { ImageBlock } from '../blocks/ImageBlock'
import { RichTextBlock } from '../blocks/RichTextBlock'
import { StepBlock } from '../blocks/StepBlock'
import { VideoBlock } from '../blocks/VideoBlock'
import { pagePreview, withPublishStatus } from '../lib/admin/live-preview'
import { panelStrings } from '../lib/admin/strings'
import { sitePageStrings } from '../lib/pages/strings'
import { stateField } from './achievement-fields'
import {
  adminOrNotImported,
  clearOnDuplicate,
  isPanelUser,
  readPublishedOrAll,
} from './editorial-access'
import { validateOptionalUrl } from './Media'
import { validateSlug } from './QuestGuides'
import { revalidatePagesAfterChange, revalidatePagesAfterDelete } from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'
import { applySlugMove, trackSlugMove } from './slug-redirects'
import { SLUG_LABEL, slugAdmin } from './slug-field'

const s = sitePageStrings.admin

// Las páginas sueltas de Torre (backlog B-09): emotes, cómo llegar a un sitio y los textos
// legales, en /<slug> con los bloques de las guías de misión. Como las checklists, mientras
// están En preparación su dirección lleva a su página de Squarespace (`legacyHref`).
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Página', plural: 'Páginas' },
  admin: {
    useAsTitle: 'title',
    group: panelStrings.groups.content,
    hideAPIURL: true,
    defaultColumns: ['title', 'state', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    // La página pública en el panel, borrador incluido, como las guías.
    ...pagePreview,
  },
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    // Lo importado de Squarespace solo lo borra un administrador (backlog A-15).
    delete: adminOrNotImported('importSnapshot'),
  },
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: {
    beforeValidate: [rejectSharedSlug('pages')],
    // Borradores incluidos: es barato y cubre despublicar.
    beforeChange: [trackSlugMove('pages')],
    afterChange: [revalidatePagesAfterChange, applySlugMove('pages')],
    afterDelete: [revalidatePagesAfterDelete],
  },
  fields: withPublishStatus([
    {
      name: 'title',
      label: 'Título',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: s.titleDescription },
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
      name: 'parent',
      label: 'Página superior',
      type: 'relationship',
      relationTo: 'pages',
      // Una página no es su propia superior.
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: { position: 'sidebar', description: s.parentDescription },
    },
    // Pestañas sin nombre: solo ordenan el formulario; los datos se guardan igual (A-22).
    {
      type: 'tabs',
      tabs: [
        {
          label: s.tabs.content,
          fields: [
            {
              name: 'body',
              label: 'Contenido',
              labels: { singular: 'Bloque', plural: 'Bloques' },
              type: 'blocks',
              admin: { description: s.bodyDescription },
              blocks: [RichTextBlock, ImageBlock, VideoBlock, CalloutBlock, FightBlock, StepBlock],
            },
          ],
        },
        {
          label: s.tabs.seo,
          fields: [
            {
              name: 'seo',
              label: 'SEO',
              type: 'group',
              admin: { description: s.seoDescription },
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
          ],
        },
      ],
    },
    {
      // Lo último que escribió la importación (scripts/import/pages): al repetirla, un campo
      // que ya no coincide lo cambió Torre y no se toca. La copia es del editor que la hace.
      name: 'importSnapshot',
      type: 'json',
      hooks: { beforeDuplicate: [clearOnDuplicate] },
      admin: { hidden: true },
    },
  ]),
}
