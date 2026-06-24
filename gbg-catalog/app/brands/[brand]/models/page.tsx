import Link from 'next/link';
import { getModelsForBrand } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { Breadcrumb } from '@/components/Breadcrumb';

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
    <main className="page">
      <Breadcrumb items={[{ label: brandName, href: `/brands?lid=${lid}` }]} current={dict.models} />
      <div className="chip-grid">
        {models.map((model) => (
          <Link
            key={model.modelCode}
            href={`/brands/${encodeURIComponent(brandName)}/models/${model.modelCode}/parts?lid=${lid}`}
            className="chip-link"
          >
            {model.modelRaw}
            <span className="chip-link__count">
              {model.partsCount} {dict.parts}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
