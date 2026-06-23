# gbg-catalog

Local web catalog for `GBG-BODYPARTS` parts: search, brand → model → parts browse, and part
detail pages. This is an internal MVP tool, currently local-only. The eventual goal is to embed
this as a TM1 Next Catalogue module (see the postMessage protocol note below); for now it just
runs as a standalone Next.js app against the live `GBG-BODYPARTS` database.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` already contains real, working DB credentials for this internal tool. Once copied
to `.env.local`, that file must stay gitignored (it already is — see `.gitignore`) and should
never be committed.

## Requires a live database + photo mirror

This app needs network access to the `GBG-BODYPARTS` SQL Server, configured via `DB_HOST`,
`DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env.local`. There is no offline/mock mode —
pages that hit the DB will fail without connectivity.

It also needs a local mirror of part photos at the path set by `PARTS_DIR` in `.env.local`
(currently an SFTP-mounted volume). Part images are resolved from that directory by barcode.

## Language (`lid` query param)

The `lid` query param controls UI language: `32` = Bulgarian (default), `4` = English. Both
language modes currently show `products.eng_descr` for the part description — `gr_descr`
(Greek) is not used anywhere yet.

## "Add to basket" — TM1 Next Catalogue protocol

The "Add" button on each part sends a `postMessage` payload matching the TM1 Next Catalogue
`addPartsToBasket` protocol, so this app can eventually run embedded as a Next Catalogue module.
See [`../NEXT_CATALOGUE_POSTMESSAGE_BASKET.md`](../NEXT_CATALOGUE_POSTMESSAGE_BASKET.md) for the
full reverse-engineered protocol documentation.

`targetOrigin` for the `postMessage` call is controlled by `NEXT_PUBLIC_TM1_ORIGIN` and defaults
to `*` for local testing.

## One-time DB migration (only if pointing at a fresh `GBG-BODYPARTS` copy)

If you're setting this up against a fresh copy of `GBG-BODYPARTS` rather than the live database
this app currently points at, you'll need to apply the `sale_price` backfill and the
`usp_sync_from_buffer` procedure update described in
[`../docs/superpowers/plans/2026-06-23-gbg-catalog-mvp.md`](../docs/superpowers/plans/2026-06-23-gbg-catalog-mvp.md),
Task 1. This has already been applied to the live database this app currently points at, so it's
only relevant when pointing at a different or fresh database.

## Tests / type-check

```bash
npm run test        # vitest
npx tsc --noEmit     # type-check
```
