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
