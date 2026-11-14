import { panelStrings } from './strings'

// A-21 (docs/research/backlog.md): Payload pinta algunos controles sin nombre para un lector
// de pantalla, y su configuración no llega a ellos. Esto les pone uno cuando falta, sobre el
// HTML ya pintado (src/components/admin/PanelA11y.tsx). Si Payload cambia ese HTML, las
// pruebas de axe del panel lo encuentran.

const s = panelStrings.a11y

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()

/** Pone `value` en `attribute` si está vacío. Devuelve 1 si cambió algo. */
function fill(element: Element, value: string, attribute = 'aria-label'): number {
  if (clean(element.getAttribute(attribute))) return 0
  element.setAttribute(attribute, value)
  return 1
}

/** La etiqueta del campo que contiene a `element`, sin el asterisco de obligatorio. */
function fieldLabel(element: Element): string | null {
  const label = element.closest('.field-type')?.querySelector('.field-label')
  if (!label) return null
  const copy = label.cloneNode(true) as Element
  copy.querySelectorAll('.required').forEach((mark) => mark.remove())
  return clean(copy.textContent) || null
}

function popupLabel(button: Element): string {
  if (button.closest('.array-actions')) return s.rowActions
  if (button.closest('.clipboard-action__popup')) return s.clipboard
  if (button.closest('.doc-controls__popup')) return s.documentActions
  const main = button.closest('.btn--withPopup')?.querySelector('.btn__label')
  return main ? s.moreOptionsOf(clean(main.textContent)) : s.moreOptions
}

/** Aplica los arreglos bajo `root`. Devuelve cuántos atributos cambió (0 si ya estaba todo). */
export function applyPanelA11yFixes(root: ParentNode): number {
  let changed = 0

  // Las asas de arrastre: dnd-kit ya las mueve con Espacio y las flechas; faltaba decirlo.
  for (const handle of root.querySelectorAll('.collapsible__drag[role="button"]')) {
    changed += fill(handle, s.dragHandle)
  }

  // Los botones de menú que solo llevan un icono.
  for (const button of root.querySelectorAll('button.popup-button')) {
    if (clean(button.textContent)) continue
    changed += fill(button, popupLabel(button))
  }

  // Las casillas de las listas llevan aria-label="" (y la de todas se nombra a sí misma).
  for (const box of root.querySelectorAll('input[type="checkbox"][aria-label=""]')) {
    if (box.getAttribute('aria-labelledby') === box.id) {
      box.removeAttribute('aria-labelledby')
      changed += 1
    }
    if (box.id === 'select-all') {
      changed += fill(box, s.selectAll)
      continue
    }
    const title = clean(box.closest('tr')?.querySelector('a')?.textContent)
    changed += fill(box, title ? s.selectRow(title) : s.selectThisRow)
  }

  // El editor de texto de Lexical y los desplegables de react-select, con su campo.
  for (const editor of root.querySelectorAll('.ContentEditable__root')) {
    changed += fill(editor, fieldLabel(editor) ?? s.text)
  }
  for (const input of root.querySelectorAll('input.rs__input')) {
    changed += fill(input, fieldLabel(input) ?? s.select)
  }

  for (const frame of root.querySelectorAll('iframe#live-preview-iframe')) {
    changed += fill(frame, s.previewFrame, 'title')
  }
  for (const [name, label] of [
    ['live-preview-width', s.previewWidth],
    ['live-preview-height', s.previewHeight],
  ] as const) {
    for (const input of root.querySelectorAll(`input[name="${name}"]`)) {
      changed += fill(input, label)
    }
  }

  // El candado de una página que edita otra cuenta: su texto solo sale al pasar el ratón.
  for (const lock of root.querySelectorAll('.locked[role="button"]')) {
    changed += fill(lock, clean(lock.querySelector('.locked__tooltip')?.textContent) || s.locked)
  }

  // Los botones de una imagen ya elegida, solo con su icono.
  for (const button of root.querySelectorAll('.upload-relationship-details__edit')) {
    changed += fill(button, s.editUpload)
  }
  for (const button of root.querySelectorAll('.upload-relationship-details__remove')) {
    changed += fill(button, s.removeUpload)
  }

  // Los iconos de react-select van ocultos al lector, pero el tabulador paraba en ellos sin
  // decir nada. Sin ellos no se pierde nada: Retroceso borra y la flecha abajo abre la lista.
  for (const indicator of root.querySelectorAll('.rs__indicators [aria-hidden="true"]')) {
    if (indicator.getAttribute('tabindex') === '-1') continue
    indicator.setAttribute('tabindex', '-1')
    changed += 1
  }

  // «Versiones» con su cuenta a la vista: el nombre tiene que incluir lo que se ve.
  for (const tab of root.querySelectorAll('a.doc-tab[aria-label]')) {
    const original = tab.getAttribute('data-ta-label') ?? tab.getAttribute('aria-label') ?? ''
    const text = clean(tab.textContent)
    if (!original || !text.startsWith(original) || tab.getAttribute('aria-label') === text) continue
    tab.setAttribute('data-ta-label', original)
    tab.setAttribute('aria-label', text)
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
