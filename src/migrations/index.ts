import * as migration_20261103_030359_initial from './20261103_030359_initial';

export const migrations = [
  {
    up: migration_20261103_030359_initial.up,
    down: migration_20261103_030359_initial.down,
    name: '20261103_030359_initial'
  },
];
