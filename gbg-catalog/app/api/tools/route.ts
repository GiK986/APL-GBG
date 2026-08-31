import { NextRequest, NextResponse } from 'next/server';
import { getToolProducts } from '@/lib/tools';
import { parsePage } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get('page') ?? undefined);
  const categoriesParam = searchParams.get('categories');
  const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : undefined;
  const availableOnly = searchParams.get('available') === '1';

  const { items, total } = await getToolProducts(page, categories, availableOnly);
  return NextResponse.json({ items, total });
}
