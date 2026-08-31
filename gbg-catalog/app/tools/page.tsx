import { getToolCategories, getToolProducts } from '@/lib/tools';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { InfinitePartsList } from '@/components/InfinitePartsList';
import { CategoryFilter } from '@/components/CategoryFilter';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { Breadcrumb } from '@/components/Breadcrumb';

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ lid?: string; categories?: string; available?: string }>;
}) {
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);
  const selectedCategories = sp.categories
    ? sp.categories.split(',').filter(Boolean).map(decodeURIComponent)
    : [];
  const availableOnly = sp.available === '1';

  const [{ items, total }, categories] = await Promise.all([
    getToolProducts(1, selectedCategories.length ? selectedCategories : undefined, availableOnly),
    getToolCategories(),
  ]);

  return (
    <main className="page page--wide">
      <Breadcrumb items={[{ label: dict.home, href: `/?lid=${lid}` }]} current={dict.tools} />
      <div className="parts-layout">
        <div className="parts-layout__main">
          {items.length === 0 ? (
            <p className="empty-state">{dict.noResults}</p>
          ) : (
            <InfinitePartsList
              key={`tools/${selectedCategories.join(',')}/${availableOnly}`}
              initialItems={items}
              total={total}
              lid={lid}
              fetchUrl="/api/tools"
              fetchParams={{
                ...(selectedCategories.length
                  ? { categories: selectedCategories.map(encodeURIComponent).join(',') }
                  : {}),
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
