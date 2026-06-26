import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { findImagePath } from '@/lib/images';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await params;
  const realPath = findImagePath(barcode);

  if (!realPath) {
    const stream = Readable.toWeb(
      createReadStream(path.join(process.cwd(), 'public/placeholder-part.svg')),
    ) as ReadableStream;
    return new NextResponse(stream, { headers: { 'Content-Type': 'image/svg+xml' } });
  }

  const stream = Readable.toWeb(createReadStream(realPath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
