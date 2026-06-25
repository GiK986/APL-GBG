'use client';

import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';

export function PartThumbnail({ barcode }: { barcode: string }) {
  const [open, setOpen] = useState(false);
  const src = `/img/${barcode}`;

  return (
    <div className="part-thumbnail">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={barcode}
        width={64}
        height={64}
        className="result-card__image"
        onClick={() => setOpen(true)}
      />
      {open && <ImageLightbox src={src} alt={barcode} onClose={() => setOpen(false)} />}
    </div>
  );
}
