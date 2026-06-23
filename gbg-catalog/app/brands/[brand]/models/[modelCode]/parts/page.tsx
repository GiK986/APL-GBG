import { getPartsForModel } from '@/lib/browse';
import { PAGE_SIZE } from '@/lib/constants';
import { getLanguageId } from '@/lib/i18n';
import { ResultCard } from '@/components/ResultCard';
import { Pagination } from '@/components/Pagination';

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
  const brandName = decodeURIComponent(brand);
  const page = Number(sp.page ?? '1') || 1;

  const { items, total } = await getPartsForModel(brandName, modelCode, page);

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>
        {brandName} — {modelCode}
      </h1>
      {items.map((item) => (
        <ResultCard key={item.productId} product={item} lid={lid} />
      ))}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath={`/brands/${encodeURIComponent(brandName)}/models/${modelCode}/parts`}
        extraParams={{ lid }}
      />
    </main>
  );
}
