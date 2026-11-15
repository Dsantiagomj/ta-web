import type { Field, GlobalConfig } from 'payload'

import { isPanelUser } from '../collections/editorial-access'
import { panelStrings } from '../lib/admin/strings'
import { indexTextDefaults as d, type IndexSeo } from '../lib/site-copy/defaults'
import { siteCopyStrings } from '../lib/site-copy/strings'
import { copyField, revalidateSiteCopyAfterChange } from './site-copy-fields'

const s = siteCopyStrings.indexes
const home = d.home

/** Lo que ve Google de un índice: su título y su descripción. */
const seo = (defaults: IndexSeo): Field => ({
  name: 'seo',
  label: s.seo.label,
  type: 'group',
  fields: [
    copyField('title', s.seo.title, defaults.title),
    copyField('description', s.seo.description, defaults.description, { long: true }),
  ],
})

const group = (name: string, label: string, fields: Field[], description?: string): Field => ({
  name,
  label,
  type: 'group',
  ...(description && { admin: { description } }),
  fields,
})

/** Un punto de «Una guía para cada misión», con su número en el dibujo. */
const tourStep = (n: 1 | 2 | 3 | 4): Field => {
  const step = home.tour[`step${n}`]
  return group(`step${n}`, s.tour.step(n), [
    copyField('title', s.title, step.title),
    copyField('text', s.tour.stepText, step.text, { long: true }),
  ])
}

// Los textos de la portada y de cada índice (src/lib/site-copy/defaults.ts), una pestaña por
// página. El resto de cada índice sale de su colección; la entradilla de /guias-dofus y la
// tarjeta «???» de /checklists siguen en sus globales de Contenido.
export const IndexTexts: GlobalConfig = {
  slug: 'index-texts',
  label: s.label,
  admin: { group: panelStrings.groups.settings, hideAPIURL: true, description: s.intro },
  access: { read: () => true, update: isPanelUser },
  hooks: { afterChange: [revalidateSiteCopyAfterChange] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'home',
          label: s.tabs.home,
          description: s.homeDescription,
          fields: [
            copyField('eyebrow', s.eyebrow, home.eyebrow),
            copyField('title', s.title, home.title),
            copyField('lead', s.lead, home.lead, { long: true }),
            copyField('question', s.question, home.question),
            group('areas', s.areas.label, [
              copyField('title', s.title, home.areas.title),
              copyField('questsText', s.areas.questsText, home.areas.questsText, { long: true }),
              copyField('dofusText', s.areas.dofusText, home.areas.dofusText, { long: true }),
              copyField('checklistsText', s.areas.checklistsText, home.areas.checklistsText, {
                long: true,
              }),
              copyField('classesText', s.areas.classesText, home.areas.classesText, {
                long: true,
              }),
              copyField('dungeonsText', s.areas.dungeonsText, home.areas.dungeonsText, {
                long: true,
              }),
            ]),
            group(
              'tour',
              s.tour.label,
              [
                copyField('title', s.title, home.tour.title),
                copyField('lead', s.lead, home.tour.lead, { long: true }),
                tourStep(1),
                tourStep(2),
                tourStep(3),
                tourStep(4),
                copyField('more', s.tour.more, home.tour.more),
              ],
              s.tour.description,
            ),
            group('checklists', s.homeChecklists.label, [
              copyField('title', s.title, home.checklists.title),
              copyField('lead', s.lead, home.checklists.lead, { long: true }),
            ]),
            group('author', s.author.label, [
              copyField('title', s.title, home.author.title),
              copyField('lead', s.lead, home.author.lead, { long: true }),
              copyField('join', s.author.join, home.author.join),
              copyField('joinText', s.author.joinText, home.author.joinText, { long: true }),
              copyField('offlineTitle', s.author.offlineTitle, home.author.offlineTitle),
              copyField('offlineText', s.author.offlineText, home.author.offlineText, {
                long: true,
              }),
            ]),
          ],
        },
        {
          name: 'metalogros',
          label: s.tabs.metalogros,
          fields: [
            copyField('title', s.title, d.metalogros.title),
            copyField('lead', s.lead, d.metalogros.lead, { long: true }),
            seo(d.metalogros.seo),
          ],
        },
        {
          name: 'dofusGuides',
          label: s.tabs.dofusGuides,
          description: s.dofusGuidesDescription,
          fields: [
            copyField('eyebrow', s.eyebrow, d.dofusGuides.eyebrow),
            copyField('title', s.title, d.dofusGuides.title),
            seo(d.dofusGuides.seo),
          ],
        },
        {
          name: 'checklists',
          label: s.tabs.checklists,
          description: s.checklistsDescription,
          fields: [
            copyField('eyebrow', s.eyebrow, d.checklists.eyebrow),
            copyField('title', s.title, d.checklists.title),
            copyField('lead', s.lead, d.checklists.lead, { long: true }),
            copyField('empty', s.empty, d.checklists.empty, { long: true }),
            seo(d.checklists.seo),
          ],
        },
      ],
    },
  ],
}
