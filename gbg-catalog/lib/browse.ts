import sql from 'mssql';
import { getPool } from './db';
import { PAGE_SIZE, UNCATEGORIZED_KEY } from './constants';
import type {
  BrandSummary,
  CategorySummary,
  ModelCardSummary,
  ModelDetail,
  ModelGroupSummary,
  ProductSummary,
} from './types';

function buildCategoryFilter(request: sql.Request, categories: string[] | undefined): string {
  if (!categories || categories.length === 0) return '';
  const real = categories.filter((c) => c !== UNCATEGORIZED_KEY);
  const includesUncategorized = categories.includes(UNCATEGORIZED_KEY);

  const conditions: string[] = [];
  real.forEach((cat, i) => {
    const paramName = `cat${i}`;
    request.input(paramName, sql.NVarChar, cat);
    conditions.push(`@${paramName}`);
  });

  const parts: string[] = [];
  if (conditions.length > 0) parts.push(`p.category_raw IN (${conditions.join(', ')})`);
  if (includesUncategorized) parts.push('p.category_raw IS NULL');
  return parts.length > 0 ? `AND (${parts.join(' OR ')})` : '';
}

function buildAvailabilityFilter(availableOnly: boolean | undefined): string {
  return availableOnly ? 'AND (p.stock_ath = 1 OR p.stock_the = 1)' : '';
}

export function brandLogoSlug(nameRaw: string): string {
  return nameRaw
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/&/g, '_')
    .replace(/\s+/g, '_');
}

export function formatYearRange(from: number | null, to: number | null): string {
  if (from === null) return '';
  return `${from}-${to ?? ''}`;
}

export async function getBrands(): Promise<BrandSummary[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT b.brand_id, b.name_raw, COUNT(DISTINCT a.product_id) AS parts_count
    FROM dbo.brands b
    JOIN dbo.models m ON m.brand_id = b.brand_id
    JOIN dbo.applications a ON a.model_id = m.model_id
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

export async function getModelGroupsForBrand(brandName: string): Promise<ModelGroupSummary[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('brandName', sql.NVarChar, brandName)
    .query(`
      SELECT m.model_group, COUNT(DISTINCT a.product_id) AS parts_count
      FROM dbo.models m
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      JOIN dbo.applications a ON a.model_id = m.model_id
      JOIN dbo.products p ON p.product_id = a.product_id AND p.is_active = 1
      WHERE b.name_raw = @brandName
      GROUP BY m.model_group
      HAVING COUNT(DISTINCT a.product_id) > 0
      ORDER BY m.model_group
    `);
  return result.recordset.map((row) => ({
    modelGroup: row.model_group,
    partsCount: row.parts_count,
  }));
}

export async function getModelsForGroup(
  brandName: string,
  modelGroup: string,
): Promise<ModelCardSummary[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('brandName', sql.NVarChar, brandName)
    .input('modelGroup', sql.NVarChar, modelGroup)
    .query(`
      SELECT m.model_code, m.model_name, m.constr_year_from, m.constr_year_to,
             COUNT(DISTINCT a.product_id) AS parts_count
      FROM dbo.models m
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      JOIN dbo.applications a ON a.model_id = m.model_id
      JOIN dbo.products p ON p.product_id = a.product_id AND p.is_active = 1
      WHERE b.name_raw = @brandName AND m.model_group = @modelGroup
      GROUP BY m.model_code, m.model_name, m.constr_year_from, m.constr_year_to
      HAVING COUNT(DISTINCT a.product_id) > 0
      ORDER BY m.constr_year_from, m.model_name
    `);
  return result.recordset.map((row) => ({
    modelCode: row.model_code,
    modelName: row.model_name,
    constrYearFrom: row.constr_year_from,
    constrYearTo: row.constr_year_to,
    partsCount: row.parts_count,
  }));
}

export async function getModelDetails(
  brandName: string,
  modelCode: string,
): Promise<ModelDetail | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('brandName', sql.NVarChar, brandName)
    .input('modelCode', sql.NVarChar, modelCode)
    .query(`
      SELECT m.model_group, m.model_name, m.constr_year_from, m.constr_year_to
      FROM dbo.models m
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      WHERE b.name_raw = @brandName AND m.model_code = @modelCode
    `);
  const row = result.recordset[0];
  if (!row) return null;
  return {
    modelGroup: row.model_group,
    modelName: row.model_name,
    constrYearFrom: row.constr_year_from,
    constrYearTo: row.constr_year_to,
  };
}

export async function getCategoriesForModel(
  brandName: string,
  modelCode: string,
  availableOnly?: boolean,
): Promise<CategorySummary[]> {
  const pool = await getPool();
  const availabilityFilter = buildAvailabilityFilter(availableOnly);
  const result = await pool
    .request()
    .input('brandName', sql.NVarChar, brandName)
    .input('modelCode', sql.NVarChar, modelCode)
    .query(`
      SELECT COALESCE(p.category_raw, N'${UNCATEGORIZED_KEY}') AS category,
             cat.category_desc_bg,
             COUNT(DISTINCT p.product_id) AS parts_count
      FROM dbo.products p
      JOIN dbo.applications a ON a.product_id = p.product_id
      JOIN dbo.models m ON m.model_id = a.model_id
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      LEFT JOIN dbo.categories cat ON cat.category_raw = p.category_raw
      WHERE p.is_active = 1 AND b.name_raw = @brandName AND m.model_code = @modelCode
      ${availabilityFilter}
      GROUP BY COALESCE(p.category_raw, N'${UNCATEGORIZED_KEY}'), cat.category_desc_bg
      ORDER BY category
    `);
  return result.recordset.map((row) => ({
    category: row.category,
    categoryDescBg: row.category_desc_bg,
    partsCount: row.parts_count,
  }));
}

export async function getPartsForModel(
  brandName: string,
  modelCode: string,
  page: number,
  categories?: string[],
  availableOnly?: boolean,
): Promise<{ items: ProductSummary[]; total: number }> {
  const pool = await getPool();
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const availabilityFilter = buildAvailabilityFilter(availableOnly);

  const countRequest = pool
    .request()
    .input('brandName', sql.NVarChar, brandName)
    .input('modelCode', sql.NVarChar, modelCode);
  const countCategoryFilter = buildCategoryFilter(countRequest, categories);
  const countResult = await countRequest.query(`
      SELECT COUNT(DISTINCT p.product_id) AS total
      FROM dbo.products p
      JOIN dbo.applications a ON a.product_id = p.product_id
      JOIN dbo.models m ON m.model_id = a.model_id
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      WHERE p.is_active = 1 AND b.name_raw = @brandName AND m.model_code = @modelCode
      ${countCategoryFilter}
      ${availabilityFilter}
    `);

  const rowsRequest = pool
    .request()
    .input('brandName', sql.NVarChar, brandName)
    .input('modelCode', sql.NVarChar, modelCode)
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, PAGE_SIZE);
  const rowsCategoryFilter = buildCategoryFilter(rowsRequest, categories);
  const rowsResult = await rowsRequest.query(`
      SELECT DISTINCT p.product_id, p.barcode, p.eng_descr, d.desc_bg, p.category_raw, cat.category_desc_bg, p.side,
             p.sale_price, p.stock_ath, p.stock_the,
             CASE WHEN p.category_raw IS NULL THEN 1 ELSE 0 END AS category_sort
      FROM dbo.products p
      JOIN dbo.applications a ON a.product_id = p.product_id
      JOIN dbo.models m ON m.model_id = a.model_id
      JOIN dbo.brands b ON b.brand_id = m.brand_id
      LEFT JOIN dbo.categories cat ON cat.category_raw = p.category_raw
      LEFT JOIN dbo.descriptions d ON d.eng_descr = p.eng_descr
      WHERE p.is_active = 1 AND b.name_raw = @brandName AND m.model_code = @modelCode
      ${rowsCategoryFilter}
      ${availabilityFilter}
      ORDER BY category_sort, p.category_raw, p.barcode
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

  const items: ProductSummary[] = rowsResult.recordset.map((row) => ({
    productId: row.product_id,
    barcode: row.barcode,
    description: row.eng_descr ?? '',
    descriptionBg: row.desc_bg,
    categoryRaw: row.category_raw,
    categoryDescBg: row.category_desc_bg,
    side: row.side?.trim() ?? null,
    salePrice: row.sale_price,
    stockAth: Boolean(row.stock_ath),
    stockThe: Boolean(row.stock_the),
  }));

  return { items, total: countResult.recordset[0].total };
}
