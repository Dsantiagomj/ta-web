// Los textos de la isla del índice de las guías de Dofus (DofusIndexIsland): el buscador, los
// filtros y el aviso de cuántas quedan. Van aparte para que la isla no arrastre todos los
// textos de las guías de Dofus (src/lib/dofus-guides/strings.ts, que los reutiliza).

export const dofusIndexIslandStrings = {
  filters: { all: 'Todos', primordial: 'Primordiales', event: 'Evento' },
  filtersLabel: 'Filtrar por tipo',
  search: 'Buscar un Dofus',
  searchLabel: 'Buscar un Dofus por su nombre',
  found: (count: number) => (count === 1 ? '1 encontrado' : `${count} encontrados`),
  none: (query: string) =>
    query ? `Ningún Dofus se llama «${query}».` : 'Ningún Dofus con este filtro.',
} as const
