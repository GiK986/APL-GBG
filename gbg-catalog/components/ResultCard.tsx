import Link from 'next/link';
import type { ProductSummary } from '@/lib/types';
import { StockIndicator } from './StockIndicator';
import { AddToBasketButton } from './AddToBasketButton';

export function ResultCard({ product, lid }: { product: ProductSummary; lid: string }) {
  return (
    <div className="result-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/img/${product.barcode}`}
        alt={product.barcode}
        width={64}
        height={64}
        className="result-card__image"
      />
      <div className="result-card__body">
        <Link href={`/part/${product.barcode}?lid=${lid}`} className="result-card__title">
          {product.barcode} — {product.description}
        </Link>
        {product.categoryRaw && <span className="result-card__category">{product.categoryRaw}</span>}
        <StockIndicator stockAth={product.stockAth} stockThe={product.stockThe} lid={lid} />
      </div>
      <div
        className={`result-card__price ${product.salePrice == null ? 'result-card__price--empty' : ''}`}
      >
        {product.salePrice != null ? `${product.salePrice.toFixed(2)} €` : '—'}
      </div>
      <AddToBasketButton barcode={product.barcode} lid={lid} />
    </div>
  );
}
