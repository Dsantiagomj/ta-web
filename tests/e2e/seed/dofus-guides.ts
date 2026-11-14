// Las guías de Dofus de prueba de las E2E y Lighthouse CI: el «Dofus Ocre» completo (su huevo,
// Prerrequisitos, Necesitarás, el logro sembrado «La ocasión hace al ladrón» con sus misiones,
// una misión suelta con la nota de Torre, la checklist y el vídeo), el «Dofawa» publicado sin
// logros y el «Jyfus» En preparación; y la entradilla del índice. Se siembra después de las
// guías y del logro; repetirlo no duplica nada.
import path from 'node:path'
import type { Payload } from 'payload'

import { seedAchievement } from './achievements'
import { seedGuide } from './guides'

/** Un texto enriquecido de uno o más párrafos, como lo guarda el editor del panel. */
const paragraph = (...texts: string[]) => ({
  root: {
    type: 'root',
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
    children: texts.map((text) => ({
      type: 'paragraph',
      direction: null,
      format: '',
      indent: 0,
      version: 1,
      textFormat: 0,
      textStyle: '',
      children: [
        { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
      ],
    })),
  },
})

export const seedDofus = {
  index: { intro: 'Descubre aquí todas las diferentes guías de los Dofus.' },
  ocre: {
    slug: 'dofus-ocre',
    name: 'Dofus Ocre',
    egg: 'public/img/game/dofus/dofus-ocre.webp',
    meta: '1 logro - 4 misiones - Nivel 160',
    tag: 'Primordial',
    prerequisite: 'Nivel mínimo 40.',
    intro: 'Para obtener tu Dofus Ocre, necesitarás cumplir con el logro El fin de la eternidad.',
    // Dos objetos con la nota en medio, como los escribe Torre: la página pone las notas detrás.
    needsItems: [
      { name: 'Pico de tofu', quantity: 3 },
      { name: 'Ojo de arakmutada', quantity: 1 },
    ],
    needsNote: 'Piedras de alma de jefes de mazmorra y archimonstruos.',
    // La misma nota sigue en un segundo párrafo: los dos van uno debajo del otro.
    needsNoteMore: 'También sirven las del mercadillo.',
    looseTitle: 'También algunas misiones random',
    looseNote: '(solo empezarla)',
    checklist: { name: 'Almas del Ocre', url: 'https://www.torrentearcano.com/lista-ocre' },
    video: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ',
  },
  // Un paso a paso como el de la Piñata de pino: prosa, una captura, un paso y el cierre.
  dofawa: {
    slug: 'dofawa',
    name: 'Dofawa',
    bodyIntro: 'Allí encontrarás a Gobalden con el que tienes que hablar.',
    bodyImageAlt: 'Las respuestas correctas para Gobalden',
    bodyStep: 'Después, dirígete a Valonia [38,-80] y habla con Goblepino.',
    bodyOutro: 'Por fin obtendrás tu Dofawa xD Así de simple.',
  },
  jyfus: { slug: 'jyfus', name: 'Jyfus' },
}

async function findOne<T extends { id: number }>(
  payload: Payload,
  collection: 'items' | 'achievement-pages' | 'quest-guides' | 'dofus-guides' | 'media',
  field: string,
  value: string | number,
): Promise<T | undefined> {
  const { docs } = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  return docs[0] as unknown as T | undefined
}

/** Siembra las tres guías de Dofus y la entradilla del índice; repetirla no duplica nada. */
export async function seedDofusGuides(payload: Payload): Promise<void> {
  const achievement = await findOne(payload, 'achievement-pages', 'slug', seedAchievement.slug)
  const loose = await findOne(payload, 'quest-guides', 'slug', seedGuide.slug)
  const needItems = await Promise.all(
    seedDofus.ocre.needsItems.map(({ name }) => findOne(payload, 'items', 'name', name)),
  )
  if (!achievement || !loose || needItems.some((item) => !item)) {
    throw new Error('Faltan el logro, la guía o el objeto de prueba: siembra antes las guías')
  }

  const eggKey = 'dofusdb-item-image:23012:e2e'
  const egg =
    (await findOne(payload, 'media', 'gameAsset', eggKey)) ??
    (await payload.create({
      collection: 'media',
      data: { alt: seedDofus.ocre.name, gameAsset: eggKey },
      filePath: path.resolve(seedDofus.ocre.egg),
    }))
  const dofusItem =
    (await findOne(payload, 'items', 'dofusId', 7754)) ??
    (await payload.create({
      collection: 'items',
      data: { dofusId: 7754, name: 'Dofus Ocre', level: 160, image: egg.id },
    }))

  const bodyImage =
    (await findOne(payload, 'media', 'alt', seedDofus.dofawa.bodyImageAlt)) ??
    (await payload.create({
      collection: 'media',
      data: { alt: seedDofus.dofawa.bodyImageAlt },
      filePath: path.resolve(seedDofus.ocre.egg),
    }))

  const { ocre } = seedDofus
  const guides = [
    {
      slug: seedDofus.dofawa.slug,
      name: seedDofus.dofawa.name,
      order: 1,
      state: 'published' as const,
      level: 6,
      color: '#ff9118',
      body: [
        { blockType: 'richText' as const, content: paragraph(seedDofus.dofawa.bodyIntro) },
        {
          blockType: 'image' as const,
          image: bodyImage.id,
        },
        {
          blockType: 'step' as const,
          x: 38,
          y: -80,
          body: [{ blockType: 'richText' as const, content: paragraph(seedDofus.dofawa.bodyStep) }],
        },
        { blockType: 'richText' as const, content: paragraph(seedDofus.dofawa.bodyOutro) },
      ],
    },
    {
      slug: seedDofus.jyfus.slug,
      name: seedDofus.jyfus.name,
      order: 2,
      state: 'preparing' as const,
      level: 20,
      tag: 'event' as const,
    },
    {
      slug: ocre.slug,
      name: ocre.name,
      order: 3,
      state: 'published' as const,
      level: 160,
      tag: 'primordial' as const,
      color: '#d18b23',
      dofus: dofusItem.id,
      prerequisites: paragraph(ocre.prerequisite),
      intro: paragraph(ocre.intro),
      needs: {
        groups: [
          {
            rows: [
              {
                blockType: 'needItem' as const,
                item: needItems[0]!.id,
                quantity: ocre.needsItems[0]!.quantity,
              },
              {
                blockType: 'needNote' as const,
                text: paragraph(ocre.needsNote, ocre.needsNoteMore),
              },
              {
                blockType: 'needItem' as const,
                item: needItems[1]!.id,
                quantity: ocre.needsItems[1]!.quantity,
              },
            ],
          },
        ],
      },
      parts: [
        { blockType: 'dofusAchievement' as const, achievement: achievement.id },
        {
          blockType: 'dofusQuests' as const,
          title: ocre.looseTitle,
          quests: [{ guide: loose.id, note: ocre.looseNote }],
        },
      ],
      checklist: ocre.checklist,
      video: ocre.video,
    },
  ]
  for (const guide of guides) {
    const existing = await findOne(payload, 'dofus-guides', 'slug', guide.slug)
    // En una base reutilizada, la Dofawa sembrada antes del paso a paso lo recibe ahora.
    if (existing && 'body' in guide) {
      await payload.update({
        collection: 'dofus-guides',
        id: existing.id,
        data: { body: guide.body } as never,
      })
    }
    if (existing) continue
    await payload.create({
      collection: 'dofus-guides',
      data: { ...guide, _status: 'published' } as never,
    })
  }

  const index = await payload.findGlobal({ slug: 'dofus-guides-index', depth: 0 })
  if (!index.intro) {
    await payload.updateGlobal({
      slug: 'dofus-guides-index',
      data: { intro: paragraph(seedDofus.index.intro) as never },
    })
  }
}
