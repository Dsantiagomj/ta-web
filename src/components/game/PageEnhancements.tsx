'use client'

import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { uiStrings } from '@/components/ui/strings'

import { CloseIcon } from './icons'
import { gameStrings } from './strings'

const s = gameStrings.coordinates
const f = uiStrings.figure
const TOAST_MS = 4000

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
 * y Steps side list). Se pinta una vez por página y escucha con delegación: copia el
 * data-copy de los chips de coordenadas, cambia el enlace de un vídeo por su reproductor,
 * abre las capturas en un visor a pantalla completa y marca en la lista «Pasos» el paso que
 * se está leyendo. Sin ella, los chips son texto, el vídeo un enlace, la captura un enlace
 * a su archivo y la lista «Pasos» una lista de enlaces.
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
      } catch {
        say(s.copyFailed(command))
      }
    }

    const play = (link: HTMLAnchorElement) => {
      const player = document.createElement('iframe')
      player.src = link.dataset.videoEmbed ?? ''
      player.title = link.dataset.videoTitle ?? ''
      player.allow = 'autoplay; encrypted-media; picture-in-picture'
      player.allowFullscreen = true
      player.className = 'video__player'
      // Se oculta en vez de quitarlo: el nodo es de React.
      link.hidden = true
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

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
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
      if (event.key !== 'Enter' && event.key !== ' ') return
      const node =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-copy]') : null
      if (!node) return
      event.preventDefault()
      void copy(node)
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Sincroniza la lista «Pasos» con el paso visible, mediante IntersectionObserver.
  useEffect(() => {
    const steps = [...document.querySelectorAll<HTMLElement>('[data-step]')]
    const links = new Map(
      [...document.querySelectorAll<HTMLAnchorElement>('[data-tracker]')].map((link) => [
        link.dataset.tracker,
        link,
      ]),
    )
    if (steps.length === 0 || !('IntersectionObserver' in window)) return
    const mark = (id: string) => {
      for (const [key, link] of links) {
        if (key === id) link.setAttribute('aria-current', 'step')
        else link.removeAttribute('aria-current')
      }
      for (const step of steps) step.toggleAttribute('data-current', step.id === id)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) mark(entry.target.id)
      },
      // El paso que cruza la franja entre el 30 % y el 40 % de la altura de la ventana.
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const step of steps) observer.observe(step)
    return () => observer.disconnect()
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
        onClose={() => {
          setViewed(null)
          opener.current?.focus()
        }}
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
