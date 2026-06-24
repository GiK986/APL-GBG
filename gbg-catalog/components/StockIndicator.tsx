import { getDictionary } from '@/lib/i18n';

function Pill({ inStock, label }: { inStock: boolean; label: string }) {
  return (
    <span className={`stock-pill ${inStock ? 'stock-pill--in' : 'stock-pill--out'}`}>
      <span className="stock-pill__dot" />
      {label}
    </span>
  );
}

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
  return (
    <span className="stock-row">
      <Pill inStock={stockAth} label={dict.inStockAthens} />
      <Pill inStock={stockThe} label={dict.inStockThessaloniki} />
    </span>
  );
}
