import { CoordinatesChip } from '@/components/game/Coordinates'
import { FightBlock } from '@/components/game/MonsterChip'
import type { Stage } from '@/components/game/StagesTimeline'
import type { Achievement, GameItem, Monster } from '@/components/game/types'
import { Callout } from '@/components/ui/Callout'
import { Figure } from '@/components/ui/Figure'
import type { ImageAsset } from '@/components/ui/types'

// Contenido real del catálogo: la guía de Torre «Seis pies bajo tierra» (DofusDB 1976),
// «Entretanto, un renacer» (2420) y el vídeo de «Intoxicación profunda» (1433), con el arte
// del juego de las maquetas de la guía. Las imágenes de public/img/sistema son variantes
// AVIF y WebP generadas una vez desde esas maquetas.

const DIR = '/img/sistema'

function art(name: string, width: number, height: number): ImageAsset {
  return { src: `${DIR}/${name}.webp`, avif: `${DIR}/${name}.avif`, width, height }
}

const icon = (name: string) => art(name, 96, 96)

export const images = {
  combat: art('seis-pies-combate', 960, 656),
  hupeEsse: art('seis-pies-hupe-esse', 800, 551),
  kerubim: art('seis-pies-kerubim', 480, 345),
  video: art('video-ron-marino', 800, 450),
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
  raman: { name: 'Ramán famélico', icon: icon('monster-241'), level: 20 },
  milirrata: { name: 'Milirrata famélica', icon: icon('monster-239'), level: 20 },
  miserata: { name: 'Miserata famélica', icon: icon('monster-254'), level: 20 },
} satisfies Record<string, Monster>

export const achievement: Achievement = {
  name: 'La ocasión hace al ladrón',
  href: '#logro',
  icon: { src: `${DIR}/ach-203.webp`, avif: `${DIR}/ach-203.avif`, width: 48, height: 48 },
}

export const guide = {
  title: 'Seis pies bajo tierra',
  subtitle: 'Misión de Astrub · Ciudad de Astrub',
  level: 20,
  crumbs: [
    { label: 'Misiones', href: '#misiones' },
    { label: 'Astrub', href: '#astrub' },
    { label: `Logro: ${achievement.name}`, href: '#logro', icon: achievement.icon },
  ],
  start: { npc: 'Hupe Esse', place: 'Biblioteca de Astrub', x: 7, y: -19 },
  requires: [{ label: 'Esto hace aguas.', href: '#esto-hace-aguas' }],
  needs: { notes: ['1 x Combate (solo).'] },
  reward: { xp: 16380, kamas: 390, items: 4 },
  rewards: [
    { item: items.pico, quantity: 1 },
    { item: items.intestino, quantity: 1 },
    { item: items.pelos, quantity: 1 },
    { item: items.ojo, quantity: 1 },
  ],
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
  { monster: monsters.raman, quantity: 1 },
  { monster: monsters.milirrata, quantity: 1 },
  { monster: monsters.miserata, quantity: 1 },
]

export const stages: Stage[] = [
  {
    title: 'Habla con Hupe Esse',
    coordinates: { x: 7, y: -19 },
    done: true,
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
    title: 'Combate: protege a las anutrof',
    coordinates: { x: 3, y: -17 },
    content: (
      <>
        <p>
          Habla con <strong>Luci</strong> <CoordinatesChip x={3} y={-17} />. Vas a empezar una lucha
          contra:
        </p>
        <FightBlock monsters={fight} />
        <Callout variant="warning">
          Las anutrof <strong>NO</strong> deben morir. Debes ganar esta lucha sin que se muera
          ninguna de ellas.
        </Callout>
      </>
    ),
  },
  {
    title: 'Escolta a las anutrof',
    content: (
      <p>
        Una vez terminado el combate, vuelve a hablar con cualquiera de las anutrof y te
        acompañarán. Deberás escoltarlas fuera de allí.
      </p>
    ),
  },
]

/** «Entretanto, un renacer»: solo el resumen, con la lista de objetos de Necesitarás. */
export const needsGuide = {
  start: { npc: 'Draconiros', place: 'Airedala', x: 21, y: -33 },
  requires: [
    { label: 'Nivel mínimo 190.' },
    { label: 'A la vuelta de un sueño perdido.', href: '#a-la-vuelta' },
    { label: 'Toma de conciencia.', href: '#toma-de-conciencia' },
  ],
  needs: {
    items: [
      { item: items.esmeralda, quantity: 1 },
      { item: items.purpura, quantity: 1 },
    ],
    notes: ['2 x Combates solitarios.'],
  },
  reward: { xp: 3000000, kamas: 52776 },
}

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
  heroNoArt: { title: 'Intoxicación profunda', subtitle: 'Misión de Sufokia · Diaria' },
  hupeEsseCaption: 'Hupe Esse, en la Biblioteca de Astrub.',
}
