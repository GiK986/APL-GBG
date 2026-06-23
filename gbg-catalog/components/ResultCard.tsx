import Link from 'next/link';
import type { ProductSummary } from '@/lib/types';
import { StockIndicator } from './StockIndicator';
import { AddToBasketButton } from './AddToBasketButton';

export function ResultCard({ product, lid }: { product: ProductSummary; lid: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/img/${product.barcode}`}
        alt={product.barcode}
        width={80}
        height={80}
        style={{ objectFit: 'contain' }}
      />
      <div style={{ flex: 1 }}>
        <Link href={`/part/${product.barcode}?lid=${lid}`}>
          <strong>{product.barcode}</strong> — {product.description}
        </Link>
        <div>{product.categoryRaw}</div>
        <StockIndicator stockAth={product.stockAth} stockThe={product.stockThe} lid={lid} />
        <div>{product.salePrice != null ? `${product.salePrice.toFixed(2)} €` : '—'}</div>
      </div>
      <AddToBasketButton barcode={product.barcode} lid={lid} />
    </div>
  );
}
