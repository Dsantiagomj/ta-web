import * as migration_20261103_030359_initial from './20261103_030359_initial';
import * as migration_20261104_070541_quests from './20261104_070541_quests';
import * as migration_20261104_124207_quest_guides from './20261104_124207_quest_guides';
import * as migration_20261104_174941_dofusdb_items_rewards from './20261104_174941_dofusdb_items_rewards';

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
    name: '20261104_174941_dofusdb_items_rewards'
  },
];
