import Link from 'next/link';
import { getModelsForBrand } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';

export default async function ModelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ lid?: string }>;
}) {
  const { brand } = await params;
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);
  const brandName = decodeURIComponent(brand);
  const models = await getModelsForBrand(brandName);

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>
        {brandName} — {dict.models}
      </h1>
      <ul>
        {models.map((model) => (
          <li key={model.modelCode}>
            <Link
              href={`/brands/${encodeURIComponent(brandName)}/models/${model.modelCode}/parts?lid=${lid}`}
            >
              {model.modelRaw} ({model.partsCount} {dict.parts})
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
