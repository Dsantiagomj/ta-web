// Los textos de la portada (AGENTS.md, Language). Los de su búsqueda van en
// hero-search-strings.ts, que es lo que viaja con su isla.
import type { ReactNode } from 'react'

export const homeStrings = {
  eyebrow: 'Guías de Dofus en español',
  title: 'Torrente Arcano',
  lead: 'Misiones, logros y Dofus explicados paso a paso, con capturas y coordenadas para copiar en el chat.',
  who: 'Torre',
  question: '¿Qué misión estás haciendo?',
  searchForm: 'Buscar una misión',
  searchHelp:
    'Escribe al menos 2 letras; las flechas recorren las misiones e Intro abre la elegida.',
  live: {
    label: 'Torre en directo',
    title: 'Torre está en directo',
    where: 'Twitch · torrentearcano',
    go: 'Ver',
    goMore: ' directo',
  },
  areas: {
    title: 'Qué vas a encontrar',
    quests: 'Misiones y logros',
    questsText: (
      guides: ReactNode,
      achievements: ReactNode,
      counts: { guides: number; achievements: number },
    ) => [
      guides,
      counts.guides === 1 ? ' misión en ' : ' misiones en ',
      achievements,
      counts.achievements === 1 ? ' logro.' : ' logros.',
      ' Búscalas por nombre, zona o historia, de Astrub al Selocalipsis.',
    ],
    dofus: 'Guías de Dofus',
    dofusText: 'Lo que pide cada Dofus y las misiones del logro que lo da, cada una con su guía.',
    checklists: 'Checklists',
    checklistsText: 'Marca lo hecho y ve lo que falta.',
    /** Tres pasos reales del checklist del Silvestre, para la tarjeta. */
    checklistsRows: [
      { n: 46, zone: 'Isla de Pandala:', quest: 'En nombre del arte', done: true },
      { n: 47, zone: 'Alineamiento Bontariano:', quest: 'misión 55', done: true },
      { n: 48, zone: 'Isla de Pandala:', quest: 'El festival del farol', done: false },
    ],
    classes: 'Clases',
    classesText: 'Los equipos de cada clase para PvM y para PvP, uno por elemento.',
    dungeons: 'Mazmorras',
    dungeonsText:
      'Las mazmorras explicadas por Torre: qué hace cada monstruo y cómo vencer al jefe.',
  },
  tour: {
    title: 'Una guía para cada misión',
    lead: 'Hechas para seguirlas con el juego abierto al lado. Así es una por dentro.',
    steps: [
      {
        title: 'Lo que hace falta, arriba del todo',
        text: 'Quién da la misión y dónde, los prerrequisitos, lo que vas a necesitar y las recompensas, con los iconos del juego.',
      },
      {
        title: 'Coordenadas que se copian',
        text: 'Un clic copia el /travel; lo pegas en el chat y el autopiloto te lleva.',
      },
      {
        title: 'Una captura en cada paso',
        text: 'Grande, para reconocer el sitio y el diálogo. Se abre a pantalla completa.',
      },
      {
        title: 'Los consejos de Torre',
        text: 'En los combates difíciles, a quién atacar primero y qué evitar.',
      },
    ],
    more: 'Ver las misiones y logros',
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
  checklists: {
    title: 'Checklists para ir a por tu Dofus',
    lead: 'Para los Dofus más largos, paso a paso. Sin cuenta: el progreso se guarda en tu navegador.',
  },
  author: {
    title: 'Las guías son de Torre',
    lead: 'Torre juega a Dofus en directo y escribe todas las guías de esta web.',
    portrait: 'El avatar de Torre: un chico con sombrero cónico y una sonrisa de oreja a oreja.',
    join: 'Únete al Discord de la comunidad',
    joinText: 'Para resolver dudas de misiones y enterarte de los directos.',
    liveTitle: 'En directo ahora en Twitch',
    liveGo: 'Ver directo',
    offline: [
      'Ahora no está en directo.',
      ' Emite en Twitch y en Kick; si sigues el canal, Twitch te avisa cuando empiece.',
    ],
    channels: { twitch: ' · directos', kick: ' · directos', youtube: ' · vídeos' },
  },
}
