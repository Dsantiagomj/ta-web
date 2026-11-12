# Files

- [Dofus guide data model](dofus-guide-data.md) - The dofus-guides collection (one guide per Dofus, with Necesitarás groups, ordered achievement and quest parts, an optional step-by-step body, video and checklist) and the dofus-guides-index global, with their access rules, shared root slugs, cache tag and migrations.
- [Dofus guide page](dofus-guide-page.md) - How /<slug> renders a published Dofus guide - the route order, what readDofusGuide loads and hides from visitors, the cached loader and draft preview, the dofusGuideView view model (counts, Necesitarás, parts, video, checklist, previous and next) and the components that draw it.
- [Dofus guides index and menu](dofus-guides-index.md) - The /guias-dofus index (Torre's intro, one card per Dofus in her order, a search and tag filter island that animates with view transitions) and how the site header's Dofus menu and search list the Dofus from the dofus-guides collection.
