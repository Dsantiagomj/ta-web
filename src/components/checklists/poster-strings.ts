// Los textos de la isla del índice /checklists, aparte de src/lib/checklists/strings.ts para
// que la isla no se lleve los del panel. Un segundo idioma sería traducir este módulo.

export const posterStrings = {
  /** El porcentaje como en la página de la checklist: un decimal como mucho. */
  pct: (value: number) => `${value.toLocaleString('es', { maximumFractionDigits: 1 })} %`,
} as const
