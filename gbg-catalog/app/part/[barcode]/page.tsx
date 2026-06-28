import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartDetail } from '@/lib/part';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { categoryLabel, descriptionLabel } from '@/lib/format';
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
    <main className="page">
      <div className="panel part-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/${part.barcode}`} alt={part.barcode} className="part-image" />
        <div className="part-info">
          <div className="part-barcode">{part.barcode}</div>
          <p className="part-description">{descriptionLabel(part.description, part.descriptionBg, lid)}</p>
          {part.categoryRaw && (
            <span className="result-card__category">
              {categoryLabel(part.categoryRaw, part.categoryDescBg, lid)}
            </span>
          )}
          <StockIndicator stockAth={part.stockAth} stockThe={part.stockThe} lid={lid} />
          <div className={`part-price ${part.salePrice == null ? 'part-price--empty' : ''}`}>
            {part.salePrice != null ? `${part.salePrice.toFixed(2)} €` : '—'}
          </div>
          <AddToBasketButton
            barcode={part.barcode}
            lid={lid}
            inStock={part.stockAth || part.stockThe}
          />
        </div>
      </div>

      <h2 className="section-label">{dict.oemNumbers}</h2>
      <ul className="detail-list">
        {part.oemNumbers.map((oem) => (
          <li key={oem.oemCode}>{oem.oemCode}</li>
        ))}
      </ul>

      <h2 className="section-label">{dict.similarParts}</h2>
      <ul className="detail-list">
        {part.crossRefs.map((ref) => (
          <li key={ref.similarCode}>
            <Link href={`/part/${ref.similarCode}?lid=${lid}`} className="result-card__title">
              {ref.similarCode}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="section-label">{dict.usedIn}</h2>
      <ul className="detail-list">
        {part.applications.map((app, i) => (
          <li key={i}>
            <Link
              href={`/brands/${encodeURIComponent(app.brandName)}/models/${encodeURIComponent(app.modelGroup)}/${app.modelCode}/parts?lid=${lid}`}
            >
              {app.brandName} — {app.modelRaw}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
