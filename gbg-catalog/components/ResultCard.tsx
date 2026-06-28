import Link from 'next/link';
import type { ProductSummary } from '@/lib/types';
import { categoryLabel, sideLabel } from '@/lib/format';
import { StockIndicator } from './StockIndicator';
import { AddToBasketButton } from './AddToBasketButton';
import { PartThumbnail } from './PartThumbnail';

export function ResultCard({
  product,
  lid,
  showCategory = true,
  onOpenDetail,
}: {
  product: ProductSummary;
  lid: string;
  showCategory?: boolean;
  onOpenDetail?: () => void;
}) {
  const side = sideLabel(product.side);
  const inStock = product.stockAth || product.stockThe;

  return (
    <div className="result-card">
      <PartThumbnail barcode={product.barcode} />
      <div className="result-card__body">
        <Link
          href={`/part/${product.barcode}?lid=${lid}`}
          className="result-card__title"
          onClick={(e) => {
            if (!onOpenDetail) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onOpenDetail();
          }}
        >
          <span className="result-card__barcode">{product.barcode} GBG</span>
          <span className="result-card__description">
            {product.description}
            {side && ` ${side}`}
          </span>
        </Link>
        {showCategory && product.categoryRaw && (
          <span className="result-card__category">
            {categoryLabel(product.categoryRaw, product.categoryDescBg, lid)}
          </span>
        )}
        <StockIndicator stockAth={product.stockAth} stockThe={product.stockThe} lid={lid} />
      </div>
      <div
        className={`result-card__price ${product.salePrice == null ? 'result-card__price--empty' : ''}`}
      >
        {product.salePrice != null ? `${product.salePrice.toFixed(2)} €` : '—'}
      </div>
      <AddToBasketButton barcode={product.barcode} lid={lid} inStock={inStock} />
    </div>
  );
}
