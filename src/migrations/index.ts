import * as migration_20261103_030359_initial from './20261103_030359_initial';
import * as migration_20261104_070541_quests from './20261104_070541_quests';
import * as migration_20261104_124207_quest_guides from './20261104_124207_quest_guides';
import * as migration_20261104_174941_dofusdb_items_rewards from './20261104_174941_dofusdb_items_rewards';
import * as migration_20261104_192809_dofusdb_item_supertype from './20261104_192809_dofusdb_item_supertype';
import * as migration_20261104_195910_needs_list from './20261104_195910_needs_list';
import * as migration_20261104_210644_guide_single_quest from './20261104_210644_guide_single_quest';
import * as migration_20261105_103713_media_image_sizes from './20261105_103713_media_image_sizes';
import * as migration_20261105_135506_guide_step_block from './20261105_135506_guide_step_block';
import * as migration_20261106_010549_guide_v4_quest_npcs from './20261106_010549_guide_v4_quest_npcs';
import * as migration_20261107_020402_guide_v5_game_images_fight from './20261107_020402_guide_v5_game_images_fight';
import * as migration_20261107_143215_remove_step_title from './20261107_143215_remove_step_title';
import * as migration_20261107_210926_achievements_game_data from './20261107_210926_achievements_game_data';
import * as migration_20261107_214742_achievement_pages_groups from './20261107_214742_achievement_pages_groups';
import * as migration_20261110_000232_dofus_guides from './20261110_000232_dofus_guides';
import * as migration_20261110_052805_dofus_guides_import from './20261110_052805_dofus_guides_import';
import * as migration_20261110_131101_dofus_guides_index from './20261110_131101_dofus_guides_index';
import * as migration_20261113_011531_quest_stages from './20261113_011531_quest_stages';
import * as migration_20261113_151549_checklists from './20261113_151549_checklists';
import * as migration_20261113_160051_checklist_needs from './20261113_160051_checklist_needs';
import * as migration_20261113_174951_subareas from './20261113_174951_subareas';
import * as migration_20261113_175047_checklist_step_zone from './20261113_175047_checklist_step_zone';
import * as migration_20261113_183838_dungeons from './20261113_183838_dungeons';
import * as migration_20261113_232007_achievement_prose_snapshot from './20261113_232007_achievement_prose_snapshot';
import * as migration_20261113_232009_quest_guide_dungeon_picks from './20261113_232009_quest_guide_dungeon_picks';
import * as migration_20261114_000512_checklist_owned_moves from './20261114_000512_checklist_owned_moves';
import * as migration_20261114_003108_users_name from './20261114_003108_users_name';
import * as migration_20261114_011851_users_roles from './20261114_011851_users_roles';
import * as migration_20261114_022136_checklist_silvestre from './20261114_022136_checklist_silvestre';
import * as migration_20261114_022458_checklist_hielos from './20261114_022458_checklist_hielos';
import * as migration_20261114_122659_checklist_ocre from './20261114_122659_checklist_ocre';
import * as migration_20261114_142119_checklist_cards from './20261114_142119_checklist_cards';

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
    name: '20261105_103713_media_image_sizes',
  },
  {
    up: migration_20261105_135506_guide_step_block.up,
    down: migration_20261105_135506_guide_step_block.down,
    name: '20261105_135506_guide_step_block',
  },
  {
    up: migration_20261106_010549_guide_v4_quest_npcs.up,
    down: migration_20261106_010549_guide_v4_quest_npcs.down,
    name: '20261106_010549_guide_v4_quest_npcs',
  },
  {
    up: migration_20261107_020402_guide_v5_game_images_fight.up,
    down: migration_20261107_020402_guide_v5_game_images_fight.down,
    name: '20261107_020402_guide_v5_game_images_fight',
  },
  {
    up: migration_20261107_143215_remove_step_title.up,
    down: migration_20261107_143215_remove_step_title.down,
    name: '20261107_143215_remove_step_title',
  },
  {
    up: migration_20261107_210926_achievements_game_data.up,
    down: migration_20261107_210926_achievements_game_data.down,
    name: '20261107_210926_achievements_game_data',
  },
  {
    up: migration_20261107_214742_achievement_pages_groups.up,
    down: migration_20261107_214742_achievement_pages_groups.down,
    name: '20261107_214742_achievement_pages_groups',
  },
  {
    up: migration_20261110_000232_dofus_guides.up,
    down: migration_20261110_000232_dofus_guides.down,
    name: '20261110_000232_dofus_guides',
  },
  {
    up: migration_20261110_052805_dofus_guides_import.up,
    down: migration_20261110_052805_dofus_guides_import.down,
    name: '20261110_052805_dofus_guides_import',
  },
  {
    up: migration_20261110_131101_dofus_guides_index.up,
    down: migration_20261110_131101_dofus_guides_index.down,
    name: '20261110_131101_dofus_guides_index',
  },
  {
    up: migration_20261113_011531_quest_stages.up,
    down: migration_20261113_011531_quest_stages.down,
    name: '20261113_011531_quest_stages',
  },
  {
    up: migration_20261113_151549_checklists.up,
    down: migration_20261113_151549_checklists.down,
    name: '20261113_151549_checklists',
  },
  {
    up: migration_20261113_160051_checklist_needs.up,
    down: migration_20261113_160051_checklist_needs.down,
    name: '20261113_160051_checklist_needs',
  },
  {
    up: migration_20261113_174951_subareas.up,
    down: migration_20261113_174951_subareas.down,
    name: '20261113_174951_subareas',
  },
  {
    up: migration_20261113_175047_checklist_step_zone.up,
    down: migration_20261113_175047_checklist_step_zone.down,
    name: '20261113_175047_checklist_step_zone',
  },
  {
    up: migration_20261113_183838_dungeons.up,
    down: migration_20261113_183838_dungeons.down,
    name: '20261113_183838_dungeons',
  },
  {
    up: migration_20261113_232007_achievement_prose_snapshot.up,
    down: migration_20261113_232007_achievement_prose_snapshot.down,
    name: '20261113_232007_achievement_prose_snapshot',
  },
  {
    up: migration_20261113_232009_quest_guide_dungeon_picks.up,
    down: migration_20261113_232009_quest_guide_dungeon_picks.down,
    name: '20261113_232009_quest_guide_dungeon_picks',
  },
  {
    up: migration_20261114_000512_checklist_owned_moves.up,
    down: migration_20261114_000512_checklist_owned_moves.down,
    name: '20261114_000512_checklist_owned_moves',
  },
  {
    up: migration_20261114_003108_users_name.up,
    down: migration_20261114_003108_users_name.down,
    name: '20261114_003108_users_name',
  },
  {
    up: migration_20261114_011851_users_roles.up,
    down: migration_20261114_011851_users_roles.down,
    name: '20261114_011851_users_roles',
  },
  {
    up: migration_20261114_022136_checklist_silvestre.up,
    down: migration_20261114_022136_checklist_silvestre.down,
    name: '20261114_022136_checklist_silvestre',
  },
  {
    up: migration_20261114_022458_checklist_hielos.up,
    down: migration_20261114_022458_checklist_hielos.down,
    name: '20261114_022458_checklist_hielos',
  },
  {
    up: migration_20261114_122659_checklist_ocre.up,
    down: migration_20261114_122659_checklist_ocre.down,
    name: '20261114_122659_checklist_ocre',
  },
  {
    up: migration_20261114_142119_checklist_cards.up,
    down: migration_20261114_142119_checklist_cards.down,
    name: '20261114_142119_checklist_cards'
  },
];
