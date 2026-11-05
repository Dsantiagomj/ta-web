// Caché de las páginas de guía (AGENTS.md, Next rules, Revalidate on publish).
//
// El layout lee la cookie del modo, así que cada página se pinta en cada petición; lo que
// se guarda en caché es la guía leída de Postgres (unstable_cache), con esta etiqueta. Los
// hooks de quest-guides y media la revalidan al guardar desde el panel. Lo que se escribe
// fuera del servidor (la importación, pnpm data:quests) no puede avisarle: se ve como
// mucho tras GUIDE_PAGES_REVALIDATE segundos.

export const GUIDE_PAGES_TAG = 'guide-pages'

/** Diez minutos: el tope de lo que tarda en verse un cambio hecho fuera del panel. */
export const GUIDE_PAGES_REVALIDATE = 600
