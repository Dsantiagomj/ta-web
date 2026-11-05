import type { ReactNode } from 'react'

import { Emblem } from '@/components/brand/Emblem'
import { AchievementChain } from '@/components/game/AchievementChain'
import { BotinCard } from '@/components/game/BotinCard'
import { CoordinatesText, TravelButton } from '@/components/game/Coordinates'
import { HeroHeader } from '@/components/game/HeroHeader'
import { ItemChip, ItemSlot } from '@/components/game/Item'
import { LevelMedallion } from '@/components/game/LevelMedallion'
import { FightBlock } from '@/components/game/MonsterChip'
import { StagesTimeline } from '@/components/game/StagesTimeline'
import { SummaryRibbon } from '@/components/game/SummaryRibbon'
import { VideoFacade } from '@/components/game/VideoFacade'
import { CopyIcon } from '@/components/game/icons'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { Figure } from '@/components/ui/Figure'
import { IconButton } from '@/components/ui/IconButton'
import { IMAGE_SIZES } from '@/components/ui/image-sizes'
import { Picture } from '@/components/ui/Picture'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatTile } from '@/components/ui/StatTile'
import { TagPill } from '@/components/ui/TagPill'
import type { Mode, Theme } from '@/lib/theme/theme'

import {
  achievement,
  fight,
  guide,
  imageAlt,
  images,
  items,
  longChain,
  needsGuide,
  prose,
  samples,
  stages,
  video,
} from './catalog-data'
import { catalogStrings as s } from './strings'

type GroupKey = keyof typeof s.groups

function Group({
  name,
  note,
  wide,
  children,
}: {
  name: GroupKey
  note?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div data-component={name} className={wide ? 'col-span-full' : undefined}>
      <h3 className="mb-1 font-display text-xl text-ink">{s.groups[name]}</h3>
      {note && <p className="mb-3 text-sm text-ink-2">{note}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/**
 * Una sección del catálogo con su propio tema y modo: cada componente con sus estados.
 * Los ids llevan el tema y el modo para no repetirse en la página.
 */
export function CatalogSection({ theme, mode }: { theme: Theme; mode: Mode }) {
  const key = `${theme}-${mode}`
  const label = s.section(s.themes[theme], s.modes[mode])
  const d = s.demo

  return (
    <section
      id={key}
      data-theme={theme}
      data-mode={mode}
      aria-labelledby={`${key}-h`}
      className="bg-bg px-4 py-12 text-ink [--color-section:var(--color-sec-misiones)] sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-(--width-page)">
        <h2 id={`${key}-h`} className="mb-8 font-display text-2xl text-ink uppercase">
          {label}
        </h2>
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-2">
          <Group name="brand" note={s.notes.brand} wide>
            <Emblem variant="simple" size={16} />
            <Emblem size={30} />
            <Emblem size={36} />
            <Emblem size={64} />
            <span className="flex items-center gap-2.5 font-display text-xl font-bold tracking-[0.02em] text-ink uppercase">
              <Emblem size={36} />
              {s.demo.brand}
            </span>
          </Group>

          <Group name="buttons">
            <Button>{d.primary}</Button>
            <Button compact icon={<CopyIcon />}>
              {d.copy}
            </Button>
            <Button variant="secondary">{d.secondary}</Button>
            <Button variant="ghost">{d.ghost}</Button>
            <Button disabled>{d.disabled}</Button>
            <ButtonLink href="#enlace" variant="secondary">
              {d.link}
            </ButtonLink>
            <IconButton
              label={d.search}
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
              }
            />
          </Group>

          <Group name="chips">
            <Chip>{d.daily}</Chip>
            <Chip icon={<Picture image={items.pico.icon} alt="" />}>{items.pico.name}</Chip>
            <TagPill>{d.zone}</TagPill>
            <TagPill href="#astrub">{d.zone}</TagPill>
          </Group>

          <Group name="callouts" wide>
            <div className="grid w-full gap-3 md:grid-cols-3">
              <Callout variant="tip">{samples.callouts.tip}</Callout>
              <Callout variant="warning">{samples.callouts.warning}</Callout>
              <Callout variant="stop">{samples.callouts.stop}</Callout>
            </div>
          </Group>

          <Group name="figures">
            <StatTile value={guide.reward.xp} label={samples.stats.xp} />
            <StatTile value={needsGuide.reward.kamas} label={samples.stats.kamas} />
            <div className="grid w-full gap-3">
              <ProgressBar value={3} max={8} label={d.progress} />
              <ProgressBar value={8} max={8} label={d.progress} />
            </div>
          </Group>

          <Group name="checkbox">
            <Checkbox label={d.hideDone} />
            <Checkbox label={d.done} defaultChecked />
            <Checkbox label={d.unavailable} disabled />
          </Group>

          <Group name="cards" wide>
            <Card className="p-5 text-sm text-ink-2">{d.panel}</Card>
            <Card href="#el-cazador-cazado" className="grid w-full sm:grid-cols-[240px_1fr]">
              <span className="block aspect-video overflow-hidden">
                <Picture
                  image={images.kerubim}
                  alt=""
                  sizes={IMAGE_SIZES.card}
                  className="size-full scale-104 object-cover transition-transform duration-600 ease-out group-hover:scale-100"
                />
              </span>
              <span className="grid content-center gap-1.5 px-5.5 py-4.5">
                <span className="font-display text-micro text-muted uppercase">
                  {d.nextEyebrow}
                </span>
                <span className="font-display text-2xl text-ink uppercase">El cazador cazado</span>
                <span className="text-sm text-ink-2">{d.nextMeta}</span>
              </span>
            </Card>
          </Group>

          <Group name="medallion">
            <LevelMedallion level={guide.level} />
            <LevelMedallion level={200} />
          </Group>

          <Group name="items">
            <ItemChip item={items.esmeralda} quantity={1} />
            <ItemChip item={{ name: 'Ron marino' }} quantity={10} />
            <ul className="flex flex-wrap gap-2.5" role="list">
              <ItemSlot item={items.pico} quantity={1} />
              <ItemSlot item={items.ojo} quantity={1000} />
              <ItemSlot item={{ name: 'Ron marino' }} quantity={10} />
            </ul>
          </Group>

          <Group name="hero" note={s.notes.hero} wide>
            <div className="grid w-full gap-6">
              <HeroHeader
                headingLevel={4}
                title={guide.title}
                subtitle={guide.subtitle}
                level={guide.level}
                crumbs={guide.crumbs}
                art={{ image: images.combat, position: '50% 38%' }}
              />
              <HeroHeader
                headingLevel={4}
                title={samples.heroNoArt.title}
                subtitle={samples.heroNoArt.subtitle}
                level={200}
                crumbs={guide.crumbs.slice(0, 2)}
              />
            </div>
          </Group>

          <Group name="ribbon" note={s.notes.ribbon} wide>
            <div className="grid w-full gap-4">
              <SummaryRibbon
                start={guide.start}
                requires={guide.requires}
                needs={guide.needs}
                reward={guide.reward}
                rewardHref={`#${key}-botin`}
              />
              <SummaryRibbon {...needsGuide} rewardHref={`#${key}-botin-xp`} />
              <SummaryRibbon
                reward={{ xp: 1000000, kamas: 21990 }}
                rewardHref={`#${key}-botin-xp`}
              />
              <SummaryRibbon
                reward={samples.rewardNotes.map((line) => line.replace(/\.$/, '')).join(' · ')}
                rewardHref={`#${key}-botin-texto`}
              />
            </div>
          </Group>

          <Group name="fight">
            <FightBlock monsters={fight} />
          </Group>

          <Group name="coordinates" note={s.notes.coordinates}>
            <p className="max-w-[72ch]">
              <CoordinatesText>{prose}</CoordinatesText>
            </p>
            <TravelButton x={guide.start.x} y={guide.start.y} />
          </Group>

          <Group name="stages" note={s.notes.stages} wide>
            <div className="w-full">
              <StagesTimeline id={`${key}-pasos`} stages={stages} ticks headingLevel={4}>
                <BotinCard
                  id={`${key}-botin`}
                  headingLevel={4}
                  xp={guide.reward.xp}
                  kamas={guide.reward.kamas}
                  items={guide.rewards}
                  chain={guide.chain}
                />
              </StagesTimeline>
            </div>
          </Group>

          <Group name="botin" wide>
            <div className="w-full max-w-[calc(var(--width-prose)+64px)]">
              <BotinCard
                id={`${key}-botin-xp`}
                headingLevel={4}
                xp={needsGuide.reward.xp}
                kamas={needsGuide.reward.kamas}
              />
              <BotinCard id={`${key}-botin-texto`} headingLevel={4} notes={samples.rewardNotes} />
            </div>
          </Group>

          <Group name="chain" wide>
            <div className="grid gap-3">
              <AchievementChain {...guide.chain} />
              <AchievementChain achievement={achievement} quests={longChain} current={3} />
            </div>
          </Group>

          <Group name="video" note={s.notes.video} wide>
            <div className="grid w-full gap-6 md:grid-cols-2">
              <VideoFacade url={video.url} title={video.title} poster={images.video} />
              <VideoFacade url={video.url} title={video.title} />
            </div>
          </Group>

          <Group name="image" note={s.notes.image} wide>
            <div className="w-full max-w-(--width-prose)">
              <Figure
                image={images.hupeEsse}
                alt={imageAlt.hupeEsse}
                caption={samples.hupeEsseCaption}
              />
            </div>
          </Group>
        </div>
      </div>
    </section>
  )
}
