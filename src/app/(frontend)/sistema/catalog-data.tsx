import { CoordinatesChip } from '@/components/game/Coordinates'
import { FightBlock } from '@/components/game/FightBlock'
import { TorreTips } from '@/components/game/TorreTips'
import type { Achievement, GameItem, Monster } from '@/components/game/types'
import { Callout } from '@/components/ui/Callout'
import { Figure } from '@/components/ui/Figure'
import type { ImageAsset } from '@/components/ui/types'
import type { AchievementNeeds, QuestCard } from '@/lib/achievements/page'
import { ASTRUB, CAST, CROCANTERIA, KROSMOZ } from '@/components/home/art'
import type { ChecklistEntry, ChecklistTeaser } from '@/lib/checklists/list'
import { posterInk } from '@/lib/checklists/poster-ink'
import type { DofusCard } from '@/lib/dofus-guides/index-view'
import type { DofusGuideView } from '@/lib/dofus-guides/page'
import type { NextQuestCardData, QuestHeaderData } from '@/lib/guides/page'

// Contenido real del catálogo: la guía de Torre «Seis pies bajo tierra» (DofusDB 1976),
// «Entretanto, un renacer» (2420) y el vídeo de «Intoxicación profunda» (1433), con el arte
// del juego de las maquetas de la guía. Las imágenes de public/img/sistema son variantes
// AVIF y WebP generadas una vez desde esas maquetas; las capturas tienen además anchos
// menores (scripts/build-catalog-images.ts), «nombre-480.webp», para srcset.

const DIR = '/img/sistema'

/** Una imagen del catálogo; con `narrower`, los anchos menores que tiene en disco. */
function art(name: string, width: number, height: number, narrower: number[] = []): ImageAsset {
  const image: ImageAsset = {
    src: `${DIR}/${name}.webp`,
    avif: `${DIR}/${name}.avif`,
    width,
    height,
  }
  if (narrower.length === 0) return image
  const set = (format: 'avif' | 'webp') => [
    ...narrower.map((w) => ({ src: `${DIR}/${name}-${w}.${format}`, width: w })),
    { src: `${DIR}/${name}.${format}`, width },
  ]
  return { ...image, srcSet: set('webp'), avifSrcSet: set('avif') }
}

const icon = (name: string) => art(name, 96, 96)

export const images = {
  // El PNJ de la misión, del renderizador de DofusDB, recortado como en el refresco.
  npcRight: art('npc-4412-right', 331, 720),
  npcLeft: art('npc-4412-left', 331, 720),
  combat: art('seis-pies-combate', 960, 656, [480, 800]),
  hupeEsse: art('seis-pies-hupe-esse', 800, 551, [480]),
  kerubim: art('seis-pies-kerubim', 480, 345),
  video: art('video-ron-marino', 800, 450, [480]),
}

export const imageAlt = {
  hupeEsse:
    'El personaje humanoide recibe un paquete en una biblioteca de madera, con una librería llena de libros y una escalera de madera.',
}

export const items = {
  pico: { name: 'Pico de tofu', icon: icon('item-366') },
  intestino: { name: 'Intestino de araknáusea', icon: icon('item-373') },
  pelos: { name: 'Pelos de arakna enferma', icon: icon('item-388') },
  ojo: { name: 'Ojo de arakmutada', icon: icon('item-2491') },
  esmeralda: { name: 'Dofus Esmeralda', icon: icon('item-737') },
  purpura: { name: 'Dofus Púrpura', icon: icon('item-694') },
} satisfies Record<string, GameItem>

export const monsters = {
  raman: { name: 'Ramán famélico', icon: icon('monster-241') },
  milirrata: { name: 'Milirrata famélica', icon: icon('monster-239') },
  miserata: { name: 'Miserata famélica', icon: icon('monster-254') },
} satisfies Record<string, Monster>

export const achievement: Achievement = {
  name: 'La ocasión hace al ladrón',
  href: '#logro',
  icon: { src: `${DIR}/ach-203.webp`, avif: `${DIR}/ach-203.avif`, width: 48, height: 48 },
}

export const guide = {
  title: 'Seis pies bajo tierra',
  start: { x: 7, y: -19 },
  reward: { xp: 16380, kamas: 390 },
  chain: {
    achievement,
    quests: [
      { title: 'Esto hace aguas', href: '#esto-hace-aguas' },
      { title: 'Seis pies bajo tierra' },
      { title: 'El cazador cazado', href: '#el-cazador-cazado' },
    ],
    current: 1,
  },
}

export const fight = [
  { item: monsters.raman, quantity: 1 },
  { item: monsters.milirrata, quantity: 1 },
  { item: monsters.miserata, quantity: 1 },
]

/** La tarjeta de la siguiente misión, con arte y sin él. */
export const nextQuest: NextQuestCardData = {
  title: 'El cazador cazado',
  href: '#el-cazador-cazado',
  level: 25,
  npc: 'Kerubim Crepin',
  coordinates: { x: 3, y: -17 },
  art: images.kerubim,
}

/** La cabecera de «Seis pies bajo tierra», con el PNJ, el logro y el rango de XP. */
export const header: QuestHeaderData = {
  meta: {
    zone: 'Astrub',
    level: 20,
    achievement: { position: 2, total: 3 },
  },
  giver: {
    name: 'Hupe Esse',
    right: images.npcRight,
    left: images.npcLeft,
    coordinates: { x: 7, y: -19 },
  },
  prerequisites: [{ label: 'Esto hace aguas', href: '#esto-hace-aguas', quest: true }],
  // Varios objetos, para ver sus columnas, y las notas debajo.
  needs: {
    items: [
      { item: items.ojo, quantity: 3 },
      { item: items.intestino, quantity: 2 },
      { item: items.pelos, quantity: 10 },
    ],
    notes: [
      { quantity: 1, label: 'Combate (solo)', combat: true },
      { quantity: 1, label: 'Mazmorra Guarida del Maxilubo', combat: false },
    ],
  },
  rewards: {
    xp: { min: 9800, max: 16380 },
    kamas: 390,
    items: [
      { item: items.pico, quantity: 1 },
      { item: items.intestino, quantity: 1 },
      { item: items.pelos, quantity: 1 },
      { item: items.ojo, quantity: 1 },
    ],
    notes: [],
  },
}

/**
 * «Intoxicación profunda» sin PNJ ni logro, y con un objeto sin icono importado: el hueco
 * queda vacío. Las líneas de Torre sin icono no llevan hueco.
 */
export const headerWithout: QuestHeaderData = {
  meta: { zone: 'Sufokia', level: 200 },
  prerequisites: [{ label: 'Nivel mínimo 200', quest: false }],
  needs: {
    items: [{ item: { name: 'Ron marino' }, quantity: 10 }],
    notes: [{ label: 'Literalmente nada más', combat: false }],
  },
  rewards: { xp: { max: 1000000 }, kamas: 21990, items: [], notes: [] },
}

/** Los pasos del catálogo: el número, el contenido y, en el 3, una chincheta del paso. */
export const steps = (prefix: string) => [
  {
    id: `${prefix}-paso-1`,
    content: (
      <>
        <p>
          Habla con <strong>Hupe Esse</strong> <CoordinatesChip x={7} y={-19} /> para empezar la
          misión.
        </p>
        <Figure
          image={images.hupeEsse}
          alt={imageAlt.hupeEsse}
          caption="Hupe Esse, en la Biblioteca de Astrub."
        />
      </>
    ),
  },
  {
    id: `${prefix}-paso-2`,
    content: (
      <>
        <p>
          Habla con <strong>Luci</strong> <CoordinatesChip x={3} y={-17} />. Vas a empezar una lucha
          contra:
        </p>
        <FightBlock monsters={fight} />
        <Callout variant="warning">
          Las anutrof <strong>no</strong> deben morir. Debes ganar esta lucha sin que se muera
          ninguna de ellas.
        </Callout>
        <TorreTips>
          <ul>
            <li>
              En la preparación del combate, puedes ordenarlas para que estén lo más lejos posible.
            </li>
            <li>
              Intenta vencer primero al <strong>Ramán</strong>: pega de lejos y te puede quitar PA.
            </li>
          </ul>
        </TorreTips>
      </>
    ),
  },
  {
    id: `${prefix}-paso-3`,
    pin: { x: 4, y: -15 },
    content: (
      <p>
        Una vez terminado el combate, vuelve a hablar con cualquiera de las anutrof y te
        acompañarán. Deberás escoltarlas fuera de allí.
      </p>
    ),
  },
]

export const prose =
  'A continuación, dirígete a [1,-17] para hablar con Gasdora. Si te pierdes, el zaap está en [ 5 , -18 ]. Nivel [20] no es una coordenada.'

export const video = {
  url: 'https://www.youtube.com/watch?v=VaY3tyYTq4A',
  title: 'El camino hacia los ron marino | DOFUS 3.0',
}

export const longChain = [
  'Esto hace aguas',
  'Seis pies bajo tierra',
  'El cazador cazado',
  'Un mal día',
  'La trampa',
  'Bajo el puente',
  'La huida',
].map((title, index) => ({ title, href: index === 3 ? undefined : `#cadena-${index}` }))

// Textos de muestra del catálogo: contenido como el de una guía, no textos de la interfaz.
export const samples = {
  callouts: {
    tip: '¡Atención, esta misión es diaria y da buenas kamas!',
    warning: (
      <>
        Las anutrof <strong>NO</strong> deben morir.
      </>
    ),
    stop: 'No hables con Kerubim antes de terminar el combate.',
  },
  stats: { xp: 'XP', kamas: 'Kamas' },
  headerWithout: 'Intoxicación profunda',
  hupeEsseCaption: 'Hupe Esse, en la Biblioteca de Astrub.',
  tips: 'Intenta vencer primero al Ramán: pega de lejos y te puede quitar PA.',
}

const eggArt = (slug: string): ImageAsset => ({
  src: `/img/game/dofus/${slug}.webp`,
  width: 128,
  height: 128,
})

/** Tarjetas del índice de las guías de Dofus, como las calcula dofusIndexView. */
export const dofusCards: DofusCard[] = [
  {
    name: 'Dofus Esmeralda',
    slug: 'dofus-esmeralda',
    href: '#dofus-esmeralda',
    disabled: false,
    egg: eggArt('dofus-esmeralda'),
    color: '#2ecd68',
    tag: 'primordial',
    tagLabel: 'Primordial',
    meta: '1 logro - 8 misiones - Nivel 100',
    search: 'dofus esmeralda',
  },
  {
    name: 'Jyfus',
    slug: 'jyfus',
    disabled: true,
    egg: eggArt('jyfus'),
    tag: 'event',
    tagLabel: 'Evento',
    meta: 'Nivel 20',
    search: 'jyfus',
  },
]

/**
 * Carteles del índice de las checklists, como los calcula checklistEntries: la escena y el PNJ
 * son el arte de la portada (public/img/inicio); el color del nombre, el de posterInk.
 */
export const checklistCards: ChecklistEntry[] = [
  {
    name: 'Dofus Nebuloso',
    slug: 'checklist-nebuloso',
    state: 'published',
    href: '#checklist-nebuloso',
    egg: eggArt('dofus-esmeralda'),
    color: '#2ecd68',
    ink: posterInk('#2ecd68'),
    scene: ASTRUB,
    npc: CAST[0],
    npcFit: { height: 64, right: -24, top: 6 },
  },
  {
    name: 'Dofus Silvestre',
    slug: 'checklist-silvestre',
    state: 'preparing',
    href: '#checklist-silvestre',
    legacy: true,
    egg: { src: '/img/game/checklists/silvestre.webp', width: 200, height: 200 },
    color: '#b0d62d',
    ink: posterInk('#b0d62d'),
    scene: CROCANTERIA,
  },
  {
    name: 'Jyfus',
    slug: 'checklist-jyfus',
    state: 'preparing',
    egg: eggArt('jyfus'),
  },
]

/** La tarjeta «???» del final del índice, como la da checklistTeaser. */
export const checklistTeaserCard: ChecklistTeaser = {
  label: 'En camino',
  text: '???',
  scene: KROSMOZ,
  egg: eggArt('dofus-ebano'),
}

/** Una nota de Necesitarás de Torre: un párrafo de texto enriquecido. */
const needNote = (text: string) =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
    },
  }) as unknown as Extract<DofusNeedRow, { kind: 'note' }>['text']

type DofusNeedRow = NonNullable<DofusGuideView['needs']>['groups'][number]['rows'][number]

/**
 * Necesitarás y un logro de una guía de Dofus, como los calcula dofusGuideView. La nota que
 * Torre escribió entre los objetos sale detrás de ellos.
 */
export const dofusNeeds: NonNullable<DofusGuideView['needs']> = {
  title: 'Necesitarás',
  groups: [
    {
      rows: [
        { kind: 'item', item: items.intestino, quantity: 3 },
        { kind: 'note', text: needNote('Alineamiento 100 (Bonta o Brakmar).') },
        { kind: 'item', item: items.pelos, quantity: 1, note: '(o fabricarlo)' },
        { kind: 'item', item: items.ojo, quantity: 5 },
      ],
    },
    {
      name: 'Mazmorras',
      rows: [
        { kind: 'note', text: needNote('1 x Mazmorra Rey Nidas.') },
        { kind: 'note', text: needNote('1 x combates.') },
      ],
    },
  ],
}

export const dofusAchievementView: DofusGuideView = {
  title: 'Dofus Esmeralda',
  meta: [],
  prerequisites: null,
  rewards: null,
  intro: null,
  outro: null,
  body: [],
  needs: null,
  achievementCount: 1,
  parts: [
    {
      kind: 'achievement',
      achievement: {
        name: achievement.name,
        href: '#la-ocasion',
        disabled: false,
        icon: achievement.icon,
        meta: ['3 misiones', 'Niveles 15 a 25', '10 puntos'],
        quests: [
          { position: 1, level: 15, title: 'Esto hace aguas', href: '#esto-hace-aguas' },
          {
            position: 2,
            level: 20,
            title: 'Seis pies bajo tierra',
            href: '#seis-pies',
            giver: images.npcRight,
          },
          { position: 3, level: 25, title: 'El cazador cazado' },
        ],
      },
    },
  ],
  video: null,
  checklist: null,
  previous: null,
  next: null,
  breadcrumb: {
    parents: [],
    jsonLd: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
  },
}

/**
 * «Necesitarás en total» de una página de logro: los tres grupos, con un objeto que nombra
 * una nota sin cantidad, una mazmorra y lo que no es objeto ni combate («Otros»).
 */
export const achievementNeeds: AchievementNeeds = {
  // Sin el Pico de tofu ni el Ojo de arakmutada, que ya copian en otras pruebas del catálogo.
  items: [{ item: items.intestino, quantity: 2 }, { item: items.pelos }],
  tasks: [
    { quantity: 3, label: 'Combates realizables en grupo', kind: 'combat' },
    { quantity: 1, label: 'Mazmorra Malefíscof', kind: 'dungeon' },
  ],
  others: [{ label: 'Hechizo Captura de almas' }, { label: '1 kama' }],
}

/** Un logro que solo pide objetos: un grupo. */
export const achievementNeedsItems: AchievementNeeds = {
  items: [{ item: items.purpura, quantity: 1 }],
  tasks: [],
  others: [],
}

/** Las misiones de un logro corto: en una columna; la tercera, sin guía publicada. */
export const achievementQuests: QuestCard[] = [
  { position: 1, level: 15, title: 'Esto hace aguas', href: '#esto-hace-aguas' },
  {
    position: 2,
    level: 20,
    title: 'Seis pies bajo tierra',
    href: '#seis-pies',
    giver: images.npcRight,
  },
  { position: 3, level: 25, title: 'El cazador cazado' },
]

/** Las de un logro largo: en dos columnas, que se leen de arriba abajo. */
export const achievementQuestsLong: QuestCard[] = [
  ...achievementQuests,
  { position: 4, level: 25, title: 'Intoxicación profunda', href: '#intoxicacion' },
  { position: 5, level: 30, title: 'La ocasión hace al ladrón', href: '#la-ocasion' },
]
