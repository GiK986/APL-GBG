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
      JOIN dbo.models m ON m.model_id = a.model_id
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      WHERE a.product_id = p.product_id
        AND (m.model_raw LIKE @like OR b.name_raw LIKE @like)
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
      SELECT p.product_id, p.barcode, p.eng_descr, p.category_raw, p.side,
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
      ORDER BY rank, CASE WHEN p.category_raw IS NULL THEN 1 ELSE 0 END, p.category_raw, p.barcode
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

  const items: ProductSummary[] = rowsResult.recordset.map((row) => ({
    productId: row.product_id,
    barcode: row.barcode,
    description: row.eng_descr ?? '',
    categoryRaw: row.category_raw,
    side: row.side?.trim() ?? null,
    salePrice: row.sale_price,
    stockAth: Boolean(row.stock_ath),
    stockThe: Boolean(row.stock_the),
  }));

  return { items, total: countResult.recordset[0].total };
}
