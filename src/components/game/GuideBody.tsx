import { Callout } from '@/components/ui/Callout'
import { Figure } from '@/components/ui/Figure'
import type { GuideBlock } from '@/lib/guides/page'

import './game.css'
import { GuideRichText } from './GuideRichText'
import { VideoFacade } from './VideoFacade'

/**
 * El cuerpo de la guía en orden: prosa, capturas, vídeos y avisos. Hasta que exista el
 * bloque de etapa no hay línea de etapas: la guía se lee como prosa (DESIGN.md, Quest
 * guide). Todo en el servidor; la isla de la página abre las capturas y los vídeos.
 */
export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  if (blocks.length === 0) return null
  return (
    <div className="guide-body">
      {blocks.map((block) => {
        switch (block.kind) {
          case 'richText':
            return <GuideRichText key={block.key} content={block.content} />
          case 'image':
            return (
              <Figure
                key={block.key}
                image={block.image}
                alt={block.alt}
                caption={block.caption}
                priority={block.priority}
              />
            )
          case 'video':
            return <VideoFacade key={block.key} url={block.url} title={block.title} />
          case 'callout':
            return (
              <Callout key={block.key} variant={block.variant}>
                <GuideRichText content={block.content} />
              </Callout>
            )
        }
      })}
    </div>
  )
}
