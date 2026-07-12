'use client';

import { useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { TM1_ORIGIN } from '@/lib/tm1';

export function AddToBasketButton({
  barcode,
  lid,
  inStock,
}: {
  barcode: string;
  lid: string;
  inStock: boolean;
}) {
  const dict = getDictionary(lid);
  const [added, setAdded] = useState(false);

  function handleClick() {
    const payload = JSON.stringify({
      addPartsToBasket: [{ wholesalerArticleNumber: `${barcode} GBG`, quantity: '1' }],
    });
    window.parent.postMessage(payload, TM1_ORIGIN);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (!inStock) {
    return (
      <button type="button" className="btn btn-primary btn-primary--unavailable" disabled>
        {dict.addToBasket}
      </button>
    );
  }

  return (
    <button onClick={handleClick} type="button" className="btn btn-primary" disabled={added}>
      {added ? `✓ ${dict.addedToBasket}` : dict.addToBasket}
    </button>
  );
}
