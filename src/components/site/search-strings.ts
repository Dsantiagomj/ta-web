// Los textos de la búsqueda que pintan las islas antes de que llegue el motor: el diálogo de
// la cabecera y la búsqueda de la portada (AGENTS.md, Language). Van aparte de strings.ts y
// de search-result-strings.ts: un módulo que usan una isla y lo que carga después se
// descarga entero con la isla, y la de la cabecera pesa en todas las páginas de guía.
export const searchDialogStrings = {
  label: 'Buscar en el sitio',
  input: 'Buscar una misión, un Dofus, una clase, una mazmorra o un checklist',
  placeholder: 'Busca una misión, un Dofus o una clase',
  close: 'Esc',
  hint: 'Escribe una letra más para buscar.',
  guidesLoading: 'Cargando las misiones…',
  guidesError: 'No se pudieron cargar las misiones. Vuelve a intentarlo.',
}
