import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { findModelImagePath } from '@/lib/images';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelCode: string }> },
) {
  const { modelCode } = await params;
  const realPath = findModelImagePath(modelCode);

  if (!realPath) {
    const stream = Readable.toWeb(
      createReadStream(path.join(process.cwd(), 'public/placeholder-model.svg')),
    ) as ReadableStream;
    return new NextResponse(stream, { headers: { 'Content-Type': 'image/svg+xml' } });
  }

  const stream = Readable.toWeb(createReadStream(realPath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': realPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
