import type { SearchType } from './nav'

// Los textos de los resultados de la búsqueda (AGENTS.md, Language). Solo los usan
// search.ts y SearchList.tsx, que las islas cargan con import() al abrir la búsqueda.
export const searchResultStrings = {
  goTo: 'Ir a',
  none: (q: string) => `Ninguna misión se llama «${q}». Prueba con otra palabra.`,
  count: (n: number) => (n === 1 ? '1 misión' : `${n} misiones`),
  many: (n: number) => `Más de ${n} misiones: sigue escribiendo`,
  nav: (n: number) => (n === 1 ? '1 resultado del menú' : `${n} resultados del menú`),
  noneWithNav: (nav: string) => `Ninguna misión; ${nav}.`,
  level: (level: number) => `Nivel ${level}`,
  achievements: (n: number) => (n === 1 ? '1 logro' : `${n} logros`),
  metalogros: (n: number) => (n === 1 ? '1 metalogro' : `${n} metalogros`),
  types: {
    mision: 'Misiones',
    logro: 'Logros',
    metalogro: 'Metalogros',
    seccion: 'Secciones',
    dofus: 'Dofus',
    checklist: 'Checklists',
    clase: 'Clases',
    mazmorra: 'Mazmorras',
  } satisfies Record<SearchType, string>,
}
