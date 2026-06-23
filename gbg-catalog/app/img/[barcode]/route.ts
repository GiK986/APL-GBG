import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { findImagePath } from '@/lib/images';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await params;
  const filePath = findImagePath(barcode);

  if (!filePath) {
    return NextResponse.redirect(new URL('/placeholder-part.svg', request.url));
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
