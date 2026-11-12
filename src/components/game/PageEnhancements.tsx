'use client'

import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { uiStrings } from '@/components/ui/strings'

import { CloseIcon } from './icons'
import { gameStrings } from './strings'

const s = gameStrings.coordinates
const f = uiStrings.figure
const TOAST_MS = 4000
const COPIED_MS = 1600

/** La imagen que enseña el visor, leída del enlace de la captura (Figure). */
interface Viewed {
  src: string
  avif?: string
  alt: string
  width?: string
  height?: string
  caption?: string
  theme?: string
  mode?: string
}

/**
 * La única isla de las páginas de guía (DESIGN.md, Coordinates chip, Video facade, Figure
 * y Quest header). Se pinta una vez por página y escucha con delegación: copia el
 * data-copy de los chips de coordenadas y de los objetos, cambia el enlace de un vídeo por su reproductor,
 * abre las capturas en un visor a pantalla completa y abre y cierra la bolsa de
 * recompensas. Sin ella, los chips son texto, el vídeo un enlace, la captura un enlace a su
 * archivo y la lista de la bolsa se ve abierta.
 */
export function PageEnhancements() {
  const [message, setMessage] = useState('')
  const [viewed, setViewed] = useState<Viewed | null>(null)
  const viewer = useRef<HTMLDialogElement>(null)
  // El enlace que abrió el visor: recupera el foco al cerrarlo.
  const opener = useRef<HTMLElement | null>(null)

  // Sincroniza el visor con el <dialog> nativo: showModal() al elegir una imagen.
  useEffect(() => {
    if (viewed && !viewer.current?.open) viewer.current?.showModal()
  }, [viewed])

  // Escucha los clics y las teclas del documento (delegación) y usa el portapapeles.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const say = (text: string) => {
      setMessage(text)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(''), TOAST_MS)
    }

    // Cada chip pasa de texto a botón; el nombre empieza por el texto visible.
    for (const node of document.querySelectorAll<HTMLElement>('[data-copy]')) {
      node.setAttribute('role', 'button')
      node.tabIndex = 0
      if (node.dataset.copyLabel) node.setAttribute('aria-label', node.dataset.copyLabel)
    }

    const copy = async (node: HTMLElement) => {
      const command = node.dataset.copy ?? ''
      try {
        await navigator.clipboard.writeText(command)
        say(s.copied(command))
        // El icono de copiar pasa a ser una marca un momento (game.css, objetos que se copian).
        node.dataset.copied = ''
        setTimeout(() => delete node.dataset.copied, COPIED_MS)
      } catch {
        say(node.dataset.copyFailed ?? s.copyFailed(command))
      }
    }

    const play = (link: HTMLAnchorElement) => {
      const player = document.createElement('iframe')
      player.src = link.dataset.videoEmbed ?? ''
      player.title = link.dataset.videoTitle ?? ''
      player.allow = 'autoplay; encrypted-media; picture-in-picture'
      player.allowFullscreen = true
      player.className = 'video__player'
      // Inerte en vez de quitarlo (el nodo es de React) o de ocultarlo: la portada sigue
      // debajo mientras el reproductor entra con su fundido, fuera del tabulador y del lector.
      link.inert = true
      link.after(player)
      player.focus()
    }

    const view = (link: HTMLAnchorElement) => {
      const image = link.querySelector('img')
      // El visor toma el tema y el modo de donde está la captura (las secciones de /sistema).
      const scope = link.closest<HTMLElement>('[data-theme]')
      opener.current = link
      setViewed({
        src: link.href,
        avif: link.dataset.imageAvif,
        alt: image?.alt ?? '',
        width: image?.getAttribute('width') ?? undefined,
        height: image?.getAttribute('height') ?? undefined,
        caption: link.closest('figure')?.querySelector('figcaption')?.textContent ?? undefined,
        theme: scope?.dataset.theme,
        mode: scope?.dataset.mode,
      })
    }

    // La bolsa: un botón de divulgación. El estado vive en su aria-expanded, y el CSS
    // enseña la lista según él (game.css, data-js).
    const bagButton = (bag: Element) => bag.querySelector('button')
    const setBag = (bag: Element, open: boolean) => {
      bagButton(bag)?.setAttribute('aria-expanded', String(open))
      const list = bag.querySelector<HTMLElement>('.bag__list')
      if (!open || !list) return
      // Abierta, la lista sale del borde izquierdo de la bolsa; si así no cabe en la ventana
      // (con 16px de margen), se corre a la izquierda lo que sobra. offsetWidth es su ancho
      // sin la escala de la entrada.
      const room = document.documentElement.clientWidth - 16
      const over = bag.getBoundingClientRect().left + list.offsetWidth - room
      list.style.setProperty('--bag-shift', String(Math.max(0, Math.ceil(over))))
    }
    const openBags = () =>
      [...document.querySelectorAll('[data-bag] > [aria-expanded="true"]')].flatMap((button) =>
        button.parentElement ? [button.parentElement] : [],
      )

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      // Un clic fuera de una bolsa abierta la cierra; en su botón, la abre o la cierra.
      const bag = target?.closest('[data-bag]')
      for (const open of openBags()) if (open !== bag) setBag(open, false)
      if (bag && target?.closest('.bag__btn')) {
        setBag(bag, bagButton(bag)?.getAttribute('aria-expanded') !== 'true')
        return
      }
      const copyNode = target?.closest<HTMLElement>('[data-copy]')
      if (copyNode) {
        event.preventDefault()
        void copy(copyNode)
        return
      }
      // Con una tecla modificadora, los enlaces abren su destino como cualquier otro.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const video = target?.closest<HTMLAnchorElement>('a[data-video-embed]')
      if (video) {
        event.preventDefault()
        play(video)
        return
      }
      const figure = target?.closest<HTMLAnchorElement>('a[data-image-viewer]')
      if (figure) {
        event.preventDefault()
        view(figure)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // Esc cierra la bolsa; si el foco estaba dentro, vuelve a su botón.
      if (event.key === 'Escape') {
        for (const open of openBags()) {
          setBag(open, false)
          if (open.contains(document.activeElement)) bagButton(open)?.focus()
        }
        return
      }
      if (event.key !== 'Enter' && event.key !== ' ') return
      const node =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-copy]') : null
      if (!node) return
      event.preventDefault()
      void copy(node)
    }

    // El foco que sale de una bolsa abierta la cierra.
    const onFocusOut = (event: FocusEvent) => {
      const bag = event.target instanceof Element ? event.target.closest('[data-bag]') : null
      const next = event.relatedTarget
      if (bag && next instanceof Node && !bag.contains(next)) setBag(bag, false)
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const close = () => viewer.current?.close()

  return (
    <>
      <p role="status" className="toast" data-visible={message ? '' : undefined}>
        {message}
      </p>
      {/* Esc lo cierra el navegador; el clic fuera de la imagen cae en el propio <dialog>. */}
      <dialog
        ref={viewer}
        className="viewer"
        aria-label={f.viewer}
        data-theme={viewed?.theme}
        data-mode={viewed?.mode}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        // La imagen se queda dentro del visor cerrado: así se ve salir (DESIGN.md, Motion).
        onClose={() => opener.current?.focus()}
      >
        {viewed && (
          <>
            <IconButton
              label={f.close}
              icon={<CloseIcon />}
              className="viewer__close"
              onClick={close}
            />
            <figure className="viewer__figure">
              <picture>
                {viewed.avif && <source type="image/avif" srcSet={viewed.avif} />}
                <img
                  src={viewed.src}
                  alt={viewed.alt}
                  width={viewed.width}
                  height={viewed.height}
                  className="viewer__image"
                />
              </picture>
              {viewed.caption && <figcaption>{viewed.caption}</figcaption>}
            </figure>
          </>
        )}
      </dialog>
    </>
  )
}
