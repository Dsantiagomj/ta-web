# New Torrente Arcano web: plan

Status: v2, stack confirmed (2026-11-02): Next.js + Payload CMS 3. v1 was written the same day from the conversation and the read-only inventory of torrentearcano.com in `out/`. v2 is a critical pass over v1: it keeps the stack with four corrections, adds the scope v1 hid, and fixes the progress model.

## 0. What changed from v1 and why

| Topic | v1 said | v2 says | Reason |
|---|---|---|---|
| Hosting | Vercel Pro or Railway | A long-running Node host (Railway, Fly, or a VPS with Coolify). Vercel only with its image optimization turned off | Payload on serverless has cold starts and a database connection limit; Vercel includes 5 000 source images on Pro and bills 5 USD per 1 000 beyond, and we have 19 230 |
| Images | Convert at upload | Convert offline before the import into fixed variants on R2; the app never optimizes on the fly | Cost and import time; 19 k PNG at about 695 KB each |
| Site users | Payload auth | Payload auth for the panel only; site members through Better Auth (OAuth, magic link, organizations, Stripe) | Payload has no built-in OAuth, only community plugins; progress and entitlements are app data, not content |
| Progress storage | Payload collections | Own Postgres tables through Drizzle (Payload already ships it), one global progress set per user keyed by DofusDB ids and stable step ids | Checkbox-level writes do not belong in CMS machinery; per-checklist copies caused the cross-checklist bugs we fixed today |
| Derived data | Not mentioned | A sized work item: the `.build/` pipeline (14 scripts, about 4 000 lines of Python) is replaced by relationship fields in the panel plus TypeScript derivations at publish time | This is where today's maintenance cost lives; v1 pretended it was free |
| Checklist app port | One bullet in phase 2 | Phase 2a lifts the existing React app (7 150 lines of JS/JSX, 3 400 of CSS, 11 300 of tests) as is; phase 2b redesigns | Decouples "new platform" from "new design" to cut risk |
| Migration order | Blocks in DOM order | Sort blocks by fluid-engine grid row, verified against golden pages | Squarespace positions blocks with `grid-area`; DOM order is not guaranteed to be visual order |
| Empty pages | "decide" | Confirmed empty (sampled by hand); not migrated, 301 or 410, list kept for Torre | Verified in `raw/pages` |
| Missing pieces | Search, consent, analytics, drafts and preview, backups, the fate of the GitHub Pages site, a timeline | Added | |

## 1. Goals

1. Daniel ships code changes (visuals, performance, features) without a frozen embed contract or a host page to work around.
2. Torre manages content (quests, images, texts, guides) in an editor built for it. No scraping of his pages, no daily sync script.
3. Progress moves from `localStorage` to user accounts, which opens collaboration features and a paid tier (subscription or one-time payment).
4. The look and motion take duffus.fr as the reference: its animations, transitions and overall polish, not its colors, and not a copy of the site.

## 2. Decisions taken

| Decision | Choice |
|---|---|
| Squarespace | Retired. The new web replaces torrentearcano.com on the same domain. |
| Content | Everything Torre has today is migrated: pages, texts, images. |
| Stack | **Confirmed**: Next.js + Payload CMS 3, one app, Postgres, R2, Better Auth for members (section 4). Chosen over Astro + Payload because premium content and paywalled features need per-request entitlement checks on the server, which a single app handles in one place. |
| URLs | Same flat slugs as today (`/aprendizaje-escudero`), 301 where something changes. |
| Embeds | Kept alive until the cutover, then retired along with the daily guide sync. The GitHub Pages site redirects to the new domain afterwards. |

## 3. What exists today

### torrentearcano.com (inventory, 1795 pages)

| Page type | Pages | Notes |
|---|---|---|
| Quest guide | 1272 | 1243 match a DofusDB quest by slug or title; 29 do not, 9 match several ids |
| Achievement / metalogro index | 274 | lists of quests per achievement |
| Empty stub | 165 | verified empty: header, nav and footer only. Not migrated |
| Class page | 19 | linked from `/clases-1` |
| Dofus guide | 19 | |
| Dungeon guide | 8 | title starts with "Mazmorra:" |
| Checklist / data | 7 | embed our widgets or hold the guide data the sync reads |
| Legal / utility | 7 | aviso legal, cookies, privacidad, wip, cart |
| Hub / index | 5 | home, the guides grid, nav targets |
| Inline tool | 4 | self-contained HTML/JS apps in a code block; become native components |
| Other | 13 | emotes and one-offs (`weyes-magos`, `gruente`…), reviewed by hand |

Content volume: about 436 000 words, 20 543 text blocks and 19 809 image blocks. Images: 19 230 unique, 99% PNG, median 6 per page, max 134. Average size about 695 KB per image (sample of 927), so the originals weigh roughly **13 to 14 GB (estimate)**. 36 pages embed video (YouTube, Embedly). 14 code blocks, 14 duplicate slugs with numeric suffixes (`yopuka-1`), 129 pages unreachable from the navigation.

Site-wide on every page: Google AdSense plus Flower Ads (and an AMP ad script), a Ko-fi donate widget, a Twitch "live" card fed by a Cloudflare Worker (`torrente-twitch-live.torrentearcano.workers.dev`), a copy-coordinates script, header search, scroll-to-top, the Squarespace cookie banner, an announcement bar, a newsletter popup, and a cart. The store exists but is not live (EUR). Navigation: Inicio, Clases, Misiones. Socials: YouTube, Kick, Instagram.

Raw data: `out/pages.csv`, `out/summary.json`, `out/site_features.json`, `out/quest_matches.csv`, `out/quest_unmatched.csv`, `out/oddities.csv`, `out/images_unique.txt`, `out/parsed.jsonl` (blocks per page, DOM order).

### This repo (Dofus Tools)

A Vite + React checklist app (Silvestre, Hielos, global) plus small plain-DOM widgets (hub, inicio, La eterna cosecha, guías), shipped as embeds for Squarespace and as our own GitHub Pages site.

Sizes that matter for the plan:

- Checklist app: about 7 150 lines of JS/JSX and 3 400 of CSS. Overlay, map, diary, needs panels, prerequisites, items, theme, backup, classic import.
- Tests: about 11 300 lines of Playwright and node tests across six suites.
- Build pipeline: 14 Python scripts, about 4 000 lines. They turn Torre's free text plus DofusDB into `STEP_QUESTS`, `STEP_GROUPS`, `PREREQS`, `COMPLETED_BY`, `PARENT`, stops, weights, plans, figures, zones, resources, crafts, and the hand-kept override tables (`CHOSEN_ORDER`, `MOVED`, `TEXT_FIXES`, `ALIASES`, `GENERIC_IMG`, `MANUAL`, `NOTE_MISSIONS`, `PREREQ_OF`). Every bug fixed today lived here, because the text parsing is fragile by nature.
- Progress: 19 `localStorage` keys per checklist plus `dofus-checklists:shared`. Step numbers are the keys, so progress breaks if a step is inserted or reordered.

## 4. Stack

### Recommendation

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router), TypeScript | Server rendering for SEO on 1 800 pages; Payload runs inside it; the checklist app is already React |
| CMS | Payload CMS 3 | Admin panel generated from our models, drafts, versions and live preview; content stays in our Postgres; MIT |
| Database | Postgres (Neon, with point-in-time recovery) | Content, members, progress, entitlements in one place |
| App data | Drizzle on the same Postgres (Payload ships it) | Progress tables outside the CMS collections |
| Members | Better Auth (Google, Discord, magic link; organizations and Stripe plugins) | OAuth, groups and subscriptions without building them |
| Media | Cloudflare R2 through `@payloadcms/storage-s3`, served from a Cloudflare CDN domain | No egress fees; variants generated at import, not on request |
| Hosting | Railway or Fly (one Node container), or a Hetzner VPS with Coolify if cost matters more than convenience | Long-running process: no cold starts, one DB pool, no per-image billing |
| Search | Postgres full text (`spanish` config plus `unaccent`) | One index for the site and the panel; no extra service |
| Motion | Motion (Framer Motion); React View Transitions where Next marks them stable | duffus.fr uses Framer Motion on React |
| Payments | Stripe through Better Auth's plugin, or Lemon Squeezy / Paddle as merchant of record | MoR handles EU VAT and invoices for a higher fee |
| Email | Resend or Postmark, with SPF and DKIM on the domain | Magic links and receipts must land in the inbox |
| Analytics | Plausible or self-hosted Umami | No personal data, no extra consent flow |
| Consent | None needed for ads (the new site has no ads). Session cookies are strictly necessary; cookieless analytics needs no banner. Revisit if any tracking is added | Decision 2026-11-02: ads removed |

### Alternatives weighed

| | Payload 3 in Next.js | Astro + Sanity + Better Auth | Strapi 5 | Git-based (Keystatic) |
|---|---|---|---|---|
| Editor for Torre | Good (Lexical, drafts, live preview) | Best (Portable Text, real-time) | Good | Weak for 1 800 pages |
| Content ownership | Our Postgres | Sanity's servers (exportable) | Our database | The repo |
| Site users | Not in the CMS; Better Auth beside it | Better Auth beside it | Plugin on the CMS server | Beside it |
| Pieces to run | 1 app + Postgres (+ R2) | Astro app + Sanity + Postgres (+ R2) | CMS server + app + database | App + R2 |
| Content pages JS | Needs care in Next (server components, no client code on guides) | Zero by default (islands) | Depends on the front end | Zero |
| Cost driver | Hosting | Per-seat and usage pricing (check current tiers) | Always-on CMS server | Build minutes |

Verdict (confirmed 2026-11-02): Next.js + Payload. Astro would ship lighter guide pages and has mature view transitions, and Sanity's editor is nicer for long guides. The paywall decides it: premium pages and blocks must be checked against the member's entitlement on the server on every request, so they cannot be static anyway; Payload's collection, document and field access control applies the same rule to the site and the API; and login, subscriptions, Stripe webhooks and content live in one app. Google's paywalled-content structured data needs the same server-side decision. Two guardrails:

- Phase 0 ends with a demo in which Torre edits five migrated guides in the panel. If the editor fails him, the fix is customizing Payload's admin (custom fields, blocks, views), not changing the stack.
- Guide pages are server components with no client JavaScript beyond the shell. Lighthouse CI enforces the budget, so Next cannot quietly turn into an SPA.

Watch item: Figma acquired Payload in June 2025. The license stayed MIT and the project is active (a 4.0 with a redesigned admin was reported in beta in 2026). Our exit path is cheap either way: the data is plain Postgres and the app is a standard Next.js app.

## 5. Content model (first cut)

Editorial collections (Torre edits, with drafts, versions and live preview):

- **Quest guides**: title, slug, DofusDB quest relationship (one or more), start NPC and coordinates, body as ordered blocks (rich text, image, video, callouts: tip, warning, stop), SEO fields. Prerequisites, required items and rewards are shown from DofusDB and can be overridden per guide. The original Squarespace URL is kept for traceability.
- **Achievements / metalogros**: title, slug, DofusDB achievement relationship, ordered quest guides, intro.
- **Dofus guides**: the guide pages plus the card data now hard-coded in the guías embed (tag, level, color, icon).
- **Checklists**: one per Dofus. Each step has a stable id (UUID, independent of its position), zone, effort, guide text, marks (stop, note, tip, must, done), closes/updates, and the quests and items it needs, chosen from DofusDB through relationship fields. The per-step rules that live in `.build/dofus/*.py` today (chosen order, moved items, text fixes, completed-by, generic images, manual labels) become fields on the step or on the checklist.
- **Classes, dungeons, generic pages** (home, legal), **site settings** (navigation, announcement bar, socials, ads, Twitch card, newsletter).
- **Media**: every image with alt text, credits, the variants on R2 and its original Squarespace URL.

Derived data (computed at publish time, in TypeScript, from the relationships above): step-to-quest tables, prerequisite closure, completed-by, parent quests, weights, plans, figures, resources per step, item-to-quest labels. These are exactly the outputs of today's Python pipeline, minus the text parsing that fed it. Expect this to be its own work item (section 9); it is the piece v1 left out.

Game data (imported, read-only in the panel): quests, achievements, items, monsters, NPCs, maps, subareas, recipes from DofusDB, refreshed on demand after an Ankama patch.

Member data (Better Auth plus our tables): members, sessions, organizations (groups), entitlements, progress (section 6).

## 6. Members, progress and premium

- **Anonymous by default**: the checklists keep working without an account, saving in the browser as today.
- **Sign in**: Google, Discord and email magic link through Better Auth. On the first sign-in the app offers to import the existing `localStorage` (`silvestre:*`, `hielos:*`, `global:*`, `dofus-checklists:shared`) and shows what it found before writing anything to the cloud.
- **Progress model**: one set per member, not one per checklist. Quests done and quest objectives are keyed by DofusDB quest id; owned items by item id; steps done by their stable step id, with a mapping from today's step numbers for the import. Checklists are views over that set, so finishing a quest in the Silvestre marks it everywhere by construction. The inference rules we fixed today (prerequisites implied done, completed-by) run once, server side, on the global set.
- **Sync**: each entry carries `updatedAt`; the server merges by latest timestamp; the client queues writes offline and flushes on reconnect. No real-time needed for v1.
- **Collaboration** (to prioritize): a read-only progress link; a group checklist where members tick shared steps (organizations plugin); corrections or comments on guides that Torre approves in the panel.
- **Premium** (to decide with Torre): principle first: never gate the basic guides, they bring the traffic and the ranking; gate convenience. Gated content is protected on the server (never hidden on the client) and marked with paywalled-content structured data for search. Candidates: cloud sync across devices, the planner across Dofus, group checklists, overlay and desktop extras, early access. The billing model (subscription, one-time, or both) is still open, so entitlements are modeled to support both from day one.
- **Ads**: removed. The new site ships without AdSense, Flower Ads or the AMP ad script; revenue comes from premium and Ko-fi donations, which stay. Check whether Flower Ads has a contract or notice period before the cutover.
- **Legal**: accounts and payments in the EU mean a privacy policy that covers them, consent for ad cookies, export and deletion of member data, terms of service, and VAT. A merchant of record covers the tax side.

## 7. Visual direction

- Reference: duffus.fr. Observed: a React single-page app with Framer Motion, dark by default with a light toggle, Barlow typeface, ads injected by script. Take the motion vocabulary (page transitions, staggered reveals, hover depth, smooth tab and filter changes), not its palette or layout.
- Keep Dofus Tools' identity: our tokens, the egg theme switch, real game art only, the collection cards shipped today in the guías embed.
- Motion rules: one shared set of durations and easings, `prefers-reduced-motion` everywhere, animate transform and opacity only, no layout animation on content pages.
- Budgets, enforced by Lighthouse CI on every PR: LCP under 2.5 s on mobile 4G, CLS under 0.1, JS under 150 KB compressed on guide pages, every image with explicit size and an AVIF or WebP source.

## 8. Migration (phase 1)

1. **Extract**: the inventory crawler already caches every page in `raw/pages`. Split the fluid-engine sections into blocks and order them by grid row and column, not DOM order. Verify the order on 30 golden pages chosen across types (quest with inline images, achievement list, class page, Dofus guide, a video page, a code-block page).
2. **Transform**: HTML to Payload's Lexical rich text through its converter; detect the quest structure (Prerrequisitos, Necesitarás, Recompensas, start NPC and coordinates) and turn it into fields; link quest pages to DofusDB ids (1 243 of 1 272 already match; the 29 unmatched and 9 ambiguous go to the review queue).
3. **Media**: download the 19 230 images once, dedupe by asset id, generate AVIF and WebP at three or four widths, upload originals and variants to R2, rewrite references. Keep the original URL on each media record.
4. **Load**: create documents through Payload's local API, idempotent by slug, so the whole import can be re-run at any time.
5. **Review queue**: every page with an oddity (no recognizable structure, code block, video, unmatched quest, duplicate slug, orphan) is flagged in the panel. The 165 empty stubs are not imported; they get a 301 to their achievement page when one exists, 410 otherwise, and Torre gets the list.
6. **Special pages**: the 4 inline tools and 7 checklist pages become native pages of the new app; the copy-coordinates and header-search scripts become components; the Twitch worker is reused as is; Ko-fi stays if Torre wants it.
7. **Delta and cutover** (phase 3): Torre keeps editing Squarespace until the switch. Lower the DNS TTL a week before. Re-run the import the day before, freeze Squarespace edits, verify the golden pages and the redirects, then point the domain at the new app.
8. **Redirects**: 301 for duplicate slugs and renamed pages; the GitHub Pages site (`dsantiagomj.github.io/silvestre-checklist/**`, including the embed URLs) redirects to the new domain; sitemap and canonical URLs from day one; Search Console monitored for 30 days.
9. **Retire**: keep Squarespace read-only for 30 days, then cancel it.

## 9. Phases

| Phase | Scope | Done when |
|---|---|---|
| 0. Foundations | Next.js + Payload + Postgres + R2 project, content model with drafts and live preview, design tokens and motion system, Lighthouse CI, Playwright | Torre edits five migrated guides in the panel and signs off on the editor; one guide renders end to end within budget |
| 1. Migration | Import pipeline with golden-page tests, review queue, all pages and images, derived-data engine for checklists | Every page renders on a staging domain; flagged pages listed; the Silvestre checklist's derived tables match today's generated ones |
| 2a. Public site, parity | Home, quest guides, achievements, classes, Dofus guides, search; the checklist app and La eterna cosecha lifted as React islands with the new data layer; the existing Playwright suites ported | Parity with today's site; budgets met; Torre signs off |
| 2b. Redesign | The duffus-style motion and the new layouts on top of the working site | Mockups approved, then implemented, per the current design process |
| 3. Cutover | Delta import, DNS, redirects, Search Console, Squarespace read-only | torrentearcano.com served by the new app with no SEO loss |
| 4. Members | Better Auth, cloud progress with the global model, `localStorage` import, profile | Progress follows the member across devices |
| 5. Premium and collaboration | Payments through the chosen seller, entitlements, first premium features, first collaboration feature | First paid members |

Phases 0 to 3 ship before any account work. Phase 2b can overlap with 3 and 4.

Effort, assuming one developer at part-time pace and Torre available for review (estimates, wide error bars):

| Phase | Estimate |
|---|---|
| 0 | 2 to 3 weeks |
| 1 | 4 to 6 weeks (the derived-data engine is half of it) |
| 2a | 4 to 6 weeks |
| 2b | 3 to 5 weeks |
| 3 | 1 to 2 weeks plus the 30-day watch |
| 4 | 3 to 4 weeks |
| 5 | 4 weeks for payments and entitlements; premium and collaboration features sized separately |

## 10. Rough monthly cost (estimates)

| Item | Estimate |
|---|---|
| Hosting (Railway or Fly, one container) | 10 to 25 USD; a Hetzner VPS is about 5 to 10 EUR |
| Postgres (Neon) | free tier at first, about 19 USD with branching and longer recovery |
| R2 (about 14 GB originals plus variants) | under 2 USD |
| Email | free tier at first |
| Analytics | 9 USD (Plausible) or self-hosted |
| Consent platform | free tier for one domain on most CMPs; check limits |
| Payments | per transaction (Stripe about 1.5% plus a fixed fee for EU cards; merchant of record about 5% plus a fixed fee) |

Squarespace's plan goes away, which offsets part of this.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Scope: CMS migration plus redesign plus accounts | Phases with exit criteria; 2a before 2b; accounts only after cutover |
| Derived-data engine drifts from today's behavior | Phase 1 exit criterion: generated tables for the Silvestre match the current JSON byte for byte, with the existing suites as the oracle |
| Migration fidelity on 1 800 hand-built pages | Grid-order extraction, golden pages, idempotent import, review queue, staging sign-off by Torre |
| Editor does not fit Torre | Phase 0 demo with real content; customize Payload's admin around his workflow |
| SEO loss at cutover | Same slugs, 301s, sitemap, lowered TTL, Search Console for 30 days |
| Image weight (about 14 GB of PNG) | Offline conversion, fixed variants, CDN; no on-request optimization bill |
| Payload's future under Figma | MIT kept; data in plain Postgres; a standard Next.js app; exit by export |
| Domain held inside Squarespace | Transfer it out (to Cloudflare Registrar) early in phase 0, weeks before the cutover; transfers can take days and Squarespace must not be cancelled while it holds the domain |
| Email deliverability for magic links | SPF, DKIM and DMARC on the domain before phase 4 |
| Two systems during the build | Embeds and sync keep running until cutover; no new embed work after phase 2a starts |

## 12. Decisions on the open questions (2026-11-02)

| # | Question | Decision | Consequence for the plan |
|---|---|---|---|
| 1 | Domain and DNS | Torre's, held in Squarespace | Phase 0 task: Torre unlocks the domain and transfers it to Cloudflare Registrar (DNS, R2 and CDN in one place). Squarespace is cancelled only after the transfer completes. Lower the TTL before the cutover |
| 2 | Ads | Removed | No AdSense, Flower Ads or AMP script on the new site; no ad-consent platform; premium cannot be "ad-free", so it is built on features |
| 3 | Billing model | Not decided | Entitlements support subscription and lifetime from the start; decide before phase 5 |
| 4 | Seller | To decide, probably a merchant of record or Torre | Integrate payments behind one adapter (Lemon Squeezy/Paddle or Stripe) so the choice can wait until phase 5; Torre as seller requires him to be registered for VAT in Spain |
| 5 | Ko-fi | Stays | Ko-fi widget migrated as a site setting |
| 6 | 165 empty stubs | 301 to their achievement page, 410 when there is none | Not imported; the redirect list is generated from DofusDB (quest to achievement) and handed to Torre |
| 7 | Languages | Spanish only at launch, ready for more | Payload localization enabled with `es` only; routes and slugs leave room for a locale prefix later |
| 8 | Store | Removed | Not migrated; `/cart` gets a 410 |
| 9 | Pace | 10 to 20 hours a week, no target date | Phases 0 to 3 (cutover) in roughly 2 to 4 months; members and premium after that |

## 13. Next step

Create the new repository (separate from `silvestre-checklist`, which keeps serving the embeds until the cutover), write its `AGENTS.md` and `DESIGN.md` from scratch for the new platform, then run phase 0 as an SDD change (proposal, spec, design, tasks), starting with the content model and the derived-data engine, since every later phase depends on them. The phase-0 demo validates the editor with Torre.
