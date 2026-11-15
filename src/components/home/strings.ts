// Los textos de la portada (AGENTS.md, Language). Los de su búsqueda van en
// hero-search-strings.ts, que es lo que viaja con su isla.
import type { ReactNode } from 'react'

// Los títulos, entradillas y frases que son de Torre (las de cada sección, los puntos de la
// guía de muestra, el bloque de Torre) están en «Portada e índices»
// (src/lib/site-copy/defaults.ts); aquí, lo que no es contenido y el dibujo de la guía.
export const homeStrings = {
  who: 'Torre',
  searchForm: 'Buscar una misión',
  searchHelp:
    'Escribe al menos 2 letras; las flechas recorren las misiones e Intro abre la elegida.',
  live: {
    label: 'Torre en directo',
    title: 'Torre está en directo',
    where: (handle: string) => `Twitch · ${handle}`,
    go: 'Ver',
    goMore: ' directo',
  },
  areas: {
    quests: 'Misiones y logros',
    /** Las cifras de las guías y los logros, y detrás la frase de Torre. */
    questsText: (
      guides: ReactNode,
      achievements: ReactNode,
      counts: { guides: number; achievements: number },
      text: string,
    ) => [
      guides,
      counts.guides === 1 ? ' misión en ' : ' misiones en ',
      achievements,
      counts.achievements === 1 ? ' logro.' : ' logros.',
      ` ${text}`,
    ],
    dofus: 'Guías de Dofus',
    checklists: 'Checklists',
    /** Tres pasos reales del checklist del Silvestre, para la tarjeta. */
    checklistsRows: [
      { n: 46, zone: 'Isla de Pandala:', quest: 'En nombre del arte', done: true },
      { n: 47, zone: 'Alineamiento Bontariano:', quest: 'misión 55', done: true },
      { n: 48, zone: 'Isla de Pandala:', quest: 'El festival del farol', done: false },
    ],
    classes: 'Clases',
    dungeons: 'Mazmorras',
  },
  tour: {
    caption: 'Así se ve la guía de la misión Seis pies bajo tierra',
    guide: 'Seis pies bajo tierra',
    meta: ['Misión de Astrub - Nivel 20 - Empieza con ', 'Hupe Esse'],
    prerequisites: 'Prerrequisitos',
    prerequisite: 'Esto hace aguas',
    needs: 'Necesitarás',
    fight: 'Combate (solo)',
    rewards: 'Recompensas',
    xp: [' a ', ' XP'],
    kamas: ' kamas',
    items: ' objetos',
    step: ['Habla con ', 'Hupe Esse', ' para empezar la misión.'],
    shot: 'Captura del paso 1: el personaje recibe un paquete en una biblioteca de madera.',
    tipsTitle: 'Recomendaciones de Torre',
    tips: [
      'Intenta vencer primero al ',
      'Ramán',
      '. En mi opinión, es el más molesto, ya que pega de lejos y te puede quitar PA y stats.',
    ],
  },
  author: {
    portrait: 'El avatar de Torre: un chico con sombrero cónico y una sonrisa de oreja a oreja.',
    liveTitle: 'En directo ahora en Twitch',
    liveGo: 'Ver directo',
    channels: { twitch: ' · directos', kick: ' · directos', youtube: ' · vídeos' },
  },
}
