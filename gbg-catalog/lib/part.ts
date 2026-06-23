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
