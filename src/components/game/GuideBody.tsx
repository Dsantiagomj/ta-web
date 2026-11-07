import { Callout } from '@/components/ui/Callout'
import { Figure } from '@/components/ui/Figure'
import type { GuideBlock, GuideStep } from '@/lib/guides/page'
import { type GuideStart, startSentenceNpc, stepAnchor, stepPin } from '@/lib/guides/step-nav'

import './game.css'
import { FightBlock } from './FightBlock'
import { GuideRichText } from './GuideRichText'
import { QuestSteps } from './QuestSteps'
import { TorreTips } from './TorreTips'
import { VideoFacade } from './VideoFacade'

/**
 * Los bloques en orden, sin envoltorio: prosa, capturas, vídeos y avisos. minHeading es el
 * nivel más alto de los títulos del texto: 3 dentro de un paso, bajo el h2 «Pasos»; 4
 * dentro de un aviso, bajo su h3.
 */
export function GuideBlocks({
  blocks,
  minHeading = 2,
}: {
  blocks: GuideBlock[]
  minHeading?: 2 | 3
}) {
  return blocks.map((block) => {
    switch (block.kind) {
      case 'richText':
        return (
          <GuideRichText
            key={block.key}
            content={block.content}
            priorityImage={block.priorityImage}
            minHeading={minHeading}
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
      case 'fight':
        return <FightBlock key={block.key} monsters={block.monsters} />
      case 'callout': {
        const text = (
          <GuideRichText
            content={block.content}
            priorityImage={block.priorityImage}
            minHeading={4}
          />
        )
        // Un consejo es Torre hablando: su avatar y su bocadillo (DESIGN.md, Torre's tips).
        return block.variant === 'tip' ? (
          <TorreTips key={block.key}>{text}</TorreTips>
        ) : (
          <Callout key={block.key} variant={block.variant}>
            {text}
          </Callout>
        )
      }
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
 * Los pasos de la guía (DESIGN.md, Steps): sin números, títulos ni casillas, con su
 * contenido. Las coordenadas del paso que su texto no nombra van como chip al principio;
 * en un paso 1 sin texto con las coordenadas del inicio, dentro de la frase de inicio.
 */
export function GuideSteps({ steps, start }: { steps: GuideStep[]; start?: GuideStart }) {
  return (
    <QuestSteps
      steps={steps.map((step, index) => ({
        id: stepAnchor(index),
        pin: stepPin(step),
        startNpc: index === 0 ? startSentenceNpc(step, start) : undefined,
        content: <GuideBlocks blocks={step.blocks} minHeading={3} />,
      }))}
    />
  )
}
