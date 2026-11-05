// Textos de los componentes genéricos. Un segundo idioma sería traducir este módulo.

export type CalloutVariant = 'tip' | 'warning' | 'stop'

export const uiStrings = {
  callout: {
    tip: 'Consejo',
    warning: 'Importante',
    stop: 'Alto',
  } satisfies Record<CalloutVariant, string>,
  percent: (value: number) => `${value}%`,
}
