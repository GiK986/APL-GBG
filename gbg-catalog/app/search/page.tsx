import { searchProducts } from '@/lib/search';
import { PAGE_SIZE } from '@/lib/constants';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { ResultCard } from '@/components/ResultCard';
import { Pagination } from '@/components/Pagination';
import { SearchBox } from '@/components/SearchBox';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lid?: string; page?: string }>;
}) {
  const params = await searchParams;
  const lid = getLanguageId(params.lid);
  const dict = getDictionary(lid);
  const query = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const { items, total } = query
    ? await searchProducts(query, page)
    : { items: [], total: 0 };

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <SearchBox lid={lid} initialQuery={query} />
      {items.length === 0 && <p>{dict.noResults}</p>}
      {items.map((item) => (
        <ResultCard key={item.productId} product={item} lid={lid} />
      ))}
      {items.length > 0 && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/search"
          extraParams={{ q: query, lid }}
        />
      )}
    </main>
  );
}
