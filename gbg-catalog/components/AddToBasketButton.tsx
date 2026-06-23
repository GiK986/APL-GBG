'use client';

import { useState } from 'react';
import { getDictionary } from '@/lib/i18n';

const TM1_ORIGIN = process.env.NEXT_PUBLIC_TM1_ORIGIN ?? '*';

export function AddToBasketButton({ barcode, lid }: { barcode: string; lid: string }) {
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

  return (
    <button onClick={handleClick} type="button">
      {added ? dict.addedToBasket : dict.addToBasket}
    </button>
  );
}
