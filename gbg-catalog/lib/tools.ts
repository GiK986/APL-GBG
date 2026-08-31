import sql from 'mssql';
import { getPool } from './db';
import { PAGE_SIZE } from './constants';
import type { CategorySummary, ProductSummary } from './types';

function buildCategoryFilter(request: sql.Request, categories: string[] | undefined): string {
  if (!categories || categories.length === 0) return '';
  const conditions: string[] = [];
  categories.forEach((cat, i) => {
    const paramName = `cat${i}`;
    request.input(paramName, sql.NVarChar, cat);
    conditions.push(`@${paramName}`);
  });
  return `AND p.category_raw IN (${conditions.join(', ')})`;
}

function buildAvailabilityFilter(availableOnly: boolean | undefined): string {
  return availableOnly ? 'AND (p.stock_ath = 1 OR p.stock_the = 1)' : '';
}

export async function getToolCategories(): Promise<CategorySummary[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT p.category_raw AS category, p.category_desc_bg, COUNT(*) AS parts_count
    FROM dbo.tool_products p
    WHERE p.is_active = 1
    GROUP BY p.category_raw, p.category_desc_bg
    ORDER BY p.category_raw
  `);
  return result.recordset.map((row) => ({
    category: row.category,
    categoryDescBg: row.category_desc_bg,
    partsCount: row.parts_count,
  }));
}

export async function getToolProducts(
  page: number,
  categories?: string[],
  availableOnly?: boolean,
): Promise<{ items: ProductSummary[]; total: number }> {
  const pool = await getPool();
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const availabilityFilter = buildAvailabilityFilter(availableOnly);

  const countRequest = pool.request();
  const countCategoryFilter = buildCategoryFilter(countRequest, categories);
  const countResult = await countRequest.query(`
    SELECT COUNT(*) AS total
    FROM dbo.tool_products p
    WHERE p.is_active = 1
    ${countCategoryFilter}
    ${availabilityFilter}
  `);

  const rowsRequest = pool
    .request()
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, PAGE_SIZE);
  const rowsCategoryFilter = buildCategoryFilter(rowsRequest, categories);
  const rowsResult = await rowsRequest.query(`
    SELECT p.tool_product_id, p.barcode, p.wholesaler_article_number, p.eng_descr, p.desc_bg,
           p.category_raw, p.category_desc_bg, p.sale_price, p.stock_ath, p.stock_the
    FROM dbo.tool_products p
    WHERE p.is_active = 1
    ${rowsCategoryFilter}
    ${availabilityFilter}
    ORDER BY p.category_raw, p.barcode
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const items: ProductSummary[] = rowsResult.recordset.map((row) => ({
    productId: row.tool_product_id,
    barcode: row.barcode,
    description: row.eng_descr ?? '',
    descriptionBg: row.desc_bg,
    categoryRaw: row.category_raw,
    categoryDescBg: row.category_desc_bg,
    side: null,
    salePrice: row.sale_price,
    stockAth: Boolean(row.stock_ath),
    stockThe: Boolean(row.stock_the),
    isTool: true,
    wholesalerArticleNumber: row.wholesaler_article_number,
  }));

  return { items, total: countResult.recordset[0].total };
}
