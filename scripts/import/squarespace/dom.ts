import { Window } from 'happy-dom'

// Una ventana compartida entre lecturas. El HTML de Squarespace no es de confianza: sin
// JavaScript y sin descargar nada (scripts, CSS ni iframes) al parsearlo. happy-dom
// retiene en la ventana cada documento que parsea (unos 8 MB por página), así que quien
// lee muchas páginas llama a releaseDom entre una y otra.
let window: Window | undefined

function sharedWindow(): Window {
  window ??= new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true,
      navigation: {
        disableMainFrameNavigation: true,
        disableChildFrameNavigation: true,
        disableChildPageNavigation: true,
      },
    },
  })
  return window
}

/**
 * Cierra la ventana compartida y suelta lo que retiene; la siguiente lectura abre otra.
 * Los documentos leídos antes dejan de ser válidos: se llama cuando ya no se usan.
 */
export async function releaseDom(): Promise<void> {
  const closing = window
  window = undefined
  await closing?.happyDOM.close()
}

/** Parsea un documento HTML completo o un fragmento (queda dentro de body). */
export function parseHtml(html: string): Document {
  const parser = new (sharedWindow().DOMParser)()
  return parser.parseFromString(html, 'text/html') as unknown as Document
}

/** Texto visible de un nodo con los espacios (también los no separables) colapsados. */
export function normalizedText(node: Node): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim()
}
