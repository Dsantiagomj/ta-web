import type { ReactNode } from 'react'

import { Emblem } from '@/components/brand/Emblem'
import { Lockup } from '@/components/brand/Lockup'
import { AchievementChain } from '@/components/game/AchievementChain'
import { CoordinatesText, TravelButton } from '@/components/game/Coordinates'
import { IconWell } from '@/components/game/IconWell'
import { ItemChip, ItemSlot } from '@/components/game/Item'
import { FightBlock } from '@/components/game/FightBlock'
import { NextQuestCard } from '@/components/game/NextQuestCard'
import { QuestHeader } from '@/components/game/QuestHeader'
import { QuestSteps } from '@/components/game/QuestSteps'
import { TorreTips } from '@/components/game/TorreTips'
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
import { MenuPanelPreview } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import type { Mode, Theme } from '@/lib/theme/theme'

import {
  achievement,
  fight,
  nextQuest,
  guide,
  header,
  headerWithout,
  imageAlt,
  images,
  items,
  longChain,
  prose,
  samples,
  steps,
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
        <h2 id={`${key}-h`} className="mb-8 font-display text-2xl text-ink">
          {label}
        </h2>
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-2">
          <Group name="brand" note={s.notes.brand} wide>
            <Emblem variant="simple" size={16} />
            <Emblem size={30} />
            <Emblem size={36} />
            <Emblem size={64} />
            <Lockup />
            <Lockup size="footer" />
          </Group>

          <Group name="site" note={s.notes.site} wide>
            <MenuPanelPreview sectionKey="dofus" counts={s.demo.siteCounts} />
            <div className="w-full">
              <SiteFooter year={2026} />
            </div>
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

          <Group name="torre" note={s.notes.torre} wide>
            <div className="w-full max-w-(--width-prose)">
              <TorreTips>
                <p>{samples.tips}</p>
              </TorreTips>
            </div>
          </Group>

          <Group name="figures">
            <StatTile value={guide.reward.xp} label={samples.stats.xp} />
            <StatTile value={guide.reward.kamas} label={samples.stats.kamas} />
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
                <span className="font-display text-2xl text-ink">El cazador cazado</span>
                <span className="text-sm text-ink-2">{d.nextMeta}</span>
              </span>
            </Card>
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

          <Group name="header" note={s.notes.header} wide>
            <div className="grid w-full gap-10">
              <QuestHeader headingLevel={2} title={guide.title} data={header} />
              <QuestHeader headingLevel={2} title={samples.headerWithout} data={headerWithout} />
            </div>
          </Group>

          <Group name="wells" note={s.notes.wells}>
            <IconWell icon="quest" />
            <IconWell icon="combat" />
            <IconWell icon="xp" />
            <IconWell icon="kamas" />
            <IconWell icon="achievement" />
            <IconWell image={items.pico.icon} />
            <IconWell />
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

          <Group name="steps" note={s.notes.steps} wide>
            <div className="quest w-full !p-0">
              <QuestSteps headingLevel={3} steps={steps(key)} />
            </div>
          </Group>

          <Group name="next" wide>
            <div className="quest grid w-full gap-4 !p-0">
              <NextQuestCard card={nextQuest} />
              <NextQuestCard card={{ title: 'Una misión sin captura', href: '#sin-captura' }} />
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
