import { getPartsForModel } from '@/lib/browse';
import { PAGE_SIZE } from '@/lib/constants';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { parsePage } from '@/lib/pagination';
import { ResultCard } from '@/components/ResultCard';
import { Pagination } from '@/components/Pagination';
import { Breadcrumb } from '@/components/Breadcrumb';

export default async function ModelPartsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; modelCode: string }>;
  searchParams: Promise<{ lid?: string; page?: string }>;
}) {
  const { brand, modelCode } = await params;
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);
  const brandName = decodeURIComponent(brand);
  const page = parsePage(sp.page);

  const { items, total } = await getPartsForModel(brandName, modelCode, page);

  return (
    <main className="page">
      <Breadcrumb
        items={[
          { label: brandName, href: `/brands?lid=${lid}` },
          {
            label: modelCode,
            href: `/brands/${encodeURIComponent(brandName)}/models?lid=${lid}`,
          },
        ]}
        current={dict.parts}
      />
      {items.length === 0 && <p className="empty-state">{dict.noResults}</p>}
      {items.map((item) => (
        <ResultCard key={item.productId} product={item} lid={lid} />
      ))}
      {items.length > 0 && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath={`/brands/${encodeURIComponent(brandName)}/models/${modelCode}/parts`}
          extraParams={{ lid }}
        />
      )}
    </main>
  );
}
