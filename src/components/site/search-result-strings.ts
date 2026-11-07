import type { SearchType } from './nav'

// Los textos de los resultados de la búsqueda de la cabecera (AGENTS.md, Language). Solo
// los usan search.ts y SearchList.tsx, que la isla carga con import() al abrir la búsqueda.
export const searchResultStrings = {
  goTo: 'Ir a',
  none: (q: string) => `Nada se llama «${q}». Prueba con el nombre tal como sale en el juego.`,
  found: (n: number) => (n === 1 ? '1 resultado' : `${n} resultados`),
  moreQuests: (shown: number, total: number) =>
    `Se ven las ${shown} primeras misiones de ${total}: escribe más para afinar.`,
  level: (level: number) => `Nivel ${level}`,
  types: {
    mision: 'Misiones',
    seccion: 'Secciones',
    dofus: 'Dofus',
    checklist: 'Checklists',
    clase: 'Clases',
    mazmorra: 'Mazmorras',
  } satisfies Record<SearchType, string>,
}
