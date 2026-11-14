import type { Page } from '@playwright/test'

// La revisión de la maquetación (maquetacion.spec.ts): busca en lo que la página pinta los
// defectos que se ven a simple vista y que ninguna prueba de contenido mira. Es genérica: no
// conoce ningún componente, así que lo nuevo entra sin tocarla.
//
// - «página ancha»: el documento es más ancho que la ventana (barra de desplazamiento lateral).
// - «desborda»: un elemento que no se desplaza tiene contenido más ancho que él.
// - «recorta»: un elemento con overflow hidden o clip corta su texto.
// - «una palabra por línea»: un texto de tres palabras o más con tantas líneas como palabras.
//   Con dos no: un nombre de dos palabras en una tarjeta estrecha («Dofus / Silvestre») se
//   parte bien así; si la caja es estrecha de verdad, lo coge la regla siguiente.
// - «estrecho»: un texto de dos palabras o más, partido, en una caja de menos de unos 8ch.
// - «se solapan»: dos hermanos (tarjetas, botones, campos, filas) se pisan.
//
// La salida: `data-layout-lint-ignore` en un elemento lo deja fuera, con él todo lo de
// dentro. Solo con un comentario al lado que diga por qué.

export const LAYOUT_LINT_IGNORE = 'data-layout-lint-ignore'

export interface LayoutDefect {
  kind: string
  where: string
  text: string
  detail: string
}

/** Revisa la página entera o lo que hay dentro de `scope` (un selector CSS). */
export async function lintLayout(page: Page, scope?: string): Promise<LayoutDefect[]> {
  return page.evaluate(
    ({ scope, ignore }) => {
      const defects: LayoutDefect[] = []
      const root = scope ? document.querySelector(scope) : document.body
      if (!root) return [{ kind: 'sin raíz', where: String(scope), text: '', detail: '' }]

      const styles = new Map<Element, CSSStyleDeclaration>()
      const style = (el: Element) => {
        let found = styles.get(el)
        if (!found) styles.set(el, (found = getComputedStyle(el)))
        return found
      }
      const ignored = (el: Element) => el.closest(`[${ignore}]`) !== null
      const short = (el: Element) => {
        const name = el.tagName.toLowerCase()
        const classes = [...el.classList].slice(0, 2).map((c) => `.${c}`)
        return name + (el.id ? `#${el.id}` : '') + classes.join('')
      }
      const where = (el: Element) => {
        const parts: string[] = []
        for (let at: Element | null = el; at && at !== document.body && parts.length < 4;) {
          parts.unshift(short(at))
          at = at.parentElement
        }
        return parts.join(' > ')
      }
      const textOf = (el: Element | Node) =>
        (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
      const add = (kind: string, el: Element, detail: string) =>
        defects.push({ kind, where: where(el), text: textOf(el), detail })

      // Lo que no se ve no cuenta: sin cajas, oculto, transparente o el patrón sr-only
      // (1px y recortado).
      const shown = (el: Element) => {
        const s = style(el)
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false
        const rect = el.getBoundingClientRect()
        if (rect.width <= 1 && rect.height <= 1) return false
        return el.getClientRects().length > 0
      }
      const skippedTags = new Set([
        'SCRIPT',
        'STYLE',
        'NOSCRIPT',
        'TEMPLATE',
        'SVG',
        'IMG',
        'PICTURE',
        'VIDEO',
        'IFRAME',
        'CANVAS',
        'BR',
        'INPUT',
        'TEXTAREA',
        'SELECT',
        'OPTION',
      ])
      const skipped = (el: Element) =>
        skippedTags.has(el.tagName.toUpperCase()) || el.closest('svg') !== null || ignored(el)
      const scrolls = (value: string) => value === 'auto' || value === 'scroll'
      const intentionalClip = (s: CSSStyleDeclaration) =>
        s.textOverflow === 'ellipsis' ||
        (s.getPropertyValue('-webkit-line-clamp') || 'none') !== 'none'
      const inFlow = (el: Element) => {
        const position = style(el).position
        return position !== 'absolute' && position !== 'fixed'
      }

      const elements = [root, ...root.querySelectorAll('*')].filter(
        (el) => !skipped(el) && shown(el),
      )

      // Página ancha: el documento entero, más los elementos que se salen de la ventana sin
      // un contenedor que los recorte o desplace.
      const doc = document.documentElement
      if (!scope && doc.scrollWidth > doc.clientWidth + 1) {
        defects.push({
          kind: 'página ancha',
          where: 'html',
          text: '',
          detail: `${doc.scrollWidth}px en una ventana de ${doc.clientWidth}px`,
        })
      }
      const contained = (el: Element) => {
        for (let at = el.parentElement; at && at !== doc; at = at.parentElement) {
          const s = style(at)
          if (s.overflowX !== 'visible') return true
        }
        return false
      }
      const outside = elements.filter((el) => {
        if (!inFlow(el) || contained(el)) return false
        const rect = el.getBoundingClientRect()
        return rect.right > doc.clientWidth + 1 || rect.left < -1
      })
      for (const el of outside) {
        if (outside.some((other) => other !== el && el.contains(other))) continue
        const rect = el.getBoundingClientRect()
        add(
          'se sale de la ventana',
          el,
          `de ${Math.round(rect.left)} a ${Math.round(rect.right)}px en ${doc.clientWidth}px`,
        )
      }

      // El texto de dentro de un elemento que queda fuera de su caja (padding incluido).
      const textBeyond = (el: Element, axis: 'x' | 'y') => {
        const box = el.getBoundingClientRect()
        const left = box.left + el.clientLeft
        const top = box.top + el.clientTop
        const right = left + el.clientWidth
        const bottom = top + el.clientHeight
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        const range = document.createRange()
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim() || !node.parentElement || skipped(node.parentElement)) {
            continue
          }
          if (!shown(node.parentElement)) continue
          range.selectNodeContents(node)
          for (const rect of range.getClientRects()) {
            if (rect.width === 0) continue
            const out =
              axis === 'x'
                ? rect.right > right + 1 || rect.left < left - 1
                : rect.bottom > bottom + 2 || rect.top < top - 2
            if (out) return node
          }
        }
        return null
      }

      // Lo que se sale de un elemento en flujo y no es una decoración colocada encima.
      const culprit = (el: Element) => {
        const box = el.getBoundingClientRect()
        const right = box.left + el.clientLeft + el.clientWidth
        for (const child of el.querySelectorAll('*')) {
          if (ignored(child) || !shown(child) || !inFlow(child)) continue
          // Ni lo que va dentro de algo colocado encima ni lo que recorta o desplaza otro
          // contenedor por el camino (una fila de chips con scroll lateral).
          let hidden = false
          for (let at = child.parentElement; at && at !== el; at = at.parentElement) {
            if (!inFlow(at) || style(at).overflowX !== 'visible') hidden = true
          }
          if (hidden) continue
          if (child.getBoundingClientRect().right > right + 1) return child
        }
        return null
      }

      // Desborda y recorta: de cada cadena de elementos que se desbordan, el más interior.
      const overflowing: { el: Element; kind: string; detail: string }[] = []
      for (const el of elements) {
        const s = style(el)
        if (s.display === 'inline' || s.display === 'contents' || intentionalClip(s)) continue
        if (el.clientWidth <= 1 || el.clientHeight <= 1) continue
        if (!scrolls(s.overflowX) && el.scrollWidth > el.clientWidth + 1) {
          if (s.overflowX === 'visible') {
            const child = culprit(el)
            if (child) {
              overflowing.push({
                el,
                kind: 'desborda',
                detail: `${el.scrollWidth}px de contenido en ${el.clientWidth}px: ${short(child)} «${textOf(child).slice(0, 40)}»`,
              })
            }
          } else if (textBeyond(el, 'x')) {
            overflowing.push({
              el,
              kind: 'recorta',
              detail: `${el.scrollWidth}px de texto en ${el.clientWidth}px de ancho`,
            })
          }
        }
        if (
          (s.overflowY === 'hidden' || s.overflowY === 'clip') &&
          el.scrollHeight > el.clientHeight + 2 &&
          textBeyond(el, 'y')
        ) {
          overflowing.push({
            el,
            kind: 'recorta',
            detail: `${el.scrollHeight}px de texto en ${el.clientHeight}px de alto`,
          })
        }
      }
      for (const found of overflowing) {
        if (overflowing.some((other) => other.el !== found.el && found.el.contains(other.el))) {
          continue
        }
        add(found.kind, found.el, found.detail)
      }

      // Una palabra por línea y cajas estrechas: el texto de cada bloque (el elemento más
      // cercano que no es inline), con sus líneas contadas por Range.getClientRects.
      const blocks = new Map<Element, Text[]>()
      const blockOf = (el: Element | null) => {
        for (let at = el; at; at = at.parentElement) {
          const display = style(at).display
          if (display !== 'inline' && display !== 'contents') return at
        }
        return null
      }
      const texts = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let node = texts.nextNode(); node; node = texts.nextNode()) {
        const parent = node.parentElement
        if (!node.textContent?.trim() || !parent || skipped(parent) || !shown(parent)) continue
        const block = blockOf(parent)
        if (!block || !root.contains(block) || ignored(block)) continue
        const list = blocks.get(block) ?? []
        list.push(node as Text)
        blocks.set(block, list)
      }
      const range = document.createRange()
      for (const [block, nodes] of blocks) {
        const words = nodes
          .map((node) => node.textContent ?? '')
          .join(' ')
          .split(/\s+/)
          .filter(Boolean)
        if (words.length < 2) continue
        const rects: DOMRect[] = []
        for (const node of nodes) {
          range.selectNodeContents(node)
          for (const rect of range.getClientRects()) {
            if (rect.width > 0 && rect.height > 0) rects.push(rect)
          }
        }
        if (rects.length === 0) continue
        rects.sort((a, b) => a.top - b.top)
        let lines = 0
        let bottom = -Infinity
        for (const rect of rects) {
          if (rect.top + rect.height / 2 > bottom) {
            lines += 1
            bottom = rect.bottom
          } else {
            bottom = Math.max(bottom, rect.bottom)
          }
        }
        const sentence = words.join(' ').slice(0, 80)
        if (words.length >= 3 && lines >= words.length) {
          defects.push({
            kind: 'una palabra por línea',
            where: where(block),
            text: sentence,
            detail: `${words.length} palabras en ${lines} líneas`,
          })
          continue
        }
        const ch = parseFloat(style(block).fontSize) * 0.55
        const width = block.getBoundingClientRect().width
        if (lines >= 2 && width < 8 * ch) {
          defects.push({
            kind: 'estrecho',
            where: where(block),
            text: sentence,
            detail: `${words.length} palabras en ${lines} líneas y ${Math.round(width)}px de ancho`,
          })
        }
      }

      // Se solapan: hermanos en flujo que son una caja propia (un control, una fila o algo
      // con fondo, borde o sombra) y se pisan más de 1px en los dos ejes.
      const interactive = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'LI'])
      const isBox = (el: Element) => {
        const s = style(el)
        if (s.display === 'inline' || s.display === 'contents' || !inFlow(el)) return false
        if (interactive.has(el.tagName) || el.getAttribute('role') === 'button') return true
        const painted =
          (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') ||
          s.backgroundImage !== 'none' ||
          s.boxShadow !== 'none' ||
          ['Top', 'Right', 'Bottom', 'Left'].some(
            (side) => parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0,
          )
        return painted
      }
      const boxes = new Set(elements.filter(isBox))
      const parents = new Set([...boxes].map((el) => el.parentElement))
      for (const parent of parents) {
        if (!parent) continue
        const siblings = [...parent.children].filter((el) => boxes.has(el))
        for (let i = 0; i < siblings.length; i++) {
          const a = siblings[i]!.getBoundingClientRect()
          for (let j = i + 1; j < siblings.length; j++) {
            const b = siblings[j]!.getBoundingClientRect()
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
            if (x > 1 && y > 1) {
              add(
                'se solapan',
                siblings[i]!,
                `con ${short(siblings[j]!)} «${textOf(siblings[j]!).slice(0, 40)}» (${Math.round(x)} × ${Math.round(y)}px)`,
              )
            }
          }
        }
      }

      return defects
    },
    { scope, ignore: LAYOUT_LINT_IGNORE },
  )
}

/** Los defectos, uno por línea, para el mensaje de la prueba. */
export const formatDefects = (defects: LayoutDefect[]) =>
  defects.map((d) => `${d.kind}: ${d.where} «${d.text}» (${d.detail})`).join('\n')
