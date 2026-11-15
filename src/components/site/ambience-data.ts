// El ambiente del sitio (DESIGN.md, Ambience): las partículas que suben hacia la cabecera
// en lo alto de cada página. Siempre las mismas, sin azar, para que el servidor pinte lo
// mismo en cada visita; el CSS (ambience.css) les da el aspecto del tema y las anima.

export interface AmbienceParticle {
  /** Dónde nace, en % del ancho. */
  x: number
  /** Cuándo sale la primera vez, en segundos. */
  delay: number
  /** Lo que tarda en subir, en segundos. */
  duration: number
  /** Su tamaño, en rem (de 4 a 7 px). */
  size: number
}

const particle = (x: number, delay: number, duration: number, px: number): AmbienceParticle => ({
  x,
  delay,
  duration,
  size: px / 16,
})

/**
 * Las del hub antiguo (silvestre-checklist, Hero.jsx). La primera mitad cubre todo el ancho,
 * porque en el móvil solo van esas.
 */
export const AMBIENCE_PARTICLES: readonly AmbienceParticle[] = [
  particle(6, 0, 11, 6),
  particle(23, 7.1, 12, 7),
  particle(39, 5.6, 13, 4),
  particle(56, 2.5, 12, 5),
  particle(71, 0.8, 14, 4),
  particle(85, 8.2, 16, 5),
  particle(92, 3.9, 13, 7),
  particle(14, 3.2, 14, 4),
  particle(31, 1.4, 16, 5),
  particle(47, 9.3, 15, 6),
  particle(63, 6.4, 17, 7),
  particle(78, 4.7, 11, 6),
  particle(18, 10.5, 15, 4),
  particle(68, 11.6, 14, 5),
]

/**
 * El ambiente propio de una checklist, en vez del del tema: «snow», copos que caen; «forest»,
 * las luciérnagas (oscuro) y hojas (claro) del hub antiguo; «egg», motas del color de su Dofus.
 */
export type ChecklistAmbience = 'snow' | 'forest' | 'egg'

const BY_LEGACY_ID: Record<string, ChecklistAmbience> = {
  hielos: 'snow',
  silvestre: 'forest',
}

/** El de una checklist según su id en silvestre-checklist («hielos:»), como en su config.js. */
export function checklistAmbience(legacyPrefix: string | null | undefined): ChecklistAmbience {
  const id = (legacyPrefix ?? '').replace(/:$/, '')
  return BY_LEGACY_ID[id] ?? 'egg'
}
