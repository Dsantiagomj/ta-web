import * as migration_20261103_030359_initial from './20261103_030359_initial';
import * as migration_20261104_070541_quests from './20261104_070541_quests';
import * as migration_20261104_124207_quest_guides from './20261104_124207_quest_guides';
import * as migration_20261104_174941_dofusdb_items_rewards from './20261104_174941_dofusdb_items_rewards';
import * as migration_20261104_192809_dofusdb_item_supertype from './20261104_192809_dofusdb_item_supertype';
import * as migration_20261104_195910_needs_list from './20261104_195910_needs_list';
import * as migration_20261104_210644_guide_single_quest from './20261104_210644_guide_single_quest';
import * as migration_20261105_103713_media_image_sizes from './20261105_103713_media_image_sizes';

export const migrations = [
  {
    up: migration_20261103_030359_initial.up,
    down: migration_20261103_030359_initial.down,
    name: '20261103_030359_initial',
  },
  {
    up: migration_20261104_070541_quests.up,
    down: migration_20261104_070541_quests.down,
    name: '20261104_070541_quests',
  },
  {
    up: migration_20261104_124207_quest_guides.up,
    down: migration_20261104_124207_quest_guides.down,
    name: '20261104_124207_quest_guides',
  },
  {
    up: migration_20261104_174941_dofusdb_items_rewards.up,
    down: migration_20261104_174941_dofusdb_items_rewards.down,
    name: '20261104_174941_dofusdb_items_rewards',
  },
  {
    up: migration_20261104_192809_dofusdb_item_supertype.up,
    down: migration_20261104_192809_dofusdb_item_supertype.down,
    name: '20261104_192809_dofusdb_item_supertype',
  },
  {
    up: migration_20261104_195910_needs_list.up,
    down: migration_20261104_195910_needs_list.down,
    name: '20261104_195910_needs_list',
  },
  {
    up: migration_20261104_210644_guide_single_quest.up,
    down: migration_20261104_210644_guide_single_quest.down,
    name: '20261104_210644_guide_single_quest',
  },
  {
    up: migration_20261105_103713_media_image_sizes.up,
    down: migration_20261105_103713_media_image_sizes.down,
    name: '20261105_103713_media_image_sizes'
  },
];
