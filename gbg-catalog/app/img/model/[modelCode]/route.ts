import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { findModelImagePath } from '@/lib/images';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelCode: string }> },
) {
  const { modelCode } = await params;
  const filePath = findModelImagePath(modelCode);

  if (!filePath) {
    return NextResponse.redirect(new URL('/placeholder-model.svg', request.url));
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
