// Guías de prueba para las E2E y Lighthouse CI: «Seis pies bajo tierra» (DofusDB 1976)
// publicada con una entrada, tres pasos (texto, imagen, aviso y consejo dentro) y un cierre
// con el vídeo, con su zona, su logro, el rango de XP y el PNJ con sus renders; la guía
// publicada de su prerrequisito, solo prosa; y un borrador sin publicar.
// Las pruebas leen de aquí lo que esperan ver. Se siembra con scripts/seed-e2e.ts sobre
// la base vacía de las pruebas, nunca sobre una real.
import path from 'node:path'
import type { Payload } from 'payload'

import type { RichTextBlock } from '../../../src/payload-types.ts'

/** Un usuario del panel de las pruebas, para la vista previa. Solo existe en la base local. */
export const E2E_PANEL_USER = {
  email: 'e2e@torrentearcano.test',
  password: 'e2e-clave-solo-local',
  role: 'admin' as const,
}

/** Un editor del panel (backlog A-15): crea, edita y publica, pero no borra lo importado. */
export const E2E_EDITOR_USER = {
  email: 'e2e-editor@torrentearcano.test',
  password: 'e2e-editor-solo-local',
  role: 'editor' as const,
}

/**
 * Otra cuenta de administrador, como la de Torre, para las pruebas de la ola 2 del panel
 * (panel-ola2.spec.ts): cada inicio de sesión reescribe las sesiones de su cuenta, y dos a
 * la vez en la misma cuenta pueden borrarse entre sí. Solo existe en la base local.
 */
export const E2E_PANEL_USER_2 = {
  email: 'e2e-ola2@torrentearcano.test',
  password: 'e2e-clave-solo-local-2',
  role: 'admin' as const,
}

/** La tercera, para las pruebas de accesibilidad del panel (panel-a11y.spec.ts). */
export const E2E_PANEL_USER_3 = {
  email: 'e2e-a11y@torrentearcano.test',
  password: 'e2e-clave-solo-local-3',
  role: 'admin' as const,
}

/** La cuarta, para el Ocre (checklist-ocre.spec.ts), que abre su vista previa en cada prueba. */
export const E2E_PANEL_USER_4 = {
  email: 'e2e-ocre@torrentearcano.test',
  password: 'e2e-clave-solo-local-4',
  role: 'admin' as const,
}

export const seedGuide = {
  slug: 'seis-pies-bajo-tierra',
  title: 'Seis pies bajo tierra',
  level: 20,
  zone: 'Astrub',
  achievement: {
    name: 'La ocasión hace al ladrón',
    slug: 'la-ocasion-hace-al-ladron',
    position: 2,
  },
  subtitle: 'Misión de Astrub - Nivel 20 - Misión 2 de 3',
  start: { npc: 'Hupe Esse', x: 7, y: -19 },
  // Los renders del PNJ, como los importa pnpm data:quests (los del catálogo).
  giver: {
    npcId: 4412,
    right: 'public/img/sistema/npc-4412-right.webp',
    left: 'public/img/sistema/npc-4412-left.webp',
  },
  // La guía previa, solo prosa; su Necesitarás lleva los combates y mazmorras de Ocre de
  // ámbar, para que el logro tenga una lista larga que se reparta en columnas.
  prerequisite: {
    title: 'Esto hace aguas',
    slug: 'esto-hace-aguas',
    needsNote: [
      '6 x Combates solitarios.',
      '1 x Mazmorra de Grunob.',
      '2 x Combate realizable en grupo.',
      '1 x Combate de oleadas realizable en grupo.',
      '1 x Mazmorra Kodámade.',
      '1 x Combate táctico solitario.',
      '1 x Combate solitario.',
    ].join('\n'),
    // Una nota que no casa sola con ninguna mazmorra, con la suya elegida a mano en el panel
    // («Mazmorras de las notas»). La semilla solo tiene una mazmorra: la de Kumijo.
    pickedDungeon: '1 x Mazmorra Kodámade.',
  },
  // Un combate; una nota que es el nombre exacto de un objeto importado (el logro la pinta
  // como ese objeto) y otra que no es ni objeto ni combate («Otros» en el logro).
  // Con dos notas de mazmorra: una nombra a su jefe (la del seed, con su imagen) y otra
  // ninguna en concreto; y una nota larga de Torre, para ver cómo se parte.
  needsNote: [
    '1 x Combate (solo).',
    '1 x Pico de tofu.',
    'Hechizo Captura de almas.',
    '1 x Mazmorra Kumijo',
    'Mazmorras nivel 200',
    '12 x Delicia de los kitsus (un consumible que puedes fabricar con cazador nivel 120+ pero lo puedes comprar en el mercadillo xD)',
  ].join('\n'),
  // La mazmorra de esa nota, con su jefe y la imagen del jefe (DofusDB, gfxId).
  dungeon: {
    dofusId: 131,
    name: 'Casa de los Espíritus',
    boss: { dofusId: 6394, name: 'Kumijo', gfxId: 2097 },
  },
  // Los objetos de Necesitarás, de los de la recompensa: dos, para ver sus columnas.
  needsItems: [
    { name: 'Intestino de araknáusea', quantity: 2 },
    { name: 'Pelos de arakna enferma', quantity: 1 },
  ],
  reward: { xp: 16380, xpMin: 9800, kamas: 390 },
  // Las recompensas como las escribe Torre. Con recompensas de DofusDB, la cabecera usa
  // las de DofusDB (rango de XP incluido); este texto solo sale sin ellas.
  rewardsText: '16 380 XP.\n390 kamas.\n4 objetos del Botín.',
  rewardItems: [
    'Pico de tofu',
    'Intestino de araknáusea',
    'Pelos de arakna enferma',
    'Ojo de arakmutada',
  ],
  // Los monstruos del combate del paso 2, con la imagen importada (DofusDB, gfxId).
  fight: [
    { dofusId: 5281, name: 'Ramán famélico', gfxId: 241 },
    { dofusId: 5282, name: 'Milirrata famélica', gfxId: 239 },
    { dofusId: 5283, name: 'Miserata famélica', gfxId: 254 },
  ],
  intro: 'Tres pasos en la mina de Astrub para rescatar a las anutrof.',
  startLine: 'para empezar la misión.',
  // Lo que hace cada paso, en orden; el bloque Paso no guarda título. La captura del
  // primero es la primera imagen: va con prioridad. El tercero no lleva negrita, como
  // muchos pasos importados.
  steps: ['Habla con Hupe Esse', 'Combate: protege a las anutrof', 'Escolta a las anutrof'],
  tips: 'En la preparación del combate, ordénalas lo más lejos posible.',
  outro: 'Aquí termina la misión. Espero haberte ayudado.',
  image: {
    file: 'public/img/sistema/seis-pies-hupe-esse.webp',
    alt: 'El personaje humanoide recibe un paquete en una biblioteca de madera, con una librería llena de libros y una escalera de madera.',
    caption: 'Hupe Esse, en la Biblioteca de Astrub.',
  },
  // La segunda captura del paso 1: con la primera, una pareja en la rejilla del paso.
  secondImage: {
    file: 'public/img/sistema/seis-pies-combate.webp',
    alt: 'Un combate por turnos en una sala de piedra con tuberías: el personaje y las anutrof frente a tres monstruos.',
  },
  callout: 'Debes ganar esta lucha sin que se muera ninguna de ellas.',
  video: {
    url: 'https://www.youtube.com/watch?v=VaY3tyYTq4A',
    title: 'El camino hacia los ron marino | DOFUS 3.0',
  },
  seo: {
    metaTitle: 'Seis pies bajo tierra: guía de la misión de Dofus',
    metaDescription:
      'Guía paso a paso de la misión Seis pies bajo tierra de Dofus, de nivel 20: requisitos, recompensas (16 380 XP) y cómo completarla.',
  },
}

/** Un borrador que nunca se publicó: 404 para un visitante, visible en la vista previa. */
export const draftGuide = {
  slug: 'el-cazador-cazado',
  title: 'El cazador cazado',
  body: 'Este borrador todavía no se ha publicado.',
}

// ---------- Lexical ----------

type LexicalNode = Record<string, unknown>

const text = (value: string, format = 0): LexicalNode => ({
  type: 'text',
  text: value,
  format,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})

const element = (type: string, children: LexicalNode[], extra: LexicalNode = {}): LexicalNode => ({
  type,
  children,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  ...extra,
})

const paragraph = (...children: LexicalNode[]) =>
  element('paragraph', children, { textFormat: 0, textStyle: '' })

const heading = (tag: 'h2' | 'h3', value: string) => element('heading', [text(value)], { tag })

const richText = (...children: LexicalNode[]) =>
  ({ root: element('root', children) }) as unknown as RichTextBlock['content']

const BOLD = 1

// ---------- siembra ----------

async function findOrCreate<T extends { id: number }>(
  find: () => Promise<{ docs: T[] }>,
  create: () => Promise<T>,
): Promise<T> {
  return (await find()).docs[0] ?? create()
}

async function quest(
  payload: Payload,
  data: { dofusId: number; name: string } & Record<string, unknown>,
) {
  return findOrCreate(
    () =>
      payload.find({
        collection: 'quests',
        where: { dofusId: { equals: data.dofusId } },
        limit: 1,
      }),
    () => payload.create({ collection: 'quests', data }),
  )
}

async function item(payload: Payload, dofusId: number, name: string) {
  // El icono, como lo importa pnpm data:quests: un archivo de Media con su clave.
  const icon = await media(
    payload,
    `dofusdb-item-image:e2e-${dofusId}`,
    `public/img/sistema/item-${dofusId}.webp`,
    name,
  )
  return findOrCreate(
    () => payload.find({ collection: 'items', where: { dofusId: { equals: dofusId } }, limit: 1 }),
    () =>
      payload.create({
        collection: 'items',
        data: { dofusId, name, superTypeId: 9, image: icon.id },
      }),
  )
}

async function monster(payload: Payload, dofusId: number, name: string, gfxId: number) {
  const image = await media(
    payload,
    `dofusdb-monster-image:e2e-${gfxId}`,
    `public/img/sistema/monster-${gfxId}.webp`,
    name,
  )
  return findOrCreate(
    () =>
      payload.find({ collection: 'monsters', where: { dofusId: { equals: dofusId } }, limit: 1 }),
    () =>
      payload.create({
        collection: 'monsters',
        data: { dofusId, name, iconId: gfxId, image: image.id },
      }),
  )
}

async function media(payload: Payload, gameAsset: string, file: string, alt: string) {
  return findOrCreate(
    () =>
      payload.find({ collection: 'media', where: { gameAsset: { equals: gameAsset } }, limit: 1 }),
    () =>
      payload.create({
        collection: 'media',
        data: { alt, gameAsset },
        filePath: path.resolve(file),
      }),
  )
}

async function guideExists(payload: Payload, slug: string) {
  const { totalDocs } = await payload.count({
    collection: 'quest-guides',
    where: { slug: { equals: slug } },
  })
  return totalDocs > 0
}

/** Siembra las guías de prueba; repetirla no duplica nada. */
export async function seedGuides(payload: Payload): Promise<void> {
  for (const user of [
    E2E_PANEL_USER,
    E2E_EDITOR_USER,
    E2E_PANEL_USER_2,
    E2E_PANEL_USER_3,
    E2E_PANEL_USER_4,
  ]) {
    const users = await payload.count({
      collection: 'users',
      where: { email: { equals: user.email } },
    })
    if (users.totalDocs === 0) await payload.create({ collection: 'users', data: user })
  }

  // La misión previa es la 1 del mismo logro: su guía acaba con la tarjeta de esta.
  const previous = await quest(payload, {
    dofusId: 1975,
    name: seedGuide.prerequisite.title,
    levelMin: 15,
    achievement: { dofusId: 1671, position: 1, total: 3 },
  })
  const fightMonsters = []
  for (const { dofusId, name, gfxId } of seedGuide.fight) {
    fightMonsters.push(await monster(payload, dofusId, name, gfxId))
  }
  const { dungeon } = seedGuide
  const boss = await monster(payload, dungeon.boss.dofusId, dungeon.boss.name, dungeon.boss.gfxId)
  const casa = await findOrCreate(
    () =>
      payload.find({
        collection: 'dungeons',
        where: { dofusId: { equals: dungeon.dofusId } },
        limit: 1,
      }),
    () =>
      payload.create({
        collection: 'dungeons',
        data: { dofusId: dungeon.dofusId, name: dungeon.name, bosses: [boss.id] },
      }),
  )
  const rewardIds = await Promise.all(
    [
      [366, 'Pico de tofu'],
      [373, 'Intestino de araknáusea'],
      [388, 'Pelos de arakna enferma'],
      [2491, 'Ojo de arakmutada'],
    ].map(([dofusId, name]) => item(payload, dofusId as number, name as string)),
  )
  const needsItems = seedGuide.needsItems.map(({ name, quantity }) => {
    const found = rewardIds.find((reward) => reward.name === name)
    if (!found) throw new Error(`Falta el objeto de Necesitarás ${name}`)
    return { item: found.id, quantity }
  })
  const main = await quest(payload, {
    dofusId: 1976,
    name: seedGuide.title,
    levelMin: seedGuide.level,
    zone: seedGuide.zone,
    achievement: { dofusId: 1671, ...seedGuide.achievement, total: 3 },
    prerequisites: [previous.id],
    startPositions: [
      {
        npcId: seedGuide.giver.npcId,
        npcName: seedGuide.start.npc,
        mapId: 192415748,
        x: 7,
        y: -19,
      },
    ],
    rewards: {
      experience: seedGuide.reward.xp,
      experienceMin: seedGuide.reward.xpMin,
      kamas: seedGuide.reward.kamas,
      // En el orden de DofusDB: Torre los lista al revés.
      items: [...rewardIds].reverse().map((reward) => ({ item: reward.id, quantity: 1 })),
    },
  })
  const hunter = await quest(payload, {
    dofusId: 1977,
    name: draftGuide.title,
    levelMin: 25,
    achievement: { dofusId: 1671, position: 3, total: 3 },
  })

  const { npcId, right, left } = seedGuide.giver
  const renderRight = await media(
    payload,
    `dofusdb-npc-render:${npcId}:right:e2e`,
    right,
    seedGuide.start.npc,
  )
  const renderLeft = await media(
    payload,
    `dofusdb-npc-render:${npcId}:left:e2e`,
    left,
    seedGuide.start.npc,
  )
  await findOrCreate(
    () => payload.find({ collection: 'npcs', where: { dofusId: { equals: npcId } }, limit: 1 }),
    () =>
      payload.create({
        collection: 'npcs',
        data: {
          dofusId: npcId,
          name: seedGuide.start.npc,
          look: '{74||3=12993798,4=16707303}',
          renderRight: renderRight.id,
          renderLeft: renderLeft.id,
        },
      }),
  )

  // Por el texto alternativo: si ./media ya tiene el archivo, Payload sube la copia con otro nombre.
  const image = await findOrCreate(
    () =>
      payload.find({
        collection: 'media',
        where: { alt: { equals: seedGuide.image.alt } },
        limit: 1,
      }),
    () =>
      payload.create({
        collection: 'media',
        data: { alt: seedGuide.image.alt },
        filePath: path.resolve(seedGuide.image.file),
      }),
  )

  const secondImage = await findOrCreate(
    () =>
      payload.find({
        collection: 'media',
        where: { alt: { equals: seedGuide.secondImage.alt } },
        limit: 1,
      }),
    () =>
      payload.create({
        collection: 'media',
        data: { alt: seedGuide.secondImage.alt },
        filePath: path.resolve(seedGuide.secondImage.file),
      }),
  )

  if (!(await guideExists(payload, seedGuide.prerequisite.slug))) {
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: seedGuide.prerequisite.title,
        slug: seedGuide.prerequisite.slug,
        quest: previous.id,
        _status: 'published',
        summary: {
          needs: {
            notes: seedGuide.prerequisite.needsNote,
            dungeons: [{ note: seedGuide.prerequisite.pickedDungeon, dungeon: casa.id }],
          },
        },
        body: [
          { blockType: 'richText', content: richText(paragraph(text('Habla con Hupe Esse.'))) },
        ],
      },
    })
  }

  if (!(await guideExists(payload, seedGuide.slug))) {
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: seedGuide.title,
        slug: seedGuide.slug,
        quest: main.id,
        _status: 'published',
        summary: {
          prerequisites: `${seedGuide.prerequisite.title}.`,
          rewards: seedGuide.rewardsText,
          needs: { items: needsItems, notes: seedGuide.needsNote },
          startNpc: seedGuide.start.npc,
          startX: seedGuide.start.x,
          startY: seedGuide.start.y,
        },
        seo: seedGuide.seo,
        body: [
          { blockType: 'richText', content: richText(paragraph(text(seedGuide.intro))) },
          {
            blockType: 'step',
            x: seedGuide.start.x,
            y: seedGuide.start.y,
            body: [
              {
                blockType: 'richText',
                content: richText(
                  paragraph(
                    text('Habla con '),
                    text(seedGuide.start.npc, BOLD),
                    text(` [7,-19] ${seedGuide.startLine}`),
                  ),
                ),
              },
              { blockType: 'image', image: image.id, caption: seedGuide.image.caption },
              { blockType: 'image', image: secondImage.id },
            ],
          },
          {
            blockType: 'step',
            x: 3,
            y: -17,
            body: [
              {
                blockType: 'richText',
                content: richText(
                  paragraph(
                    text('Habla con '),
                    text('Luci', BOLD),
                    text(' [3,-17]. Vas a empezar una lucha contra:'),
                  ),
                ),
              },
              {
                blockType: 'fight',
                monsters: fightMonsters.map((found) => ({ monster: found.id, quantity: 1 })),
              },
              {
                blockType: 'richText',
                content: richText(
                  heading('h3', 'Recomendaciones'),
                  paragraph(text('Intenta vencer primero al Ramán.')),
                ),
              },
              {
                blockType: 'callout',
                variant: 'warning',
                content: richText(
                  paragraph(
                    text('Las anutrof '),
                    text('NO', BOLD),
                    text(` deben morir. ${seedGuide.callout}`),
                  ),
                ),
              },
              {
                blockType: 'callout',
                variant: 'tip',
                content: richText(paragraph(text(seedGuide.tips))),
              },
            ],
          },
          {
            blockType: 'step',
            body: [
              {
                blockType: 'richText',
                content: richText(
                  paragraph(
                    text(
                      'Una vez terminado el combate, vuelve a hablar con cualquiera de las anutrof y te acompañarán. Deberás escoltarlas fuera de allí.',
                    ),
                  ),
                ),
              },
            ],
          },
          { blockType: 'video', url: seedGuide.video.url, title: seedGuide.video.title },
          { blockType: 'richText', content: richText(paragraph(text(seedGuide.outro))) },
        ],
      },
    })
  }

  if (!(await guideExists(payload, draftGuide.slug))) {
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: draftGuide.title,
        slug: draftGuide.slug,
        quest: hunter.id,
        _status: 'draft',
        body: [{ blockType: 'richText', content: richText(paragraph(text(draftGuide.body))) }],
      },
      draft: true,
    })
  }
}
