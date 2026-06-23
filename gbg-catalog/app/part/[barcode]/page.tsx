import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartDetail } from '@/lib/part';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { StockIndicator } from '@/components/StockIndicator';
import { AddToBasketButton } from '@/components/AddToBasketButton';

export default async function PartDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ barcode: string }>;
  searchParams: Promise<{ lid?: string }>;
}) {
  const { barcode } = await params;
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);

  const part = await getPartDetail(barcode);
  if (!part) notFound();

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/img/${part.barcode}`} alt={part.barcode} width={240} />
      <h1>{part.barcode}</h1>
      <p>{part.description}</p>
      <p>{part.categoryRaw}</p>
      <StockIndicator stockAth={part.stockAth} stockThe={part.stockThe} lid={lid} />
      <p>{part.salePrice != null ? `${part.salePrice.toFixed(2)} €` : '—'}</p>
      <AddToBasketButton barcode={part.barcode} lid={lid} />

      <h2>{dict.oemNumbers}</h2>
      <ul>
        {part.oemNumbers.map((oem) => (
          <li key={oem.oemCode}>{oem.oemCode}</li>
        ))}
      </ul>

      <h2>{dict.similarParts}</h2>
      <ul>
        {part.crossRefs.map((ref) => (
          <li key={ref.similarCode}>
            <Link href={`/part/${ref.similarCode}?lid=${lid}`}>{ref.similarCode}</Link>
          </li>
        ))}
      </ul>

      <h2>{dict.usedIn}</h2>
      <ul>
        {part.applications.map((app, i) => (
          <li key={i}>
            {app.brandName} — {app.modelRaw}
          </li>
        ))}
      </ul>
    </main>
  );
}
