import { panelStrings } from './strings'

const s = panelStrings.livePreview

/**
 * Los tamaños de la vista previa en vivo (A-20): un móvil, una tableta apaisada y un
 * escritorio, los mismos anchos que las capturas de DESIGN.md.
 */
export const livePreviewBreakpoints = [
  { name: 'movil', label: s.mobile, width: 390, height: 844 },
  { name: 'tableta', label: s.tablet, width: 1024, height: 768 },
  { name: 'escritorio', label: s.desktop, width: 1440, height: 900 },
]
