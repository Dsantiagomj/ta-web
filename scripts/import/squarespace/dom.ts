import { Window } from 'happy-dom'

// Una sola ventana para todo el proceso. El HTML de Squarespace no es de confianza:
// sin JavaScript y sin descargar nada (scripts, CSS ni iframes) al parsearlo.
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

/** Parsea un documento HTML completo o un fragmento (queda dentro de body). */
export function parseHtml(html: string): Document {
  const parser = new (sharedWindow().DOMParser)()
  return parser.parseFromString(html, 'text/html') as unknown as Document
}

/** Texto visible de un nodo con los espacios (también los no separables) colapsados. */
export function normalizedText(node: Node): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim()
}
