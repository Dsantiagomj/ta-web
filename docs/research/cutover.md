# Cutover checklist

Date: 2026-11-23. The cutover moves torrentearcano.com from Squarespace to ta-web and is tagged `v1.0.0`. Production gets `v0.2.0` first (backlog S-28): the new code on the Railway URL, with the content production had on 2026-11-03.

Moving the DNS is the last step of the day. Everything below has to be true before it, or the public site loses content or answers 404 on URLs that work today. The blocking rows of [the backlog](backlog.md) (section 1 and the P0 rows of section 3) still apply; this page adds what the backlog does not track and puts the day in order. Plan §8.7 to §8.9 (`docs/legacy/plan.md`) has the original outline.

## What we checked on 2026-11-23

| Fact | Evidence |
|---|---|
| The domain's DNS lives at Squarespace Domains | `dig NS torrentearcano.com` answers `ns-cloud-c1..c4.googledomains.com`; Google Domains moved to Squarespace |
| `www` is the canonical host | `https://torrentearcano.com` answers 301 to `https://www.torrentearcano.com/`; `www` is a CNAME to `ext-sq.squarespace.com`, the apex has four A records to Squarespace |
| The domain has no email | `dig MX torrentearcano.com` is empty, so moving the DNS cannot break a mailbox |
| Production builds with the Railway URL | `NEXT_PUBLIC_SITE_URL=https://ta-web-production-7f45.up.railway.app` on the production `web` service |
| Production's database has the old content | Neon branch `main` (production) is 31 MB; `dev` is 302 MB and holds every import and panel edit since 2026-11-03 |
| Each environment has its own bucket | `S3_BUCKET` is `ta-media-dev` on dev and `ta-media-prod` on production |
| Stub redirects are temporary on purpose | `pnpm redirects:stubs` writes 307 until it runs with `--cutover`, which writes 301 (`scripts/redirects/build-stub-redirects.ts`) |

## Decisions to take with Torre

1. **How the content reaches production.** Two ways, and they are not equal.
   - Copy dev's database and media to production. It keeps every panel edit Torre made on dev (metalogro lists, Alineamiento prose, state changes). It also copies dev's users and anything tests left behind, so the copy needs a cleanup pass.
   - Run the imports again against production. Clean, and idempotent by slug, but it loses every panel edit that only exists on dev.
   I lean to the copy, because Torre's panel work since 2026-11-03 is the part we cannot regenerate.
2. **Where Torre edits until the cutover, and when he stops.** Today he writes on Squarespace and on the dev panel. Pick a freeze date for both; after the copy, production's panel is the only place to edit.
3. **The cutover date.** Lower the DNS TTL a week before (plan §8.7), so the week before is fixed too.
4. **Deferred sections.** Classes (S-10), dungeons (S-11) and the inline tools (B-13) render on Squarespace today. Each one is ported, or answers 410, before the cutover. Same for the pages still «En preparación» (S-05).
5. **Where the domain lives after Squarespace.** Cancelling the Squarespace site must not cancel the domain registration. Either keep the domain at Squarespace Domains on its own, or transfer it (Cloudflare, for example) before cancelling the site.

## Before the day

- Close the P0 rows of the backlog: B-01, B-04, B-07, B-08, B-14 and the P0 rows of section 3.
- Add `www.torrentearcano.com` and `torrentearcano.com` as custom domains of the production `web` service in Railway and note the DNS targets it asks for.
- Check whether Squarespace's DNS can point the apex at Railway. Railway asks for a CNAME, and an apex CNAME needs CNAME flattening or an ALIAS record. If Squarespace cannot do it, the DNS moves to a provider that can (Cloudflare does), which ties into decision 5.
- Lower the TTL of the apex and `www` records a week before.
- Rehearse the content move on a Neon branch of production, so the day only repeats a known run.
- Check Umami's website for the production domain, so page views count from the first visit.

## On the day

1. Freeze edits on Squarespace and on the dev panel.
2. Take a fresh inventory and run the delta import (`pnpm import:inventory`, `pnpm import:delta`; AGENTS.md, Delta import).
3. Snapshot production's Neon branch, then move the content (decision 1), database and media.
4. Run `pnpm redirects:stubs --cutover` so the stub redirects become 301, and regenerate the URL map against production with `pnpm urls:map --write --remote --production`; `pnpm links:legacy --remote --production` must list no link left. Both land in a PR.
5. Set `NEXT_PUBLIC_SITE_URL=https://www.torrentearcano.com` on production. `NEXT_PUBLIC_*` values go into the build, so this needs a new deploy: release `v1.0.0` from `main` with the PR above merged.
6. Check production on its Railway URL: the golden pages, a sample of old URLs from the map (301, 410 and pages that render), the sitemap and the canonical tags.
7. Point the DNS at Railway. Wait for Railway to issue the certificates for both hosts.
8. Switch the GitHub Pages redirect of `silvestre-checklist` (B-07).
9. Submit the new sitemap in Search Console.

## After the day

- Keep Squarespace live and read-only for 30 days (plan §8.9). Rolling back is pointing the DNS at Squarespace again.
- Watch Search Console for 404s and coverage drops during those 30 days, and Sentry for new errors.
- Cancel the Squarespace site after 30 days, keeping the domain (decision 5).
