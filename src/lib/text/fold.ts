// Sin dependencias: lo usan la página de la checklist (el texto que busca cada paso) y su
// isla (lo que escribe quien busca), y los dos tienen que doblar igual.

/** Sin acentos y en minúsculas, para buscar sin que importen. */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
