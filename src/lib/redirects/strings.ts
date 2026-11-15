// Textos del panel sobre la tabla de redirecciones (AGENTS.md, Redirects), para Torre.

export const legacySlugStrings = {
  /** Un slug que el proxy responde antes de llegar a su página. */
  taken: (slug: string) =>
    `La dirección /${slug} está en la tabla de redirecciones de la web antigua ` +
    '(src/lib/redirects/legacy-urls.json): la web la manda a otra página o dice que ya no ' +
    'existe, así que esta página no se vería nunca. Pide que quiten su fila de la tabla y ' +
    'vuelve a guardar.',
}

/** La colección redirects: las direcciones viejas que llevan a la nueva (src/collections/Redirects.ts). */
export const slugRedirectStrings = {
  admin: {
    fromLabel: 'Dirección antigua',
    fromDescription:
      'La dirección que ya no tiene página, sin la barra: «aprendizaje-escudero». Quien la ' +
      'abra irá a la nueva.',
    toLabel: 'Dirección nueva',
    toDescription:
      'Adónde lleva, también sin la barra. Si esa dirección ya lleva a otra, se guarda la ' +
      'última, para que nadie dé dos saltos.',
    autoLabel: 'Creada al cambiar la dirección',
    autoDescription:
      'La web la crea sola cuando publicas una página con otra dirección. Puedes cambiarla ' +
      'o borrarla.',
    loop: (from: string, to: string) =>
      `/${from} → /${to} da la vuelta y acaba en /${from}: nadie llegaría a ninguna página. ` +
      'Elige otra dirección nueva.',
    livePage: (from: string) =>
      `/${from} ya es la dirección de una página publicada, y la página gana: esta ` +
      'redirección no se usaría nunca.',
  },
}
