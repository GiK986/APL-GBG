import Link from 'next/link';
import { formatYearRange, getModelsForGroup } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { Breadcrumb } from '@/components/Breadcrumb';

export default async function ModelsInGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; group: string }>;
  searchParams: Promise<{ lid?: string }>;
}) {
  const { brand, group } = await params;
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);
  const brandName = decodeURIComponent(brand);
  const modelGroup = decodeURIComponent(group);
  const models = await getModelsForGroup(brandName, modelGroup);

  return (
    <main className="page">
      <Breadcrumb
        items={[
          { label: brandName, href: `/?lid=${lid}` },
          { label: modelGroup, href: `/brands/${encodeURIComponent(brandName)}/models?lid=${lid}` },
        ]}
        current={dict.models}
      />
      <div className="model-grid">
        {models.map((model) => (
          <Link
            key={model.modelCode}
            href={`/brands/${encodeURIComponent(brandName)}/models/${encodeURIComponent(modelGroup)}/${model.modelCode}/parts?lid=${lid}`}
            className="model-card"
          >
            <span className="model-card__photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/model/${model.modelCode}`} alt={model.modelName} className="model-card__img" />
            </span>
            <span className="model-card__name">{model.modelName}</span>
            <span className="model-card__years">
              {formatYearRange(model.constrYearFrom, model.constrYearTo)}
            </span>
            <span className="model-card__count">
              {model.partsCount} {dict.parts}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
