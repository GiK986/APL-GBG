# gbg-catalog

Local web catalog for `GBG-BODYPARTS` parts: search, brand → model → parts browse, and part
detail pages. Internal MVP, runs against the live `GBG-BODYPARTS` database.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` already has working DB credentials for this internal tool. `.env.local` must stay
gitignored — never commit it.

## Requirements

- Network access to the `GBG-BODYPARTS` SQL Server (`DB_HOST`, `DB_PORT`, `DB_USER`,
  `DB_PASSWORD`, `DB_NAME` in `.env.local`). No offline/mock mode.
- A local mirror of part photos at the path set by `PARTS_DIR` (resolved by barcode).

## Language

`lid` query param: `32` = Bulgarian (default), `4` = English.

## More

- "Add to basket" sends a TM1 Next Catalogue `postMessage` — see
  [`../docs/NEXT_CATALOGUE_POSTMESSAGE_BASKET.md`](../docs/NEXT_CATALOGUE_POSTMESSAGE_BASKET.md).
- One-time DB migration notes (only for a fresh `GBG-BODYPARTS` copy) — see
  [`../docs/superpowers/plans/2026-06-23-gbg-catalog-mvp.md`](../docs/superpowers/plans/2026-06-23-gbg-catalog-mvp.md),
  Task 1.

## Tests / type-check

```bash
npm run test
npx tsc --noEmit
```
