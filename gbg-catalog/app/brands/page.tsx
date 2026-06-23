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
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>{dict.brands}</h1>
      <ul>
        {brands.map((brand) => (
          <li key={brand.brandId}>
            <Link href={`/brands/${encodeURIComponent(brand.nameRaw)}/models?lid=${lid}`}>
              {brand.nameRaw} ({brand.partsCount})
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
