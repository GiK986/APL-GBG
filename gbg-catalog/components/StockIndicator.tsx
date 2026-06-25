import { getDictionary } from '@/lib/i18n';

export function StockIndicator({
  stockAth,
  stockThe,
  lid,
}: {
  stockAth: boolean;
  stockThe: boolean;
  lid: string;
}) {
  const dict = getDictionary(lid);
  const inStock = stockAth || stockThe;
  return (
    <span className={`stock-pill ${inStock ? 'stock-pill--in' : 'stock-pill--out'}`}>
      <span className="stock-pill__dot" />
      {inStock ? dict.available : dict.unavailable}
    </span>
  );
}
