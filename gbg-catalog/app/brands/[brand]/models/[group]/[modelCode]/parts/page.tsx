import { formatYearRange, getCategoriesForModel, getModelDetails, getPartsForModel } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { InfinitePartsList } from '@/components/InfinitePartsList';
import { CategoryFilter } from '@/components/CategoryFilter';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { Breadcrumb } from '@/components/Breadcrumb';

export default async function ModelPartsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; group: string; modelCode: string }>;
  searchParams: Promise<{ lid?: string; categories?: string; available?: string }>;
}) {
  const { brand, group, modelCode } = await params;
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);
  const brandName = decodeURIComponent(brand);
  const modelGroup = decodeURIComponent(group);
  const selectedCategories = sp.categories ? sp.categories.split(',').filter(Boolean) : [];
  const availableOnly = sp.available === '1';

  const [{ items, total }, modelDetail, categories] = await Promise.all([
    getPartsForModel(
      brandName,
      modelCode,
      1,
      selectedCategories.length ? selectedCategories : undefined,
      availableOnly,
    ),
    getModelDetails(brandName, modelCode),
    getCategoriesForModel(brandName, modelCode, availableOnly),
  ]);

  const modelLabel = modelDetail
    ? `${modelDetail.modelName} (${formatYearRange(modelDetail.constrYearFrom, modelDetail.constrYearTo)})`
    : modelCode;

  return (
    <main className="page page--wide">
      <Breadcrumb
        items={[
          { label: brandName, href: `/?lid=${lid}` },
          {
            label: modelGroup,
            href: `/brands/${encodeURIComponent(brandName)}/models?lid=${lid}`,
          },
          {
            label: modelLabel,
            href: `/brands/${encodeURIComponent(brandName)}/models/${encodeURIComponent(modelGroup)}?lid=${lid}`,
          },
        ]}
        current={dict.parts}
      />
      <div className="parts-layout">
        <div className="parts-layout__main">
          {items.length === 0 ? (
            <p className="empty-state">{dict.noResults}</p>
          ) : (
            <InfinitePartsList
              key={`${brandName}/${modelCode}/${selectedCategories.join(',')}/${availableOnly}`}
              initialItems={items}
              total={total}
              lid={lid}
              fetchUrl="/api/parts"
              fetchParams={{
                brand: brandName,
                modelCode,
                ...(selectedCategories.length ? { categories: selectedCategories.join(',') } : {}),
                ...(availableOnly ? { available: '1' } : {}),
              }}
              uncategorizedLabel={dict.uncategorized}
              loadingLabel={dict.loadingMore}
            />
          )}
        </div>
        <div className="parts-layout__sidebar">
          <AvailabilityToggle checked={availableOnly} label={dict.showOnlyAvailable} />
          <CategoryFilter
            categories={categories}
            selected={selectedCategories}
            lid={lid}
            uncategorizedLabel={dict.uncategorized}
            title={dict.categories}
            clearLabel={dict.clearFilters}
            searchPlaceholder={dict.categorySearchPlaceholder}
            noMatchLabel={dict.noCategoryMatch}
          />
        </div>
      </div>
    </main>
  );
}
