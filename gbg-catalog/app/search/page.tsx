import { searchProducts } from '@/lib/search';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { InfinitePartsList } from '@/components/InfinitePartsList';
import { SearchBox } from '@/components/SearchBox';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lid?: string }>;
}) {
  const params = await searchParams;
  const lid = getLanguageId(params.lid);
  const dict = getDictionary(lid);
  const query = params.q?.trim() ?? '';

  const { items, total } = query ? await searchProducts(query, 1) : { items: [], total: 0 };

  return (
    <main className="page">
      <div className="panel">
        <SearchBox lid={lid} initialQuery={query} />
      </div>
      {items.length === 0 ? (
        <p className="empty-state">{dict.noResults}</p>
      ) : (
        <InfinitePartsList
          key={query}
          initialItems={items}
          total={total}
          lid={lid}
          fetchUrl="/api/search"
          fetchParams={{ q: query }}
          uncategorizedLabel={dict.uncategorized}
          loadingLabel={dict.loadingMore}
        />
      )}
    </main>
  );
}
