# Files

- [Guide body blocks](blocks.md) - The Payload blocks in src/blocks/ that make up a quest guide's body (rich text, image, video and callout), their fields and validation, how Postgres stores them, and the tests that pin them down.
- [Collections and access](collections.md) - The six Payload collections that exist today, Users for panel accounts, Media for uploads, Quests, Items and Monsters for read-only DofusDB game data and Quest guides for Torre's editorial guides with drafts, with their fields, validation, localization, access rules and the tests that pin them down.
- [Payload CMS configuration](payload-config.md) - How Payload CMS 3 is embedded in the Next.js app through src/payload.config.ts, which files Payload generates, and where to extend collections, endpoints and plugins.
