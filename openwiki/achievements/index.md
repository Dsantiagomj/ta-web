# Files

- [Achievement data model](achievement-data.md) - The four achievement collections (DofusDB achievements and categories, Torre's achievement pages and metalogros), the root slug space they share with quest guides and Dofus guides, how empty fields fill from DofusDB, the panel notes, and how the DofusDB refresh creates missing pages.
- [Achievement page](achievement-page.md) - How the shared /<slug> route renders a published achievement page, what it loads and caches, how the view model builds the header, quest cards, metalogro column and breadcrumb, and how a guide shows its achievement in its breadcrumb and "Misión N de M".
- [Metalogros index](metalogros-index.md) - The /metalogros page that lists Torre's metalogros in three groups with their achievement pages and guides, how its view is computed and cached, and its one client island for the tile panel and the lazily loaded search.
