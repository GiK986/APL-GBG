import { NextRequest, NextResponse } from 'next/server';
import { getPartsForModel } from '@/lib/browse';
import { parsePage } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');
  const modelCode = searchParams.get('modelCode');
  const page = parsePage(searchParams.get('page') ?? undefined);
  const categoriesParam = searchParams.get('categories');
  const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : undefined;
  const availableOnly = searchParams.get('available') === '1';

  if (!brand || !modelCode) {
    return NextResponse.json({ error: 'Missing brand or modelCode' }, { status: 400 });
  }

  const { items, total } = await getPartsForModel(brand, modelCode, page, categories, availableOnly);
  return NextResponse.json({ items, total });
}
