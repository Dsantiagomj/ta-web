# Files

- [Database and migrations](database.md) - How the app picks its Postgres connection (pooled, direct or the embedded dev database), when Payload pushes the schema versus applying committed migrations, and how to change the schema safely.
- [DofusDB game data refresh](dofusdb-refresh.md) - How pnpm data:quests fills the read-only quests collection from the public DofusDB API, how quests and their prerequisites are mapped, why a rerun changes nothing, and how to run it without touching production by accident.
