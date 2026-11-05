import type { ReactNode } from 'react'

import { Callout } from '@/components/ui/Callout'
import { Figure } from '@/components/ui/Figure'
import type { GuideBlock, GuideStep } from '@/lib/guides/page'

import './game.css'
import { GuideRichText } from './GuideRichText'
import { StagesTimeline } from './StagesTimeline'
import { VideoFacade } from './VideoFacade'

/** Los bloques en orden, sin envoltorio: prosa, capturas, vídeos y avisos. */
export function GuideBlocks({ blocks }: { blocks: GuideBlock[] }) {
  return blocks.map((block) => {
    switch (block.kind) {
      case 'richText':
        return (
          <GuideRichText
            key={block.key}
            content={block.content}
            priorityImage={block.priorityImage}
          />
        )
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
            <GuideRichText content={block.content} priorityImage={block.priorityImage} />
          </Callout>
        )
    }
  })
}

/**
 * Prosa de la guía fuera de los pasos: la entrada, el cierre o, sin bloques Paso, todo el
 * cuerpo (DESIGN.md, Quest guide). Todo en el servidor; la isla de la página abre las
 * capturas y los vídeos.
 */
export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  if (blocks.length === 0) return null
  return (
    <div className="guide-body">
      <GuideBlocks blocks={blocks} />
    </div>
  )
}

/**
 * Los pasos de la guía (DESIGN.md, Steps timeline): tarjetas numeradas que se marcan al
 * terminarlas y la píldora de progreso, todo con CSS. Los hijos, el Botín, cierran la línea.
 */
export function GuideSteps({ steps, children }: { steps: GuideStep[]; children?: ReactNode }) {
  return (
    <StagesTimeline
      id="pasos"
      ticks
      stages={steps.map((step) => ({
        title: step.title,
        coordinates: step.coordinates,
        content: <GuideBlocks blocks={step.blocks} />,
      }))}
    >
      {children}
    </StagesTimeline>
  )
}
