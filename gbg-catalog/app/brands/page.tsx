import Link from 'next/link';
import { getBrands } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ lid?: string }>;
}) {
  const params = await searchParams;
  const lid = getLanguageId(params.lid);
  const dict = getDictionary(lid);
  const brands = await getBrands();

  return (
    <main className="page">
      <h1 className="page-title">{dict.brands}</h1>
      <div className="brand-grid">
        {brands.map((brand) => (
          <Link
            key={brand.brandId}
            href={`/brands/${encodeURIComponent(brand.nameRaw)}/models?lid=${lid}`}
            className="brand-card"
          >
            <span className="brand-card__badge">{brand.nameRaw.slice(0, 1)}</span>
            <span className="brand-card__name">{brand.nameRaw}</span>
            <span className="brand-card__count">
              {brand.partsCount} {dict.parts}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
