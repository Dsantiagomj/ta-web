'use client'

import { useEffect, useState } from 'react'

import { gameStrings } from './strings'

const s = gameStrings.coordinates
const TOAST_MS = 4000

/**
 * La única isla de las páginas de guía (DESIGN.md, Coordinates chip y Video facade). Se
 * pinta una vez por página y escucha con delegación: copia el data-copy de los chips de
 * coordenadas y cambia el enlace de un vídeo por su reproductor. Sin ella, los chips son
 * texto y el vídeo un enlace.
 */
export function PageEnhancements() {
  const [message, setMessage] = useState('')

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

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const copyNode = target?.closest<HTMLElement>('[data-copy]')
      if (copyNode) {
        event.preventDefault()
        void copy(copyNode)
        return
      }
      const video = target?.closest<HTMLAnchorElement>('a[data-video-embed]')
      // Con una tecla modificadora, el enlace abre YouTube como cualquier otro.
      if (video && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        event.preventDefault()
        play(video)
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

  return (
    <p role="status" className="toast" data-visible={message ? '' : undefined}>
      {message}
    </p>
  )
}
