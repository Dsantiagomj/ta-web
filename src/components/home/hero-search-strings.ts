// Los textos y los ids de la búsqueda de la portada que usa su isla (AGENTS.md, Language). Van
// aparte de los textos de las secciones (strings.ts), que no deben viajar en el JavaScript de
// la isla. Los de pedir otra letra, carga y error son los del diálogo (search-strings.ts).
export const heroSearchStrings = {
  placeholder: 'Nombre de la misión',
  submit: 'Buscar',
  list: 'Misiones',
}

/** El campo; su lista, su ayuda y cada opción cuelgan de este id. */
export const HERO_SEARCH_ID = 'buscar-mision'
export const optionId = (i: number) => `${HERO_SEARCH_ID}-o${i}`
