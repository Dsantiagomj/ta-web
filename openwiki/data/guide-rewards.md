---
type: workflow
title: Quest guide rewards
description: How a quest guide stores its rewards as fields Torre edits (XP, minimum XP, kamas, items, level tiers and other rewards) beside the Squarespace text, how the guide header picks between them and DofusDB, and the one-off maintenance scripts that filled and cleaned them (guides:rewards, guides:rewards-dofusdb, guides:reward-typos, guides:shown-items).
tags: [quest-guides, rewards, dofusdb, scripts, maintenance]
sources:
  - id: openwiki-source-a3fe1d37be9dfac8725ba9b3
    resource: repo://scripts/backfill-guide-rewards.ts
  - id: openwiki-source-81ba7820fbe1c2537767f4b2
    resource: repo://scripts/backfill-shown-items.ts
  - id: openwiki-source-e7f5718c01455f83b9cb80e5
    resource: repo://scripts/fix-reward-typos.ts
  - id: openwiki-source-c2ebc4bd226b9eaa283753b2
    resource: repo://scripts/prefer-dofusdb-rewards.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-da46d93984eee20610878e73
    resource: repo://src/lib/guides/backfill-rewards.ts
  - id: openwiki-source-09ec39f59a9916ea0a2bf2d6
    resource: repo://src/lib/guides/page.ts
  - id: openwiki-source-0a191833c386f6bf3e56dbb2
    resource: repo://src/lib/guides/prefer-dofusdb.ts
  - id: openwiki-source-d1e49d152eb8831461f6078d
    resource: repo://src/lib/guides/reward-text.ts
  - id: openwiki-source-ec33d36000d7810c05214e1c
    resource: repo://src/lib/guides/reward-typos.ts
  - id: openwiki-source-8a5e1b96a7445e1d78fb454c
    resource: repo://src/lib/guides/shown-items.ts
  - id: openwiki-source-3e1b4c5db899d67481848ee9
    resource: repo://src/lib/text/edit-distance.ts
  - id: openwiki-source-fffb44058cdb04a97873b705
    resource: repo://tests/integration/backfill-guide-rewards.test.ts
  - id: openwiki-source-0e600d85c9497a58a469ec8f
    resource: repo://tests/integration/backfill-shown-items.test.ts
  - id: openwiki-source-7ab84230ee2d55c9e4283715
    resource: repo://tests/integration/fix-reward-typos.test.ts
  - id: openwiki-source-403efce73a50b56d930b2a02
    resource: repo://tests/unit/guide-prefer-dofusdb.test.ts
  - id: openwiki-source-74f2a6a0ab63cbfa580c3571
    resource: repo://tests/unit/guide-reward-text.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Quest guide rewards

A quest guide used to keep its rewards only as the text Torre wrote on Squarespace («2 625 000 XP.», «43 980 kamas.», «10 x Perla de las profundidades.»), while the header drew DofusDB's figures. The structured fields let Torre's figures win on the page and keep the old text as a fallback.

## The fields

The collapsible «Recompensas» inside a guide's summary (`src/collections/QuestGuides.ts`) holds:

| Field | Type | Meaning |
|---|---|---|
| `rewardExperience`, `rewardExperienceMin`, `rewardKamas` | numbers, at least 0 | XP, the start of the XP range and kamas. A `0` removes that figure from the page |
| `rewardItems` | array of `{ item, quantity }` | Reward items, in Torre's order |
| `rewardLevels` («Por nivel») | array of tiers `{ levelMin, levelMax, experience, kamas, items }` | Only for quests whose reward changes with the character's level (event quests). The XP and kamas are those of the tier's highest level |
| `rewardNotes` («Otras recompensas») | localized textarea | What is not XP, kamas or a game item («Emote: Facepalm»), one per line; never filled automatically |
| `rewards` («Recompensas en texto») | localized textarea | The Squarespace text as it was |

Every figure and list has a `SummaryNote` under it comparing it with DofusDB, and the «Rellenar desde DofusDB» button or the first save fills the empty ones (see [Writing a quest guide](../cms/guide-authoring.md)). DofusDB's own figures, including `rewards.byLevel` per quest, come from `questRewards` (see [DofusDB game data refresh](dofusdb-refresh.md#rewards-by-level)).

## What the header shows

`questHeaderProps` (`src/lib/guides/page.ts`) decides the «Recompensas» of the guide header (see [Public quest guide page](../frontend/guide-page.md)):

1. **Level tiers first.** `rewardLevels(guide)` takes Torre's tiers when he wrote any, otherwise DofusDB's `byLevel` with their items reversed into Torre's order. With two or more tiers, the header shows one block per tier, plus «Otras recompensas», and nothing else.
2. **Otherwise the figures.** Torre's XP wins and goes with his own minimum, never DofusDB's, because two figures from different sources would not form a range. Without his XP, DofusDB's XP and minimum. Kamas are his or DofusDB's. Items are his rows, or DofusDB's reversed. Only positive figures show.
3. **The text last.** When neither Torre nor DofusDB gives any figure, item or note, the header shows the lines of «Recompensas en texto».

## The maintenance scripts

The fields arrived after about 1,250 guides existed, so a set of one-off scripts filled and cleaned them. All of them refuse a remote database without `--remote` and production without `--production`, run dry unless `--apply`, are idempotent, and print what they changed and what they left for Torre.

### `pnpm guides:rewards`

`scripts/backfill-guide-rewards.ts`, logic in `src/lib/guides/backfill-rewards.ts`. Run once after the `quest_guide_rewards` migration, and again after `quest_guide_reward_levels` and `pnpm data:refresh`. For each guide it fills only empty reward fields, never a field with a value:

- `readRewardsText` (`src/lib/guides/reward-text.ts`) reads Torre's text only where it has one reading: XP, kamas and «N x item» lines. A text by level, «XP repartidos» or two XP lines is not read: the guide gets DofusDB's values and is listed for review.
- `torreRewards` matches his item lines to the quest's reward items. A line that names no reward item of the quest is listed.
- For a quest with level tiers, an empty «Por nivel» is filled from his per-tier text («Si eres nivel 1 a 109: …» or «De nivel 1 a 109: …», `torreLevelRewards`) or from DofusDB's tiers, and the report says which. A tier's figures may follow the colon or sit on the lines below, as the import now writes a list item with a sub-list; text imported before that fix, with the figures glued after the colon and repeated below, still reads while the repeated figures are equal.

### `pnpm guides:rewards-dofusdb`

`scripts/prefer-dofusdb-rewards.ts`, logic in `src/lib/guides/prefer-dofusdb.ts`. Run after `pnpm guides:rewards`. A figure Torre wrote (XP, kamas, an item quantity, loose or in a «Por nivel» tier) that is within `DOFUSDB_TOLERANCE` (10 %) of DofusDB's for the same tier takes DofusDB's value (`closeEnough`): a small difference is usually a typo or a figure from before a patch. A larger difference keeps Torre's figure and is listed with its ratio, and a `0` of his stays. It never touches «Recompensas en texto». The report lists what switches, the large differences and how many guides switch per field.

### `pnpm guides:reward-typos`

`scripts/fix-reward-typos.ts`, logic in `src/lib/guides/reward-typos.ts`. It fixes item-name typos in «Recompensas en texto» («1 x Fragmento de Ugahruleta.» for «Ugahlureta»). An item line counts as a clear typo when it names no reward item of the quest but is close to exactly one: the same words, at most one edit per five letters of a word and two in all (`editDistance`, an edit distance with transpositions of neighbouring letters in `src/lib/text/edit-distance.ts`, shared with the typo group of `pnpm links:legacy`), and the same quantity. Only the name changes, to DofusDB's (or Torre's correction of the item), and the item's row is added to a non-empty `rewardItems`. Books (DofusDB type 25), notes and items the quest does not give stay as written and are listed with the reason. It prints each change as «slug: antes → después».

### `pnpm guides:shown-items`

`scripts/backfill-shown-items.ts`, logic in `src/lib/guides/shown-items.ts`. Before «Enséñale» (show) objectives were told apart from «Entrégale» (bring), the autofill summed every show into the guide's «Necesitarás» items: *El forjador de leyenda* shows the Cocobur twice and its guide stored 2. The script reads each linked quest from DofusDB, rebuilds what the old autofill wrote (`legacyQuestItems`), and rewrites only a list that still equals it; a list Torre changed is left and listed. See [DofusDB game data refresh](dofusdb-refresh.md#needs).

## Tests

- `tests/unit/guide-reward-text.test.ts`: reading Torre's rewards text and per-tier text.
- `tests/unit/guide-backfill-rewards.test.ts` and `tests/integration/backfill-guide-rewards.test.ts`: what the backfill fills and lists.
- `tests/unit/guide-prefer-dofusdb.test.ts` and `tests/integration/prefer-dofusdb-rewards.test.ts`: the tolerance and what switches.
- `tests/unit/guide-reward-typos.test.ts` and `tests/integration/fix-reward-typos.test.ts`: which lines are typos and the rewritten text.
- `tests/unit/shown-items-backfill.test.ts` and `tests/integration/backfill-shown-items.test.ts`: the old list and the rewrite.
- `tests/unit/guide-page-data.test.ts`: the header's precedence between tiers, Torre's figures, DofusDB and the text.

DofusDB fixtures for these cases live in `tests/fixtures/dofusdb/quests-level-rewards.json` and `quests-shown-items.json`.
