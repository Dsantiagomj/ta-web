import type { ReactNode } from 'react'

import {
  AchievementNav,
  AchievementQuests,
  AchievementSheet,
} from '@/components/achievement/AchievementParts'
import { AchievementCard, Tile } from '@/components/achievement/MetalogrosIndex'
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
import { ZoneBackground } from '@/components/game/ZoneBackground'
import { DofusBody, DofusNeeds, DofusParts } from '@/components/dofus/DofusGuideParts'
import { ChecklistPosters } from '@/components/checklists/ChecklistsIndex'
import { DofusCards } from '@/components/dofus/DofusIndex'
import { CopyIcon } from '@/components/game/icons'
import { Amount } from '@/components/ui/Amount'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { Figure } from '@/components/ui/Figure'
import { IconButton } from '@/components/ui/IconButton'
import { Picture } from '@/components/ui/Picture'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatTile } from '@/components/ui/StatTile'
import { TagPill } from '@/components/ui/TagPill'
import { Ambience } from '@/components/site/Ambience'
import { MenuPanelPreview } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { ThemePicker } from '@/components/theme-picker/ThemePicker'
import type { Mode, Theme } from '@/lib/theme/theme'

import {
  achievement,
  achievementFacts,
  achievementFactsEmpty,
  achievementNeeds,
  achievementNeedsItems,
  achievementQuests,
  achievementQuestsLong,
  dofusAchievementView,
  checklistCards,
  checklistTeaserCard,
  dofusCards,
  dofusNeeds,
  fight,
  nextQuest,
  guide,
  header,
  headerWithout,
  imageAlt,
  images,
  items,
  longChain,
  metalogroCards,
  metalogroTiles,
  navNext,
  navPrevious,
  prose,
  samples,
  steps,
  video,
} from './catalog-data'
import { BlockThumbs } from './BlockThumbs'
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
    <div data-component={name} className={wide ? 'col-span-full min-w-0' : 'min-w-0'}>
      <h3 className="mb-1 font-ui text-xl font-bold text-ink">{s.groups[name]}</h3>
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
      <div className="max-w-(--width-guide)">
        <h2 id={`${key}-h`} className="mb-8 font-ui text-2xl font-bold text-ink">
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
            {/* El panel del menú es de escritorio: en un móvil se desplaza en su caja. */}
            <div className="w-full overflow-x-auto">
              <MenuPanelPreview
                sectionKey="dofus"
                counts={s.demo.siteCounts}
                dofus={s.demo.dofusNav}
                checklists={s.demo.checklistNav}
              />
            </div>
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
            <p className="text-ink-2">
              <b className="text-ink">
                <Amount value={d.siteCounts.guides} />
              </b>
              {d.amountUnit}
            </p>
            <StatTile value={guide.reward.xp} label={samples.stats.xp} />
            <StatTile value={guide.reward.kamas} label={samples.stats.kamas} />
            <div className="grid w-full gap-3">
              <ProgressBar value={3} max={8} label={d.progress} />
              <ProgressBar value={8} max={8} label={d.progress} />
            </div>
          </Group>

          <Group name="theme" note={s.notes.theme}>
            <div className="site-hdr__act !ml-0">
              <ThemePicker initialTheme={theme} initialMode={mode} idPrefix={`${key}-`} />
            </div>
          </Group>

          <Group name="checkbox">
            <Checkbox label={d.hideDone} />
            <Checkbox label={d.done} defaultChecked />
            <Checkbox label={d.unavailable} disabled />
          </Group>

          <Group name="cards" note={s.notes.cards} wide>
            <Card className="p-5 text-sm text-ink-2">{d.panel}</Card>
            <div className="idx grid w-full gap-6 !p-0">
              <ul className="vd-grid !mt-0" role="list">
                {metalogroTiles.map((zone) => (
                  <Tile key={zone.anchor} zone={zone} />
                ))}
              </ul>
              <ul className="acards" role="list">
                {metalogroCards.map((card) => (
                  <AchievementCard key={card.name} achievement={card} />
                ))}
              </ul>
            </div>
            <div className="logro__main w-full">
              <AchievementNav group={achievement.name} previous={navPrevious} next={navNext} />
            </div>
          </Group>

          <Group name="items" note={s.notes.items}>
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
            <IconWell icon="dungeon" />
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

          <Group name="dofus" note={s.notes.dofus} wide>
            <div className="dg-page grid w-full gap-6">
              <div className="dg-index !p-0">
                <DofusCards cards={dofusCards} />
              </div>
              <DofusNeeds needs={dofusNeeds} />
              <DofusBody content={dofusAchievementView.body} />
              <DofusParts view={dofusAchievementView} />
            </div>
          </Group>

          <Group name="eggs" note={s.notes.eggs} wide>
            {(['todo', 'doing', 'done'] as const).map((state) => (
              <div
                key={state}
                className="ck grid justify-items-center gap-2 !p-0"
                data-ck-state={state}
              >
                <span className="ck-egg" aria-hidden="true">
                  <Picture image={items.esmeralda.icon} alt="" />
                </span>
                <code className="text-sm text-ink-2">{state}</code>
              </div>
            ))}
          </Group>

          <Group name="zone" note={s.notes.zone} wide>
            {/* El fondo es fijo a la ventana; aquí, una caja con transform lo contiene. */}
            <div className="quest relative isolate h-64 w-full overflow-hidden rounded-card border border-line !p-6 [transform:translateZ(0)] [&_.zone-bg]:h-full">
              <ZoneBackground image={images.combat} />
              <div className="grid gap-2">
                <p className="text-(--color-ink)">{s.demo.zoneText}</p>
                <p className="text-(--color-muted)">{s.demo.zoneMuted}</p>
                <p className="font-ui text-lg font-bold text-(--color-hue-2)">
                  {s.demo.zoneHeading}
                </p>
              </div>
            </div>
          </Group>

          <Group name="ambience" note={s.notes.ambience} wide>
            <div className="relative isolate h-48 w-full overflow-hidden rounded-card border border-line">
              <Ambience demo />
            </div>
          </Group>

          <Group name="checklists" note={s.notes.checklists} wide>
            <div className="ck-index w-full !p-0">
              <ChecklistPosters entries={checklistCards} teaser={checklistTeaserCard} />
            </div>
          </Group>

          <Group name="achievement" note={s.notes.achievement} wide>
            {/* La columna del logro es el contenedor de sus consultas de anchura. */}
            <div className="logro__main grid w-full gap-6 [--color-section:var(--color-sec-logros)]">
              {/* La ficha, al ancho de su columna del escritorio. */}
              <div className="flex flex-wrap items-start gap-12">
                <div className="w-full max-w-80">
                  <AchievementSheet facts={achievementFacts} needs={achievementNeeds} />
                </div>
                <div className="w-full max-w-80">
                  <AchievementSheet facts={achievementFactsEmpty} needs={achievementNeedsItems} />
                </div>
              </div>
              <AchievementQuests quests={achievementQuests} />
              <AchievementQuests quests={achievementQuestsLong} />
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

          <Group name="blocks" note={s.notes.blocks} wide>
            <BlockThumbs prefix={key} />
          </Group>
        </div>
      </div>
    </section>
  )
}
