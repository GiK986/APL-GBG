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
  return (
    <span style={{ display: 'flex', gap: 8, fontSize: 12 }}>
      <span style={{ color: stockAth ? 'green' : 'crimson' }}>● {dict.inStockAthens}</span>
      <span style={{ color: stockThe ? 'green' : 'crimson' }}>● {dict.inStockThessaloniki}</span>
    </span>
  );
}
