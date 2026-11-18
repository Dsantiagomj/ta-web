import type { CollectionConfig, Field, SelectFieldSingleValidation, Tab } from 'payload'
import { select } from 'payload/shared'

import { CalloutBlock } from '../blocks/CalloutBlock'
import { FightBlock } from '../blocks/FightBlock'
import { ImageBlock } from '../blocks/ImageBlock'
import { RichTextBlock } from '../blocks/RichTextBlock'
import { StepBlock } from '../blocks/StepBlock'
import { TableBlock } from '../blocks/TableBlock'
import { VideoBlock } from '../blocks/VideoBlock'
import { withPublishStatus } from '../lib/admin/live-preview'
import { panelStrings } from '../lib/admin/strings'
import type { SectionPageStrings } from '../lib/section-pages/strings'
import { stateField } from './achievement-fields'
import {
  adminOrNotImported,
  clearOnDuplicate,
  isPanelUser,
  readPublishedOrAll,
} from './editorial-access'
import { validateOptionalUrl } from './Media'
import { validateSlug } from './QuestGuides'
import {
  revalidateSectionPagesAfterChange,
  revalidateSectionPagesAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'
import { applySlugMove, trackSlugMove } from './slug-redirects'
import { SLUG_LABEL, slugAdmin } from './slug-field'

// Lo que comparten las páginas de clase y de mazmorra de Torre (backlog S-10 y S-11): el
// título, la dirección de su web, su estado y su enlace a Squarespace, si salen en el menú,
// el texto con los bloques de las guías, el SEO y la marca de la importación. Como las páginas
// sueltas, pero sin página pública todavía: mientras no la haya, no pueden estar Publicadas.

type SectionPageSlug = 'class-pages' | 'dungeon-pages'

export interface SectionPageOptions {
  slug: SectionPageSlug
  labels: { singular: string; plural: string }
  strings: SectionPageStrings
  /** Los campos propios de la barra lateral, tras «Sale en el menú». */
  sidebar?: Field[]
  /** Las pestañas propias, delante de la del texto. */
  tabsBefore?: Tab[]
}

/** «Publicada» llevaría a una página que aún no existe: se pide En preparación. */
const notPublishedYet =
  (message: string): SelectFieldSingleValidation =>
  (value, options) =>
    value === 'published' ? message : select(value, options)

/** Las colecciones de las páginas de clase y de mazmorra, con sus campos propios. */
export function sectionPageCollection(options: SectionPageOptions): CollectionConfig {
  const { slug, strings: s } = options
  const contentTab: Tab = {
    label: s.tabs.content,
    fields: [
      {
        name: 'body',
        label: 'Contenido',
        labels: { singular: 'Bloque', plural: 'Bloques' },
        type: 'blocks',
        admin: { description: s.bodyDescription },
        blocks: [
          RichTextBlock,
          ImageBlock,
          VideoBlock,
          CalloutBlock,
          FightBlock,
          TableBlock,
          StepBlock,
        ],
      },
    ],
  }
  const seoTab: Tab = {
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
  }

  return {
    slug,
    labels: options.labels,
    admin: {
      useAsTitle: 'title',
      group: panelStrings.groups.content,
      hideAPIURL: true,
      defaultColumns: ['title', 'state', '_status', 'updatedAt'],
      listSearchableFields: ['title', 'slug'],
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
      beforeValidate: [rejectSharedSlug(slug)],
      beforeChange: [trackSlugMove(slug)],
      // El menú lee lo publicado con caché: guardar o borrar la caduca.
      afterChange: [revalidateSectionPagesAfterChange, applySlugMove(slug)],
      afterDelete: [revalidateSectionPagesAfterDelete],
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
      {
        ...stateField,
        hasMany: false,
        validate: notPublishedYet(s.notYet),
        admin: { ...stateField.admin, description: s.stateDescription },
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
        name: 'inMenu',
        label: 'Sale en el menú',
        type: 'checkbox',
        defaultValue: true,
        admin: { position: 'sidebar', description: s.inMenuDescription },
      },
      {
        name: 'menuName',
        label: 'Nombre en el menú',
        type: 'text',
        localized: true,
        admin: { position: 'sidebar', description: s.menuNameDescription },
      },
      ...(options.sidebar ?? []),
      // Pestañas sin nombre: solo ordenan el formulario; los datos se guardan igual (A-22).
      { type: 'tabs', tabs: [...(options.tabsBefore ?? []), contentTab, seoTab] },
      {
        // Lo último que escribió la importación: al repetirla, un campo que ya no coincide lo
        // cambió Torre y no se toca. La copia es del editor que la hace.
        name: 'importSnapshot',
        type: 'json',
        hooks: { beforeDuplicate: [clearOnDuplicate] },
        admin: { hidden: true },
      },
    ]),
  }
}
