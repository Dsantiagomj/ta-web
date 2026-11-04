# Files

- [Database and migrations](database.md) - How the app picks its Postgres connection (pooled, direct or the embedded dev database), when Payload pushes the schema versus applying committed migrations, and how to change the schema safely.
- [DofusDB game data refresh](dofusdb-refresh.md) - How pnpm data:quests fills the read-only quests, items and monsters collections from the public DofusDB API, how quests, prerequisites, level-200 rewards and needs are derived, why a rerun changes nothing, how writes run several at a time under DOFUSDB_WRITE_CONCURRENCY, and how to run it without touching production by accident.
- [Squarespace import](squarespace-import.md) - How the Squarespace import reads a cached Squarespace page, orders its blocks, and turns it into a quest guide draft (summary, start NPC, body blocks, oddities), how prose becomes Payload's Lexical rich text, and how pnpm import:guides loads the guides and their images into Payload as drafts.
