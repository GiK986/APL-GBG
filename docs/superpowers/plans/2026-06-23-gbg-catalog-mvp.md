# GBG Catalog MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js web app (`gbg-catalog/`) that lets a user search/browse parts from the `GBG-BODYPARTS` SQL Server database (by OE number, barcode, description, or free-text brand/model, plus a brand→model→parts browse hierarchy), see photos/stock/price, and click an "Add" button that sends the TM1 `addPartsToBasket` `postMessage` payload — laying the groundwork for a future TM1 Next Catalogue embed.

**Architecture:** Next.js 15 App Router + TypeScript, no separate API layer — Server Components read `searchParams`/`params` and run parameterized SQL directly against `GBG-BODYPARTS` via the `mssql` package. Images are served from a local NAS mirror path through a route handler. Pricing (`sale_price`) is computed and persisted in SQL, not in the app.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, `mssql` (Tedious driver), Vitest for unit tests, plain CSS (no UI framework).

## Global Constraints

- Pagination: 25 results per page everywhere (`PAGE_SIZE = 25`).
- Price markup formula: `sale_price = ROUND(cost_price * 1.98, 2)`, computed in SQL, never in the app.
- Both UI languages (`lid=32` BG, `lid=4` EN, default BG) display `products.eng_descr` for the part description — `gr_descr` is Greek, not Bulgarian, and must not be shown as the BG description.
- Stock indicator shows only a green/red dot per warehouse (`stock_ath` = Athens, `stock_the` = Thessaloniki) — never a quantity number.
- `postMessage` add-to-basket payload format is fixed (documented and reverse-engineered already): `{"addPartsToBasket":[{"wholesalerArticleNumber":"<barcode> GBG","quantity":"<string>"}]}`. `targetOrigin` comes from `NEXT_PUBLIC_TM1_ORIGIN` env var, defaulting to `'*'` for local MVP testing.
- DB connection target for this MVP: host `31.13.228.173`, port `1433`, user `sa`, database `GBG-BODYPARTS` (same server already used via `sqlcmd` in this project).
- Local photo mirror path: `/Volumes/sftpgo-storage/data/georgakopoulos/Parts` (will change on the real server later — must stay configurable via `PARTS_DIR` env var, never hardcoded in app code).
- TecDoc KType vehicle matching, TM1 iframe registration, `TECDOC_DATA` multilingual descriptions, and the category filter sidebar are explicitly out of scope for this plan (see spec section 12).
- Out of scope additions are explicitly listed in spec section 12 — do not implement them "while you're in there."

---

### Task 1: Database — sale_price markup formula

**Files:**
- Modify: `DatabaseProjectGBG-BODYPARTS/dbo/StoredProcedures/usp_sync_from_buffer.sql`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `dbo.products.sale_price` is populated for all active products and for every newly inserted product going forward. Later tasks (6, 9, 11, 12) read `sale_price` directly from `dbo.products`.

- [ ] **Step 1: Change `CREATE PROCEDURE` to `CREATE OR ALTER PROCEDURE`**

  In `DatabaseProjectGBG-BODYPARTS/dbo/StoredProcedures/usp_sync_from_buffer.sql`, change:
  ```sql
  CREATE PROCEDURE [dbo].[usp_sync_from_buffer]
  ```
  to:
  ```sql
  CREATE OR ALTER PROCEDURE [dbo].[usp_sync_from_buffer]
  ```
  (This makes the file re-runnable against the live database without a manual `DROP PROCEDURE` first.)

- [ ] **Step 2: Add the markup formula to the products MERGE insert branch**

  In the same file, find:
  ```sql
          WHEN NOT MATCHED BY TARGET THEN
              INSERT (barcode, eng_descr, gr_descr, category_raw, side,
                      cost_price, weight, first_seen, last_seen, is_active, updated_at)
              VALUES (s.barcode, s.eng_descr, s.gr_descr, s.category, s.side,
                      s.price, s.weight, @now, @now, 1, @now)
  ```
  Replace with:
  ```sql
          WHEN NOT MATCHED BY TARGET THEN
              INSERT (barcode, eng_descr, gr_descr, category_raw, side,
                      cost_price, sale_price, weight, first_seen, last_seen, is_active, updated_at)
              VALUES (s.barcode, s.eng_descr, s.gr_descr, s.category, s.side,
                      s.price, ROUND(s.price * 1.98, 2), s.weight, @now, @now, 1, @now)
  ```
  Do **not** touch the `WHEN MATCHED THEN UPDATE` branch above it — `sale_price` must stay untouched on every sync so future manual/ERP price overrides are never clobbered (this is already how the procedure treats `sale_price` today).

- [ ] **Step 3: Redeploy the updated procedure to the live database**

  ```bash
  sqlcmd -d "GBG-BODYPARTS" -i "DatabaseProjectGBG-BODYPARTS/dbo/StoredProcedures/usp_sync_from_buffer.sql"
  ```
  Expected: command completes with no error output (CREATE OR ALTER produces no rows).

- [ ] **Step 4: One-time backfill for existing products**

  ```bash
  sqlcmd query -d "GBG-BODYPARTS" -q "UPDATE dbo.products SET sale_price = ROUND(cost_price * 1.98, 2) WHERE sale_price IS NULL AND cost_price IS NOT NULL;"
  ```
  Expected output: a line like `(107149 rows affected)` or similar (matches current active product count).

- [ ] **Step 5: Verify — no NULL sale_price left, formula is correct**

  ```bash
  sqlcmd query -d "GBG-BODYPARTS" -q "SELECT COUNT(*) AS still_null FROM dbo.products WHERE is_active=1 AND cost_price IS NOT NULL AND sale_price IS NULL;"
  ```
  Expected: `still_null` = `0`.

  ```bash
  sqlcmd query -d "GBG-BODYPARTS" -q "SELECT TOP 5 barcode, cost_price, sale_price, ROUND(cost_price*1.98,2) AS expected FROM dbo.products WHERE is_active=1 ORDER BY product_id;"
  ```
  Expected: `sale_price` column equals `expected` column on every row.

- [ ] **Step 6: Verify the full sync still runs cleanly end-to-end**

  ```bash
  sqlcmd query -d "GBG-BODYPARTS" -q "EXEC dbo.usp_sync_from_buffer;"
  ```
  Expected: no error, transaction commits (this re-runs the daily sync; it is idempotent and safe per the procedure's existing design).

- [ ] **Step 7: Commit**

  ```bash
  git add "DatabaseProjectGBG-BODYPARTS/dbo/StoredProcedures/usp_sync_from_buffer.sql"
  git commit -m "feat(db): persist sale_price markup (cost_price * 1.98) on product insert"
  ```

---

### Task 2: Scaffold the Next.js app

**Files:**
- Create: `gbg-catalog/` (entire app scaffold via `create-next-app`)
- Create: `gbg-catalog/.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable Next.js project at `gbg-catalog/` with TypeScript, App Router, ESLint, no Tailwind, no `src/` directory. Later tasks add files under `gbg-catalog/app/`, `gbg-catalog/lib/`, `gbg-catalog/components/`.

- [ ] **Step 1: Scaffold the project**

  From the project root:
  ```bash
  npx create-next-app@15 gbg-catalog --typescript --app --eslint --no-tailwind --no-src-dir --import-alias "@/*"
  ```
  Answer any remaining prompts with defaults. Expected: `gbg-catalog/` directory created with `package.json`, `app/`, `public/`, `tsconfig.json`, `.gitignore`.

- [ ] **Step 2: Install the SQL Server driver and test runner**

  ```bash
  cd gbg-catalog
  npm install mssql
  npm install -D vitest @types/mssql
  ```
  Expected: `package.json` now lists `mssql` under `dependencies` and `vitest`, `@types/mssql` under `devDependencies`.

- [ ] **Step 3: Add the test script**

  In `gbg-catalog/package.json`, inside `"scripts"`, add:
  ```json
  "test": "vitest run"
  ```

- [ ] **Step 4: Add a Vitest config**

  Create `gbg-catalog/vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      environment: 'node',
    },
  });
  ```

- [ ] **Step 5: Add the env example file**

  Create `gbg-catalog/.env.example`:
  ```
  DB_HOST=31.13.228.173
  DB_PORT=1433
  DB_USER=sa
  DB_PASSWORD=Qwerty@123
  DB_NAME=GBG-BODYPARTS
  PARTS_DIR=/Volumes/sftpgo-storage/data/georgakopoulos/Parts
  NEXT_PUBLIC_TM1_ORIGIN=*
  ```
  Then create your local copy (gitignored already by `create-next-app`'s generated `.gitignore`, which includes `.env*.local`):
  ```bash
  cp .env.example .env.local
  ```

- [ ] **Step 6: Verify the dev server runs**

  ```bash
  npm run dev
  ```
  Open `http://localhost:3000` in a browser. Expected: default Next.js starter page loads with no console errors. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 7: Commit**

  ```bash
  cd ..
  git add gbg-catalog/
  git commit -m "feat(gbg-catalog): scaffold Next.js 15 app with mssql and vitest"
  ```

---

### Task 3: DB connection pool, shared types, constants

**Files:**
- Create: `gbg-catalog/lib/db.ts`
- Create: `gbg-catalog/lib/types.ts`
- Create: `gbg-catalog/lib/constants.ts`

**Interfaces:**
- Consumes: env vars `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (from Task 2's `.env.local`).
- Produces: `getPool(): Promise<sql.ConnectionPool>` from `lib/db.ts`; `PAGE_SIZE: number` from `lib/constants.ts`; types `ProductSummary`, `OemNumberRow`, `CrossRefRow`, `ApplicationRow`, `PartDetail`, `BrandSummary`, `ModelSummary` from `lib/types.ts` — used by every later `lib/*` and `app/*` task.

- [ ] **Step 1: Write `lib/constants.ts`**

  ```ts
  export const PAGE_SIZE = 25;
  ```

- [ ] **Step 2: Write `lib/types.ts`**

  ```ts
  export interface ProductSummary {
    productId: number;
    barcode: string;
    description: string;
    categoryRaw: string | null;
    salePrice: number | null;
    stockAth: boolean;
    stockThe: boolean;
  }

  export interface OemNumberRow {
    oemCode: string;
    netOemCode: string | null;
  }

  export interface CrossRefRow {
    similarCode: string;
  }

  export interface ApplicationRow {
    brandName: string;
    modelRaw: string;
    modelCode: string;
  }

  export interface PartDetail extends ProductSummary {
    oemNumbers: OemNumberRow[];
    crossRefs: CrossRefRow[];
    applications: ApplicationRow[];
  }

  export interface BrandSummary {
    brandId: number;
    nameRaw: string;
    partsCount: number;
  }

  export interface ModelSummary {
    modelCode: string;
    modelRaw: string;
    partsCount: number;
  }
  ```

- [ ] **Step 3: Write `lib/db.ts`**

  ```ts
  import sql from 'mssql';

  const config: sql.config = {
    server: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT ?? 1433),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  declare global {
    // eslint-disable-next-line no-var
    var _gbgPool: Promise<sql.ConnectionPool> | undefined;
  }

  export function getPool(): Promise<sql.ConnectionPool> {
    if (!global._gbgPool) {
      global._gbgPool = new sql.ConnectionPool(config).connect();
    }
    return global._gbgPool;
  }
  ```

  (The `global._gbgPool` cache prevents creating a new connection pool on every hot-reload in dev and on every request in production.)

- [ ] **Step 4: Verify it compiles**

  ```bash
  cd gbg-catalog
  npx tsc --noEmit
  ```
  Expected: no type errors.

- [ ] **Step 5: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/db.ts gbg-catalog/lib/types.ts gbg-catalog/lib/constants.ts
  git commit -m "feat(gbg-catalog): add DB connection pool, shared types, constants"
  ```

---

### Task 4: i18n dictionary

**Files:**
- Create: `gbg-catalog/lib/i18n.ts`
- Test: `gbg-catalog/lib/i18n.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `getDictionary(lid: string | undefined)`, `getLanguageId(lid: string | string[] | undefined): '32' | '4'`, `DEFAULT_LID` — used by every component and page from Task 7 onward.

- [ ] **Step 1: Write the failing test**

  Create `gbg-catalog/lib/i18n.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { getDictionary, getLanguageId, DEFAULT_LID } from './i18n';

  describe('getLanguageId', () => {
    it('defaults to Bulgarian (32) when lid is missing', () => {
      expect(getLanguageId(undefined)).toBe(DEFAULT_LID);
      expect(DEFAULT_LID).toBe('32');
    });

    it('returns English (4) only when lid is exactly "4"', () => {
      expect(getLanguageId('4')).toBe('4');
      expect(getLanguageId('32')).toBe('32');
      expect(getLanguageId('garbage')).toBe('32');
    });
  });

  describe('getDictionary', () => {
    it('returns Bulgarian strings by default', () => {
      expect(getDictionary(undefined).searchButton).toBe('Търси');
    });

    it('returns English strings for lid=4', () => {
      expect(getDictionary('4').searchButton).toBe('Search');
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  ```bash
  cd gbg-catalog
  npm run test -- i18n.test.ts
  ```
  Expected: FAIL — `Cannot find module './i18n'` (file doesn't exist yet).

- [ ] **Step 3: Write `lib/i18n.ts`**

  ```ts
  export type LanguageId = '32' | '4';

  export const DEFAULT_LID: LanguageId = '32';

  const DICTIONARIES = {
    '32': {
      searchPlaceholder: 'Търси по баркод, OE номер или описание...',
      searchButton: 'Търси',
      addToBasket: 'Добави',
      addedToBasket: 'Добавено',
      noResults: 'Няма намерени артикули',
      brands: 'Марки',
      models: 'Модели',
      parts: 'части',
      inStockAthens: 'Атина',
      inStockThessaloniki: 'Солун',
      oemNumbers: 'OE номера',
      similarParts: 'Сходни артикули',
      usedIn: 'Влиза в',
    },
    '4': {
      searchPlaceholder: 'Search by barcode, OE number or description...',
      searchButton: 'Search',
      addToBasket: 'Add',
      addedToBasket: 'Added',
      noResults: 'No parts found',
      brands: 'Brands',
      models: 'Models',
      parts: 'parts',
      inStockAthens: 'Athens',
      inStockThessaloniki: 'Thessaloniki',
      oemNumbers: 'OE numbers',
      similarParts: 'Similar parts',
      usedIn: 'Used in',
    },
  } as const;

  export function getDictionary(lid: string | undefined) {
    return lid === '4' ? DICTIONARIES['4'] : DICTIONARIES['32'];
  }

  export function getLanguageId(lid: string | string[] | undefined): LanguageId {
    return lid === '4' ? '4' : DEFAULT_LID;
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**

  ```bash
  npm run test -- i18n.test.ts
  ```
  Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/i18n.ts gbg-catalog/lib/i18n.test.ts
  git commit -m "feat(gbg-catalog): add bg/en UI string dictionary"
  ```

---

### Task 5: Image resolver and route handler

**Files:**
- Create: `gbg-catalog/lib/images.ts`
- Test: `gbg-catalog/lib/images.test.ts`
- Create: `gbg-catalog/app/img/[barcode]/route.ts`
- Create: `gbg-catalog/public/placeholder-part.svg`

**Interfaces:**
- Consumes: env var `PARTS_DIR`.
- Produces: `resolveImagePath(partsDir: string, barcode: string): string`, `findImagePath(barcode: string): string | null` from `lib/images.ts` — used by `ResultCard` and the part detail page (Tasks 7, 12) via the `/img/[barcode]` URL.

- [ ] **Step 1: Write the failing test**

  Create `gbg-catalog/lib/images.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { resolveImagePath } from './images';

  describe('resolveImagePath', () => {
    it('builds the path from the first 4 digits of the barcode', () => {
      expect(resolveImagePath('/parts', '010000822')).toBe('/parts/0100/010000822.jpg');
    });

    it('does not throw on barcodes shorter than 4 characters', () => {
      expect(resolveImagePath('/parts', '12')).toBe('/parts/12/12.jpg');
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  ```bash
  cd gbg-catalog
  npm run test -- images.test.ts
  ```
  Expected: FAIL — `Cannot find module './images'`.

- [ ] **Step 3: Write `lib/images.ts`**

  ```ts
  import { existsSync } from 'node:fs';
  import path from 'node:path';

  export function resolveImagePath(partsDir: string, barcode: string): string {
    const prefix = barcode.slice(0, 4);
    return path.join(partsDir, prefix, `${barcode}.jpg`);
  }

  export function findImagePath(barcode: string): string | null {
    const partsDir = process.env.PARTS_DIR;
    if (!partsDir) return null;
    const fullPath = resolveImagePath(partsDir, barcode);
    return existsSync(fullPath) ? fullPath : null;
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**

  ```bash
  npm run test -- images.test.ts
  ```
  Expected: PASS, 2 tests.

- [ ] **Step 5: Add a placeholder image**

  Create `gbg-catalog/public/placeholder-part.svg`:
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" fill="#eee"/>
    <text x="40" y="44" font-size="10" text-anchor="middle" fill="#999">No image</text>
  </svg>
  ```

- [ ] **Step 6: Write the route handler**

  Create `gbg-catalog/app/img/[barcode]/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server';
  import { createReadStream } from 'node:fs';
  import { Readable } from 'node:stream';
  import { findImagePath } from '@/lib/images';

  export const runtime = 'nodejs';

  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ barcode: string }> },
  ) {
    const { barcode } = await params;
    const filePath = findImagePath(barcode);

    if (!filePath) {
      return NextResponse.redirect(new URL('/placeholder-part.svg', request.url));
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
  ```

- [ ] **Step 7: Verify manually**

  ```bash
  npm run dev
  ```
  In a browser, open `http://localhost:3000/img/010000822` (a barcode known to have a photo, confirmed earlier in this project at `/Volumes/sftpgo-storage/data/georgakopoulos/Parts/0100/010000822.jpg`). Expected: the JPEG photo renders. Then open `http://localhost:3000/img/000000000`. Expected: redirects to the placeholder SVG. Stop the server.

- [ ] **Step 8: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/images.ts gbg-catalog/lib/images.test.ts gbg-catalog/app/img/ gbg-catalog/public/placeholder-part.svg
  git commit -m "feat(gbg-catalog): serve part photos from PARTS_DIR with placeholder fallback"
  ```

---

### Task 6: Search query builder and DB query

**Files:**
- Create: `gbg-catalog/lib/search.ts`
- Test: `gbg-catalog/lib/search.test.ts`

**Interfaces:**
- Consumes: `getPool()` from Task 3, `PAGE_SIZE` from Task 3, `ProductSummary` type from Task 3.
- Produces: `buildSearchTerm(rawQuery: string): { exact: string; like: string }`, `searchProducts(rawQuery: string, page: number): Promise<{ items: ProductSummary[]; total: number }>` — used by the search page (Task 8).

- [ ] **Step 1: Write the failing test**

  Create `gbg-catalog/lib/search.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { buildSearchTerm } from './search';

  describe('buildSearchTerm', () => {
    it('trims whitespace and wraps the term with % wildcards', () => {
      const { exact, like } = buildSearchTerm('  010000822  ');
      expect(exact).toBe('010000822');
      expect(like).toBe('%010000822%');
    });

    it('escapes LIKE wildcard characters so they match literally', () => {
      const { like } = buildSearchTerm('100%_off');
      expect(like).toBe('%100[%][_]off%');
    });

    it('escapes literal brackets too', () => {
      const { like } = buildSearchTerm('A[1]');
      expect(like).toBe('%A[[]1[]]%');
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  ```bash
  cd gbg-catalog
  npm run test -- search.test.ts
  ```
  Expected: FAIL — `Cannot find module './search'`.

- [ ] **Step 3: Write `lib/search.ts`**

  ```ts
  import sql from 'mssql';
  import { getPool } from './db';
  import { PAGE_SIZE } from './constants';
  import type { ProductSummary } from './types';

  export interface SearchTerm {
    exact: string;
    like: string;
  }

  export function buildSearchTerm(rawQuery: string): SearchTerm {
    const trimmed = rawQuery.trim();
    const escaped = trimmed.replace(/([%_[\]])/g, '[$1]');
    return { exact: trimmed, like: `%${escaped}%` };
  }

  export interface SearchResult {
    items: ProductSummary[];
    total: number;
  }

  const SEARCH_WHERE = `
    p.is_active = 1
    AND (
      p.barcode LIKE @like
      OR p.eng_descr LIKE @like
      OR p.gr_descr LIKE @like
      OR EXISTS (
        SELECT 1 FROM dbo.oem_numbers o
        WHERE o.product_id = p.product_id
          AND (o.oem_code LIKE @like OR o.net_oem_code LIKE @like)
      )
      OR EXISTS (
        SELECT 1 FROM dbo.applications a
        JOIN dbo.brands b ON b.brand_id = a.brand_id
        WHERE a.product_id = p.product_id
          AND (a.model_raw LIKE @like OR b.name_raw LIKE @like)
      )
    )
  `;

  export async function searchProducts(rawQuery: string, page: number): Promise<SearchResult> {
    const { exact, like } = buildSearchTerm(rawQuery);
    const pool = await getPool();
    const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

    const countResult = await pool
      .request()
      .input('like', sql.NVarChar, like)
      .query(`
        SELECT COUNT(DISTINCT p.product_id) AS total
        FROM dbo.products p
        WHERE ${SEARCH_WHERE}
      `);

    const rowsResult = await pool
      .request()
      .input('exact', sql.NVarChar, exact)
      .input('like', sql.NVarChar, like)
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, PAGE_SIZE)
      .query(`
        SELECT p.product_id, p.barcode, p.eng_descr, p.category_raw,
               p.sale_price, p.stock_ath, p.stock_the,
               CASE
                 WHEN p.barcode = @exact THEN 0
                 WHEN EXISTS (
                   SELECT 1 FROM dbo.oem_numbers o
                   WHERE o.product_id = p.product_id
                     AND (o.oem_code = @exact OR o.net_oem_code = @exact)
                 ) THEN 0
                 ELSE 1
               END AS rank
        FROM dbo.products p
        WHERE ${SEARCH_WHERE}
        ORDER BY rank, p.barcode
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    const items: ProductSummary[] = rowsResult.recordset.map((row) => ({
      productId: row.product_id,
      barcode: row.barcode,
      description: row.eng_descr ?? '',
      categoryRaw: row.category_raw,
      salePrice: row.sale_price,
      stockAth: Boolean(row.stock_ath),
      stockThe: Boolean(row.stock_the),
    }));

    return { items, total: countResult.recordset[0].total };
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**

  ```bash
  npm run test -- search.test.ts
  ```
  Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/search.ts gbg-catalog/lib/search.test.ts
  git commit -m "feat(gbg-catalog): add search term builder and searchProducts query"
  ```

---

### Task 7: Shared UI components

**Files:**
- Create: `gbg-catalog/components/StockIndicator.tsx`
- Create: `gbg-catalog/components/AddToBasketButton.tsx`
- Create: `gbg-catalog/components/ResultCard.tsx`
- Create: `gbg-catalog/components/Pagination.tsx`
- Create: `gbg-catalog/components/SearchBox.tsx`

**Interfaces:**
- Consumes: `getDictionary` from Task 4, `ProductSummary` from Task 3.
- Produces: `<StockIndicator>`, `<AddToBasketButton>`, `<ResultCard>`, `<Pagination>`, `<SearchBox>` — used by every page task (8, 9, 10, 11, 12).

- [ ] **Step 1: Write `components/StockIndicator.tsx`**

  ```tsx
  import { getDictionary } from '@/lib/i18n';

  export function StockIndicator({
    stockAth,
    stockThe,
    lid,
  }: {
    stockAth: boolean;
    stockThe: boolean;
    lid: string;
  }) {
    const dict = getDictionary(lid);
    return (
      <span style={{ display: 'flex', gap: 8, fontSize: 12 }}>
        <span style={{ color: stockAth ? 'green' : 'crimson' }}>● {dict.inStockAthens}</span>
        <span style={{ color: stockThe ? 'green' : 'crimson' }}>● {dict.inStockThessaloniki}</span>
      </span>
    );
  }
  ```

- [ ] **Step 2: Write `components/AddToBasketButton.tsx`**

  ```tsx
  'use client';

  import { useState } from 'react';
  import { getDictionary } from '@/lib/i18n';

  const TM1_ORIGIN = process.env.NEXT_PUBLIC_TM1_ORIGIN ?? '*';

  export function AddToBasketButton({ barcode, lid }: { barcode: string; lid: string }) {
    const dict = getDictionary(lid);
    const [added, setAdded] = useState(false);

    function handleClick() {
      const payload = JSON.stringify({
        addPartsToBasket: [{ wholesalerArticleNumber: `${barcode} GBG`, quantity: '1' }],
      });
      window.parent.postMessage(payload, TM1_ORIGIN);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }

    return (
      <button onClick={handleClick} type="button">
        {added ? dict.addedToBasket : dict.addToBasket}
      </button>
    );
  }
  ```

- [ ] **Step 3: Write `components/ResultCard.tsx`**

  ```tsx
  import Link from 'next/link';
  import type { ProductSummary } from '@/lib/types';
  import { StockIndicator } from './StockIndicator';
  import { AddToBasketButton } from './AddToBasketButton';

  export function ResultCard({ product, lid }: { product: ProductSummary; lid: string }) {
    return (
      <div style={{ display: 'flex', gap: 16, border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/img/${product.barcode}`}
          alt={product.barcode}
          width={80}
          height={80}
          style={{ objectFit: 'contain' }}
        />
        <div style={{ flex: 1 }}>
          <Link href={`/part/${product.barcode}?lid=${lid}`}>
            <strong>{product.barcode}</strong> — {product.description}
          </Link>
          <div>{product.categoryRaw}</div>
          <StockIndicator stockAth={product.stockAth} stockThe={product.stockThe} lid={lid} />
          <div>{product.salePrice != null ? `${product.salePrice.toFixed(2)} €` : '—'}</div>
        </div>
        <AddToBasketButton barcode={product.barcode} lid={lid} />
      </div>
    );
  }
  ```

- [ ] **Step 4: Write `components/Pagination.tsx`**

  ```tsx
  import Link from 'next/link';

  export function Pagination({
    page,
    total,
    pageSize,
    basePath,
    extraParams,
  }: {
    page: number;
    total: number;
    pageSize: number;
    basePath: string;
    extraParams: Record<string, string>;
  }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    function hrefFor(targetPage: number) {
      const next = new URLSearchParams(extraParams);
      next.set('page', String(targetPage));
      return `${basePath}?${next.toString()}`;
    }

    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {page > 1 && <Link href={hrefFor(page - 1)}>← Prev</Link>}
        <span>
          {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={hrefFor(page + 1)}>Next →</Link>}
      </div>
    );
  }
  ```

- [ ] **Step 5: Write `components/SearchBox.tsx`**

  ```tsx
  import { getDictionary } from '@/lib/i18n';

  export function SearchBox({ lid, initialQuery }: { lid: string; initialQuery?: string }) {
    const dict = getDictionary(lid);
    return (
      <form action="/search" method="get" style={{ display: 'flex', gap: 8 }}>
        <input type="hidden" name="lid" value={lid} />
        <input
          type="text"
          name="q"
          defaultValue={initialQuery}
          placeholder={dict.searchPlaceholder}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">{dict.searchButton}</button>
      </form>
    );
  }
  ```

- [ ] **Step 6: Verify it compiles**

  ```bash
  cd gbg-catalog
  npx tsc --noEmit
  ```
  Expected: no type errors (some components are unused until Task 8+, that's fine — `tsc` doesn't flag unused exports).

- [ ] **Step 7: Commit**

  ```bash
  cd ..
  git add gbg-catalog/components/
  git commit -m "feat(gbg-catalog): add StockIndicator, AddToBasketButton, ResultCard, Pagination, SearchBox"
  ```

---

### Task 8: Home page and search results page

**Files:**
- Create: `gbg-catalog/app/page.tsx`
- Modify: `gbg-catalog/app/layout.tsx`
- Create: `gbg-catalog/app/search/page.tsx`

**Interfaces:**
- Consumes: `searchProducts` (Task 6), `getDictionary`/`getLanguageId` (Task 4), `ResultCard`/`Pagination`/`SearchBox` (Task 7), `PAGE_SIZE` (Task 3).
- Produces: working `/` and `/search` routes.

- [ ] **Step 1: Replace `app/layout.tsx`**

  ```tsx
  export const metadata = {
    title: 'GBG Catalog',
  };

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="bg">
        <body>{children}</body>
      </html>
    );
  }
  ```

- [ ] **Step 2: Replace `app/page.tsx`**

  ```tsx
  import Link from 'next/link';
  import { SearchBox } from '@/components/SearchBox';
  import { getDictionary, getLanguageId } from '@/lib/i18n';

  export default async function HomePage({
    searchParams,
  }: {
    searchParams: Promise<{ lid?: string }>;
  }) {
    const params = await searchParams;
    const lid = getLanguageId(params.lid);
    const dict = getDictionary(lid);

    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h1>GBG Catalog</h1>
        <SearchBox lid={lid} />
        <p>
          <Link href={`/brands?lid=${lid}`}>{dict.brands}</Link>
        </p>
      </main>
    );
  }
  ```

- [ ] **Step 3: Write `app/search/page.tsx`**

  ```tsx
  import { searchProducts } from '@/lib/search';
  import { PAGE_SIZE } from '@/lib/constants';
  import { getDictionary, getLanguageId } from '@/lib/i18n';
  import { ResultCard } from '@/components/ResultCard';
  import { Pagination } from '@/components/Pagination';
  import { SearchBox } from '@/components/SearchBox';

  export default async function SearchPage({
    searchParams,
  }: {
    searchParams: Promise<{ q?: string; lid?: string; page?: string }>;
  }) {
    const params = await searchParams;
    const lid = getLanguageId(params.lid);
    const dict = getDictionary(lid);
    const query = params.q?.trim() ?? '';
    const page = Number(params.page ?? '1') || 1;

    const { items, total } = query
      ? await searchProducts(query, page)
      : { items: [], total: 0 };

    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <SearchBox lid={lid} initialQuery={query} />
        {items.length === 0 && <p>{dict.noResults}</p>}
        {items.map((item) => (
          <ResultCard key={item.productId} product={item} lid={lid} />
        ))}
        {items.length > 0 && (
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath="/search"
            extraParams={{ q: query, lid }}
          />
        )}
      </main>
    );
  }
  ```

- [ ] **Step 4: Verify manually**

  ```bash
  cd gbg-catalog
  npm run dev
  ```
  Open `http://localhost:3000`. Expected: search box and "Марки" link render. Type `010000822` and submit. Expected: redirects to `/search?q=010000822&lid=32`, shows one result card with photo, description, stock dots, price, and an "Добави" button. Try a query with no matches (e.g. `zzzzzzz`). Expected: "Няма намерени артикули" message. Stop the server.

- [ ] **Step 5: Commit**

  ```bash
  cd ..
  git add gbg-catalog/app/page.tsx gbg-catalog/app/layout.tsx gbg-catalog/app/search/
  git commit -m "feat(gbg-catalog): add home page and search results page"
  ```

---

### Task 9: Browse — brands list

**Files:**
- Create: `gbg-catalog/lib/browse.ts`
- Create: `gbg-catalog/app/brands/page.tsx`

**Interfaces:**
- Consumes: `getPool` (Task 3), `BrandSummary` type (Task 3), `getDictionary`/`getLanguageId` (Task 4).
- Produces: `getBrands(): Promise<BrandSummary[]>` from `lib/browse.ts` — also used by Tasks 10/11 in the same file. Working `/brands` route.

- [ ] **Step 1: Write `lib/browse.ts` (brands query only)**

  ```ts
  import sql from 'mssql';
  import { getPool } from './db';
  import { PAGE_SIZE } from './constants';
  import type { BrandSummary, ModelSummary, ProductSummary } from './types';

  export async function getBrands(): Promise<BrandSummary[]> {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT b.brand_id, b.name_raw, COUNT(DISTINCT a.product_id) AS parts_count
      FROM dbo.brands b
      JOIN dbo.applications a ON a.brand_id = b.brand_id
      JOIN dbo.products p ON p.product_id = a.product_id AND p.is_active = 1
      GROUP BY b.brand_id, b.name_raw
      HAVING COUNT(DISTINCT a.product_id) > 0
      ORDER BY b.name_raw
    `);
    return result.recordset.map((row) => ({
      brandId: row.brand_id,
      nameRaw: row.name_raw,
      partsCount: row.parts_count,
    }));
  }
  ```

  (`getModelsForBrand` and `getPartsForModel` are added to this same file in Tasks 10 and 11 — the `sql`, `PAGE_SIZE`, `ModelSummary`, `ProductSummary` imports above are already in place for them.)

- [ ] **Step 2: Write `app/brands/page.tsx`**

  ```tsx
  import Link from 'next/link';
  import { getBrands } from '@/lib/browse';
  import { getDictionary, getLanguageId } from '@/lib/i18n';

  export default async function BrandsPage({
    searchParams,
  }: {
    searchParams: Promise<{ lid?: string }>;
  }) {
    const params = await searchParams;
    const lid = getLanguageId(params.lid);
    const dict = getDictionary(lid);
    const brands = await getBrands();

    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h1>{dict.brands}</h1>
        <ul>
          {brands.map((brand) => (
            <li key={brand.brandId}>
              <Link href={`/brands/${encodeURIComponent(brand.nameRaw)}/models?lid=${lid}`}>
                {brand.nameRaw} ({brand.partsCount})
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  ```

- [ ] **Step 3: Verify manually**

  ```bash
  cd gbg-catalog
  npm run dev
  ```
  Open `http://localhost:3000/brands`. Expected: alphabetical list of brand names with part counts (e.g. `ISUZU (...)`). Stop the server.

- [ ] **Step 4: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/browse.ts gbg-catalog/app/brands/page.tsx
  git commit -m "feat(gbg-catalog): add brands browse list"
  ```

---

### Task 10: Browse — models for a brand

**Files:**
- Modify: `gbg-catalog/lib/browse.ts`
- Create: `gbg-catalog/app/brands/[brand]/models/page.tsx`

**Interfaces:**
- Consumes: `getModelsForBrand` (added here), `ModelSummary` type (Task 3), `getDictionary`/`getLanguageId` (Task 4).
- Produces: `getModelsForBrand(brandName: string): Promise<ModelSummary[]>` — also used by Task 11's page (link target). Working `/brands/[brand]/models` route.

- [ ] **Step 1: Add `getModelsForBrand` to `lib/browse.ts`**

  Append to `gbg-catalog/lib/browse.ts` (after `getBrands`):
  ```ts
  export async function getModelsForBrand(brandName: string): Promise<ModelSummary[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('brandName', sql.NVarChar, brandName)
      .query(`
        SELECT a.model_code, a.model_raw, COUNT(DISTINCT a.product_id) AS parts_count
        FROM dbo.applications a
        JOIN dbo.brands b ON b.brand_id = a.brand_id
        JOIN dbo.products p ON p.product_id = a.product_id AND p.is_active = 1
        WHERE b.name_raw = @brandName
        GROUP BY a.model_code, a.model_raw
        ORDER BY a.model_raw
      `);
    return result.recordset.map((row) => ({
      modelCode: row.model_code,
      modelRaw: row.model_raw,
      partsCount: row.parts_count,
    }));
  }
  ```

- [ ] **Step 2: Write `app/brands/[brand]/models/page.tsx`**

  ```tsx
  import Link from 'next/link';
  import { getModelsForBrand } from '@/lib/browse';
  import { getDictionary, getLanguageId } from '@/lib/i18n';

  export default async function ModelsPage({
    params,
    searchParams,
  }: {
    params: Promise<{ brand: string }>;
    searchParams: Promise<{ lid?: string }>;
  }) {
    const { brand } = await params;
    const sp = await searchParams;
    const lid = getLanguageId(sp.lid);
    const dict = getDictionary(lid);
    const brandName = decodeURIComponent(brand);
    const models = await getModelsForBrand(brandName);

    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h1>
          {brandName} — {dict.models}
        </h1>
        <ul>
          {models.map((model) => (
            <li key={model.modelCode}>
              <Link
                href={`/brands/${encodeURIComponent(brandName)}/models/${model.modelCode}/parts?lid=${lid}`}
              >
                {model.modelRaw} ({model.partsCount} {dict.parts})
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  ```

- [ ] **Step 3: Verify manually**

  ```bash
  cd gbg-catalog
  npm run dev
  ```
  Open `http://localhost:3000/brands`, click `ISUZU`. Expected: list of ISUZU models (e.g. `ISUZU P/U D-MAX 2012-2016 (TFR/TFS)`) each with a part count. Stop the server.

- [ ] **Step 4: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/browse.ts "gbg-catalog/app/brands/[brand]/models/page.tsx"
  git commit -m "feat(gbg-catalog): add models browse list for a brand"
  ```

---

### Task 11: Browse — parts for a model

**Files:**
- Modify: `gbg-catalog/lib/browse.ts`
- Create: `gbg-catalog/app/brands/[brand]/models/[modelCode]/parts/page.tsx`

**Interfaces:**
- Consumes: `getPartsForModel` (added here), `ResultCard`/`Pagination` (Task 7), `PAGE_SIZE` (Task 3), `getLanguageId` (Task 4).
- Produces: `getPartsForModel(brandName: string, modelCode: string, page: number): Promise<{ items: ProductSummary[]; total: number }>`. Working `/brands/[brand]/models/[modelCode]/parts` route.

- [ ] **Step 1: Add `getPartsForModel` to `lib/browse.ts`**

  Append to `gbg-catalog/lib/browse.ts`:
  ```ts
  export async function getPartsForModel(
    brandName: string,
    modelCode: string,
    page: number,
  ): Promise<{ items: ProductSummary[]; total: number }> {
    const pool = await getPool();
    const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

    const countResult = await pool
      .request()
      .input('brandName', sql.NVarChar, brandName)
      .input('modelCode', sql.NVarChar, modelCode)
      .query(`
        SELECT COUNT(DISTINCT p.product_id) AS total
        FROM dbo.products p
        JOIN dbo.applications a ON a.product_id = p.product_id
        JOIN dbo.brands b ON b.brand_id = a.brand_id
        WHERE p.is_active = 1 AND b.name_raw = @brandName AND a.model_code = @modelCode
      `);

    const rowsResult = await pool
      .request()
      .input('brandName', sql.NVarChar, brandName)
      .input('modelCode', sql.NVarChar, modelCode)
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, PAGE_SIZE)
      .query(`
        SELECT DISTINCT p.product_id, p.barcode, p.eng_descr, p.category_raw,
               p.sale_price, p.stock_ath, p.stock_the
        FROM dbo.products p
        JOIN dbo.applications a ON a.product_id = p.product_id
        JOIN dbo.brands b ON b.brand_id = a.brand_id
        WHERE p.is_active = 1 AND b.name_raw = @brandName AND a.model_code = @modelCode
        ORDER BY p.barcode
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    const items: ProductSummary[] = rowsResult.recordset.map((row) => ({
      productId: row.product_id,
      barcode: row.barcode,
      description: row.eng_descr ?? '',
      categoryRaw: row.category_raw,
      salePrice: row.sale_price,
      stockAth: Boolean(row.stock_ath),
      stockThe: Boolean(row.stock_the),
    }));

    return { items, total: countResult.recordset[0].total };
  }
  ```

- [ ] **Step 2: Write `app/brands/[brand]/models/[modelCode]/parts/page.tsx`**

  ```tsx
  import { getPartsForModel } from '@/lib/browse';
  import { PAGE_SIZE } from '@/lib/constants';
  import { getLanguageId } from '@/lib/i18n';
  import { ResultCard } from '@/components/ResultCard';
  import { Pagination } from '@/components/Pagination';

  export default async function ModelPartsPage({
    params,
    searchParams,
  }: {
    params: Promise<{ brand: string; modelCode: string }>;
    searchParams: Promise<{ lid?: string; page?: string }>;
  }) {
    const { brand, modelCode } = await params;
    const sp = await searchParams;
    const lid = getLanguageId(sp.lid);
    const brandName = decodeURIComponent(brand);
    const page = Number(sp.page ?? '1') || 1;

    const { items, total } = await getPartsForModel(brandName, modelCode, page);

    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h1>
          {brandName} — {modelCode}
        </h1>
        {items.map((item) => (
          <ResultCard key={item.productId} product={item} lid={lid} />
        ))}
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath={`/brands/${encodeURIComponent(brandName)}/models/${modelCode}/parts`}
          extraParams={{ lid }}
        />
      </main>
    );
  }
  ```

- [ ] **Step 3: Verify manually**

  ```bash
  cd gbg-catalog
  npm run dev
  ```
  Navigate `Brands → ISUZU → ISUZU P/U D-MAX 2012-2016 (TFR/TFS)`. Expected: list of ~133 parts (per the count shown one level up) rendered as result cards with photos/stock/price/Add buttons, paginated 25 at a time. Stop the server.

- [ ] **Step 4: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/browse.ts "gbg-catalog/app/brands/[brand]/models/[modelCode]/parts/page.tsx"
  git commit -m "feat(gbg-catalog): add parts browse list for a model"
  ```

---

### Task 12: Part detail page

**Files:**
- Create: `gbg-catalog/lib/part.ts`
- Create: `gbg-catalog/app/part/[barcode]/page.tsx`

**Interfaces:**
- Consumes: `getPool` (Task 3), `PartDetail` type (Task 3), `getDictionary`/`getLanguageId` (Task 4), `StockIndicator`/`AddToBasketButton` (Task 7).
- Produces: `getPartDetail(barcode: string): Promise<PartDetail | null>`. Working `/part/[barcode]` route (already linked to from `ResultCard`, Task 7).

- [ ] **Step 1: Write `lib/part.ts`**

  ```ts
  import sql from 'mssql';
  import { getPool } from './db';
  import type { PartDetail } from './types';

  export async function getPartDetail(barcode: string): Promise<PartDetail | null> {
    const pool = await getPool();

    const productResult = await pool
      .request()
      .input('barcode', sql.NVarChar, barcode)
      .query(`
        SELECT product_id, barcode, eng_descr, category_raw, sale_price, stock_ath, stock_the
        FROM dbo.products
        WHERE barcode = @barcode AND is_active = 1
      `);

    const productRow = productResult.recordset[0];
    if (!productRow) return null;

    const [oemResult, crossRefResult, applicationResult] = await Promise.all([
      pool.request().input('productId', sql.Int, productRow.product_id).query(`
        SELECT DISTINCT oem_code, net_oem_code
        FROM dbo.oem_numbers
        WHERE product_id = @productId
        ORDER BY oem_code
      `),
      pool.request().input('barcode', sql.NVarChar, barcode).query(`
        SELECT DISTINCT similar_code
        FROM dbo.cross_refs
        WHERE basic_code = @barcode
        ORDER BY similar_code
      `),
      pool.request().input('productId', sql.Int, productRow.product_id).query(`
        SELECT DISTINCT b.name_raw AS brand_name, a.model_raw, a.model_code
        FROM dbo.applications a
        JOIN dbo.brands b ON b.brand_id = a.brand_id
        WHERE a.product_id = @productId
        ORDER BY b.name_raw, a.model_raw
      `),
    ]);

    return {
      productId: productRow.product_id,
      barcode: productRow.barcode,
      description: productRow.eng_descr ?? '',
      categoryRaw: productRow.category_raw,
      salePrice: productRow.sale_price,
      stockAth: Boolean(productRow.stock_ath),
      stockThe: Boolean(productRow.stock_the),
      oemNumbers: oemResult.recordset.map((r) => ({
        oemCode: r.oem_code,
        netOemCode: r.net_oem_code,
      })),
      crossRefs: crossRefResult.recordset.map((r) => ({ similarCode: r.similar_code })),
      applications: applicationResult.recordset.map((r) => ({
        brandName: r.brand_name,
        modelRaw: r.model_raw,
        modelCode: r.model_code,
      })),
    };
  }
  ```

- [ ] **Step 2: Write `app/part/[barcode]/page.tsx`**

  ```tsx
  import Link from 'next/link';
  import { notFound } from 'next/navigation';
  import { getPartDetail } from '@/lib/part';
  import { getDictionary, getLanguageId } from '@/lib/i18n';
  import { StockIndicator } from '@/components/StockIndicator';
  import { AddToBasketButton } from '@/components/AddToBasketButton';

  export default async function PartDetailPage({
    params,
    searchParams,
  }: {
    params: Promise<{ barcode: string }>;
    searchParams: Promise<{ lid?: string }>;
  }) {
    const { barcode } = await params;
    const sp = await searchParams;
    const lid = getLanguageId(sp.lid);
    const dict = getDictionary(lid);

    const part = await getPartDetail(barcode);
    if (!part) notFound();

    return (
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/${part.barcode}`} alt={part.barcode} width={240} />
        <h1>{part.barcode}</h1>
        <p>{part.description}</p>
        <p>{part.categoryRaw}</p>
        <StockIndicator stockAth={part.stockAth} stockThe={part.stockThe} lid={lid} />
        <p>{part.salePrice != null ? `${part.salePrice.toFixed(2)} €` : '—'}</p>
        <AddToBasketButton barcode={part.barcode} lid={lid} />

        <h2>{dict.oemNumbers}</h2>
        <ul>
          {part.oemNumbers.map((oem) => (
            <li key={oem.oemCode}>{oem.oemCode}</li>
          ))}
        </ul>

        <h2>{dict.similarParts}</h2>
        <ul>
          {part.crossRefs.map((ref) => (
            <li key={ref.similarCode}>
              <Link href={`/part/${ref.similarCode}?lid=${lid}`}>{ref.similarCode}</Link>
            </li>
          ))}
        </ul>

        <h2>{dict.usedIn}</h2>
        <ul>
          {part.applications.map((app, i) => (
            <li key={i}>
              {app.brandName} — {app.modelRaw}
            </li>
          ))}
        </ul>
      </main>
    );
  }
  ```

- [ ] **Step 3: Verify manually**

  ```bash
  cd gbg-catalog
  npm run dev
  ```
  Open `http://localhost:3000/part/010000822`. Expected: photo, description, category, stock dots, price, Add button, OE numbers list, similar parts list (links), and the list of cars it fits. Then open `http://localhost:3000/part/00000000000` (non-existent barcode). Expected: Next.js 404 page. Stop the server.

- [ ] **Step 4: Commit**

  ```bash
  cd ..
  git add gbg-catalog/lib/part.ts "gbg-catalog/app/part/[barcode]/page.tsx"
  git commit -m "feat(gbg-catalog): add part detail page"
  ```

---

### Task 13: Error boundary

**Files:**
- Create: `gbg-catalog/app/error.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: app-wide error boundary for uncaught exceptions in Server Components (e.g. DB connection failures).

- [ ] **Step 1: Write `app/error.tsx`**

  ```tsx
  'use client';

  export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Грешка</h1>
        <p>Нещо се обърка при зареждане на данните. Опитай отново.</p>
        <pre style={{ color: '#888', fontSize: 12 }}>{error.message}</pre>
      </main>
    );
  }
  ```

- [ ] **Step 2: Verify manually**

  Temporarily set `DB_PASSWORD=wrong` in `.env.local`, run `npm run dev`, open `http://localhost:3000/search?q=test`. Expected: the error page renders instead of an unhandled crash. Restore the correct password in `.env.local` afterward and confirm `/search?q=010000822` works again. Stop the server.

- [ ] **Step 3: Commit**

  ```bash
  cd ..
  git add gbg-catalog/app/error.tsx
  git commit -m "feat(gbg-catalog): add app-wide error boundary"
  ```

---

### Task 14: Full manual verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full automated test suite**

  ```bash
  cd gbg-catalog
  npm run test
  ```
  Expected: all tests pass (i18n: 4, images: 2, search: 3 — 9 total).

- [ ] **Step 2: Run the type checker**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 3: Manual browser checklist**

  With `npm run dev` running, walk through and confirm each:
  - [ ] `/` shows the search box and a link to brands
  - [ ] `/search?q=<OE number>` finds the part that OE number belongs to (pick one from `dbo.oem_numbers` via `sqlcmd query -d "GBG-BODYPARTS" -q "SELECT TOP 1 oem_code, product_id FROM dbo.oem_numbers;"` and the matching barcode from `dbo.products`)
  - [ ] `/search?q=<brand name>` (e.g. `ISUZU`) returns parts fitting that brand's models
  - [ ] `/brands` → click a brand → `/models` → click a model → `/parts` shows that model's parts
  - [ ] A part with a known photo shows the real image; a part barcode with no file under `PARTS_DIR` shows the placeholder
  - [ ] Switching `?lid=4` on any page switches button/label text to English while the part description stays in English either way (per the `eng_descr`-only rule)
  - [ ] Clicking "Добави"/"Add" shows the "Добавено"/"Added" confirmation text for ~2 seconds
  - [ ] Pagination links work past page 1 on a brand/model with more than 25 parts (e.g. ISUZU D-MAX 2012-2016 from Task 11's manual check)
  - [ ] `/part/<nonexistent>` shows the Next.js 404 page

- [ ] **Step 4: Final commit**

  ```bash
  cd ..
  git add -A
  git status --short
  ```
  If anything is staged that shouldn't be committed (e.g. an accidentally tracked `.env.local`), unstage it first. Otherwise:
  ```bash
  git commit -m "chore(gbg-catalog): MVP complete — search, browse, part detail, add-to-basket button"
  ```
  (Skip this commit if there are no changes — i.e. if Task 13's commit already captured everything.)
