import { panelStrings } from './strings'

// A-21 (docs/research/backlog.md): Payload pinta algunos controles sin nombre para un lector
// de pantalla, y su configuración no llega a ellos. Esto les pone uno cuando falta, sobre el
// HTML ya pintado (src/components/admin/PanelA11y.tsx). Si Payload cambia ese HTML, las
// pruebas de axe del panel lo encuentran.
//
// Cada nombre que escribimos queda marcado (data-ta-<atributo>, con lo que escribimos). Así se
// distingue de uno que puso Payload, que nunca se pisa. Los nombres fijos se ponen una vez:
// sus selectores ya excluyen los marcados, así que una revisión no los vuelve a calcular. Los
// que dependen del contenido (la casilla de una fila, el candado, «Versiones») se recalculan
// en cada revisión.

const s = panelStrings.a11y

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()

const mark = (attribute: string) => `data-ta-${attribute}`

/**
 * Lo que no tiene todavía un nombre nuestro en `attribute`, o lo tuvo y Payload lo vació: para
 * los nombres fijos.
 */
const pending = (selector: string, attribute = 'aria-label') =>
  selector
    .split(',')
    .map((part) => part.trim())
    .flatMap((part) => [
      `${part}:not([${mark(attribute)}])`,
      `${part}[${mark(attribute)}][${attribute}=""]`,
      `${part}[${mark(attribute)}]:not([${attribute}])`,
    ])
    .join(', ')

/**
 * Pone el nombre que da `compute` si el atributo está vacío o tiene el último que pusimos.
 * Uno que puso Payload no se toca. Devuelve 1 si cambió algo.
 */
function name(element: Element, compute: () => string, attribute = 'aria-label'): number {
  const current = element.getAttribute(attribute)
  const ours = element.getAttribute(mark(attribute))
  if (clean(current) && current !== ours) return 0
  const value = compute()
  if (current === value && ours === value) return 0
  element.setAttribute(attribute, value)
  element.setAttribute(mark(attribute), value)
  return 1
}

/** La etiqueta del campo que contiene a `element`, sin el asterisco de obligatorio. */
function fieldLabel(element: Element): string | null {
  const label = element.closest('.field-type')?.querySelector('.field-label')
  if (!label) return null
  const copy = label.cloneNode(true) as Element
  copy.querySelectorAll('.required').forEach((required) => required.remove())
  return clean(copy.textContent) || null
}

function popupLabel(button: Element): string {
  if (button.closest('.array-actions')) return s.rowActions
  if (button.closest('.clipboard-action__popup')) return s.clipboard
  if (button.closest('.doc-controls__popup')) return s.documentActions
  const main = button.closest('.btn--withPopup')?.querySelector('.btn__label')
  return main ? s.moreOptionsOf(clean(main.textContent)) : s.moreOptions
}

/** Los nombres fijos: selector, y cómo se calcula el nombre la primera vez. */
const FIXED: {
  selector: string
  label: (element: Element) => string | null
  attribute?: string
}[] = [
  // Las asas de arrastre: dnd-kit ya las mueve con Espacio y las flechas; faltaba decirlo.
  { selector: '.collapsible__drag[role="button"]', label: () => s.dragHandle },
  // Los botones de menú que solo llevan un icono.
  {
    selector: 'button.popup-button',
    label: (button) => (clean(button.textContent) ? null : popupLabel(button)),
  },
  // El editor de texto de Lexical y los desplegables de react-select, con su campo.
  { selector: '.ContentEditable__root', label: (editor) => fieldLabel(editor) ?? s.text },
  { selector: 'input.rs__input', label: (input) => fieldLabel(input) ?? s.select },
  // La vista previa en vivo y su ancho y alto.
  { selector: 'iframe#live-preview-iframe', label: () => s.previewFrame, attribute: 'title' },
  { selector: 'input[name="live-preview-width"]', label: () => s.previewWidth },
  { selector: 'input[name="live-preview-height"]', label: () => s.previewHeight },
  // Los botones de una imagen ya elegida, solo con su icono.
  { selector: '.upload-relationship-details__edit', label: () => s.editUpload },
  { selector: '.upload-relationship-details__remove', label: () => s.removeUpload },
]

/** Aplica los arreglos bajo `root`. Devuelve cuántos atributos cambió (0 si ya estaba todo). */
export function applyPanelA11yFixes(root: ParentNode): number {
  let changed = 0

  for (const { selector, label, attribute = 'aria-label' } of FIXED) {
    for (const element of root.querySelectorAll(pending(selector, attribute))) {
      const value = label(element)
      if (value !== null) changed += name(element, () => value, attribute)
    }
  }

  // Las casillas de las listas llevan aria-label="" (y la de todas se nombra a sí misma). La
  // de una fila sigue a su título.
  for (const box of root.querySelectorAll(
    `input[type="checkbox"][aria-label=""], input[type="checkbox"][${mark('aria-label')}]`,
  )) {
    if (box.getAttribute('aria-labelledby') === box.id) {
      box.removeAttribute('aria-labelledby')
      changed += 1
    }
    changed += name(box, () => {
      if (box.id === 'select-all') return s.selectAll
      const title = clean(box.closest('tr')?.querySelector('a')?.textContent)
      return title ? s.selectRow(title) : s.selectThisRow
    })
  }

  // El candado de una página que edita otra cuenta: su texto solo sale al pasar el ratón, y
  // cambia si la edita otra.
  for (const lock of root.querySelectorAll('.locked[role="button"]')) {
    changed += name(
      lock,
      () => clean(lock.querySelector('.locked__tooltip')?.textContent) || s.locked,
    )
  }

  // react-select: la flecha va oculta al lector pero el tabulador paraba en ella sin decir
  // nada; sale del tabulador (la flecha abajo abre la lista). La cruz se queda en el
  // tabulador, porque Intro la vacía y no todos los campos se vacían con Retroceso: deja de ir
  // oculta y tiene nombre. Los dibujos de dentro no se tocan.
  for (const arrow of root.querySelectorAll(
    '.rs__indicators > .dropdown-indicator[aria-hidden="true"]:not([tabindex="-1"])',
  )) {
    arrow.setAttribute('tabindex', '-1')
    changed += 1
  }
  for (const clear of root.querySelectorAll('.rs__indicators > .clear-indicator[aria-hidden]')) {
    clear.removeAttribute('aria-hidden')
    changed += 1
  }
  for (const clear of root.querySelectorAll(pending('.rs__indicators > .clear-indicator'))) {
    changed += name(clear, () => s.clearSelect)
  }

  // «Versiones» con su cuenta a la vista: el nombre tiene que incluir lo que se ve. El de
  // Payload («Versiones») se guarda como base; si Payload pone otro, ese pasa a ser la base.
  for (const tab of root.querySelectorAll('a.doc-tab[aria-label]')) {
    const current = tab.getAttribute('aria-label') ?? ''
    const ours = tab.getAttribute(mark('aria-label'))
    const base = current === ours ? (tab.getAttribute('data-ta-base') ?? current) : current
    const text = clean(tab.textContent)
    if (!base || !text.startsWith(base) || current === text) continue
    tab.setAttribute('data-ta-base', base)
    tab.setAttribute('aria-label', text)
    tab.setAttribute(mark('aria-label'), text)
    changed += 1
  }

  // Una lista sin elementos de lista: mejor sin papel de lista que con uno roto.
  for (const list of root.querySelectorAll('ul.doc-tabs__tabs:not([role])')) {
    if (list.querySelector(':scope > li')) continue
    list.setAttribute('role', 'none')
    changed += 1
  }

  return changed
}
