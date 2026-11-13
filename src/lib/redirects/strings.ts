// Textos del panel sobre la tabla de redirecciones (AGENTS.md, Redirects), para Torre.

export const legacySlugStrings = {
  /** Un slug que el proxy responde antes de llegar a su página. */
  taken: (slug: string) =>
    `La dirección /${slug} está en la tabla de redirecciones de la web antigua ` +
    '(src/lib/redirects/legacy-urls.json): la web la manda a otra página o dice que ya no ' +
    'existe, así que esta página no se vería nunca. Pide que quiten su fila de la tabla y ' +
    'vuelve a guardar.',
}
