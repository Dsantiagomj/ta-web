// Los textos de las páginas sueltas (AGENTS.md, Language): la página pública y su panel.

export const sitePageStrings = {
  /** El padre de las migas de una página sin página superior. */
  home: 'Inicio',
  /** Los puntos suspensivos de una descripción SEO cortada. */
  ellipsis: '…',
  admin: {
    tabs: { content: 'Contenido', seo: 'SEO' },
    titleDescription: 'El título grande de la página.',
    slugDescription:
      'La de la página, la misma que en tu web: emote-sealar-con-el-dedo. Si la cambias en una ' +
      'página publicada, los enlaces que la gente guardó dejan de funcionar.',
    stateDescription:
      'Publicada: se abre en su dirección. En preparación: no se abre aquí; si tiene «Enlace en ' +
      'Squarespace», su dirección y los enlaces del sitio llevan a tu web antigua. Lo decides tú. ' +
      'Además, pulsa «Publicar cambios» arriba para que lo que cambies salga en la web.',
    legacyHrefDescription:
      'La página en Squarespace mientras esta no esté lista. Deja de usarse al publicarla.',
    parentDescription:
      'Opcional. Sale en las migas encima del título, como «Emotes» sobre un emote.',
    bodyDescription: 'El texto, las capturas y los vídeos, con los mismos bloques que las guías.',
    seoDescription:
      'Opcional. Sin título SEO se usa el de la página; sin descripción, el principio del texto.',
  },
} as const
