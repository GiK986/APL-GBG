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
