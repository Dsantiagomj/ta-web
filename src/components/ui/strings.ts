// Textos de los componentes genéricos. Un segundo idioma sería traducir este módulo.

export type CalloutVariant = 'tip' | 'warning' | 'stop'

export const uiStrings = {
  /** La ruta de navegación de las páginas de logro y de guía. */
  breadcrumb: 'Ruta de navegación',
  /** Antes de la fecha en que Torre cambió la página («Actualizado el 18 de noviembre de 2026»). */
  updated: 'Actualizado el',
  callout: {
    tip: 'Consejo',
    warning: '¡Importante!',
    stop: '¡Alto!',
  } satisfies Record<CalloutVariant, string>,
  percent: (value: number) => `${value}%`,
  figure: {
    open: (alt: string) =>
      alt ? `Ver imagen a pantalla completa: ${alt}` : 'Ver imagen a pantalla completa',
    viewer: 'Imagen a pantalla completa',
    close: 'Cerrar',
  },
}
