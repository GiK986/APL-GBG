import { NextRequest, NextResponse } from 'next/server';
import { getPartDetail } from '@/lib/part';

export async function GET(request: NextRequest, { params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await params;
  const part = await getPartDetail(barcode);

  if (!part) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(part);
}
