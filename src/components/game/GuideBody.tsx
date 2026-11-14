import type { ReactNode } from 'react'

import { Callout } from '@/components/ui/Callout'
import { Figure } from '@/components/ui/Figure'
import { IMAGE_SIZES } from '@/components/ui/image-sizes'
import type { GuideBlock, GuideContent, GuideStep } from '@/lib/guides/page'
import { type GuideStart, startSentenceNpc, stepAnchor, stepPin } from '@/lib/guides/step-nav'

import './game.css'
import { FightBlock } from './FightBlock'
import { GuideRichText } from './GuideRichText'
import { QuestSteps } from './QuestSteps'
import { TorreTips } from './TorreTips'
import { VideoFacade } from './VideoFacade'

/** Un bloque de la guía con su componente. half: la captura ocupa media columna. */
function guideBlock(block: GuideBlock, minHeading: 2 | 3, half = false): ReactNode {
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
          {...(half && { sizes: IMAGE_SIZES.half })}
        />
      )
    case 'video':
      return <VideoFacade key={block.key} url={block.url} title={block.title} />
    case 'fight':
      return <FightBlock key={block.key} monsters={block.monsters} />
    case 'callout': {
      const text = (
        <GuideRichText content={block.content} priorityImage={block.priorityImage} minHeading={4} />
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
}

/**
 * Los bloques en orden, sin envoltorio: prosa, capturas, vídeos y avisos. minHeading es el
 * nivel más alto de los títulos del texto: 3 dentro de un paso, bajo el h2 «Pasos»; 4
 * dentro de un aviso, bajo su h3. Con figures, las capturas seguidas van juntas en una
 * rejilla (.figs), de dos en dos desde 40rem (DESIGN.md, Steps); una sola, también.
 */
export function GuideBlocks({
  blocks,
  minHeading = 2,
  figures = false,
}: {
  blocks: GuideBlock[]
  minHeading?: 2 | 3
  figures?: boolean
}) {
  if (!figures) return blocks.map((block) => guideBlock(block, minHeading))
  const out: ReactNode[] = []
  let run: Extract<GuideBlock, { kind: 'image' }>[] = []
  const flush = () => {
    if (run.length === 0) return
    out.push(
      <div key={`figs-${run[0]!.key}`} className="figs">
        {run.map((image) => guideBlock(image, minHeading, true))}
      </div>,
    )
    run = []
  }
  for (const block of blocks) {
    if (block.kind === 'image') {
      run.push(block)
      continue
    }
    flush()
    out.push(guideBlock(block, minHeading))
  }
  flush()
  return out
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
export function GuideSteps({
  steps,
  start,
  headingLevel,
}: {
  steps: GuideStep[]
  start?: GuideStart
  /** 3 si los pasos van dentro de otra sección con su h2 (el paso a paso de una guía de Dofus). */
  headingLevel?: 2 | 3
}) {
  return (
    <QuestSteps
      headingLevel={headingLevel}
      steps={steps.map((step, index) => ({
        id: stepAnchor(index),
        pin: stepPin(step),
        startNpc: index === 0 ? startSentenceNpc(step, start) : undefined,
        content: <GuideBlocks blocks={step.blocks} minHeading={3} figures />,
      }))}
    />
  )
}

/**
 * El cuerpo partido de una guía (guideContent): la entrada, los pasos y el cierre, cada uno
 * solo si tiene algo. Lo comparten las guías de misión y el paso a paso de las de Dofus.
 */
export function GuideSections({
  content,
  start,
  headingLevel,
  introClassName,
  outroClassName,
}: {
  content: GuideContent
  start?: GuideStart
  headingLevel?: 2 | 3
  introClassName?: string
  outroClassName?: string
}) {
  const { intro, steps, outro } = content
  // Con clase, cada parte va en su caja (la entrada y el cierre de una guía de misión).
  const part = (blocks: GuideBlock[], className?: string) =>
    blocks.length === 0 ? null : className ? (
      <div className={className}>
        <GuideBody blocks={blocks} />
      </div>
    ) : (
      <GuideBody blocks={blocks} />
    )
  return (
    <>
      {part(intro, introClassName)}
      {steps.length > 0 && <GuideSteps steps={steps} start={start} headingLevel={headingLevel} />}
      {part(outro, outroClassName)}
    </>
  )
}
