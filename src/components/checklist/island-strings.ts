// Los textos que escribe la isla de la checklist, aparte de src/lib/checklists/strings.ts
// para que la isla no arrastre los del panel. La página los toma de aquí también.

export const checklistIslandStrings = {
  searchEmpty: (query: string) => `Ningún paso tiene «${query}».`,
  searchFound: (count: number) => (count === 1 ? '1 paso' : `${count} pasos`),
  step: (n: number) => `Paso ${n}`,
  loadFailed: 'No se pudieron cargar las coordenadas. Recarga la página para intentarlo otra vez.',
  /** Como el chip de coordenadas de las guías (src/components/game/strings.ts). */
  copyCoordinates: (coordinates: string, command: string) => `${coordinates}, copiar ${command}`,
} as const
