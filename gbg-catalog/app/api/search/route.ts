import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/search';
import { parsePage } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = parsePage(searchParams.get('page') ?? undefined);

  if (!query) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 });
  }

  const { items, total } = await searchProducts(query, page);
  return NextResponse.json({ items, total });
}
