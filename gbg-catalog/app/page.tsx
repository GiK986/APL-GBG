import { BrandGrid } from '@/components/BrandGrid';
import { ToolsTile } from '@/components/ToolsTile';
import { SearchBox } from '@/components/SearchBox';
import { getBrands } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lid?: string }>;
}) {
  const params = await searchParams;
  const lid = getLanguageId(params.lid);
  const dict = getDictionary(lid);
  const brands = await getBrands();

  return (
    <main className="page">
      <div className="panel">
        <SearchBox lid={lid} />
      </div>
      <ToolsTile lid={lid} label={dict.tools} />
      <h2 className="page-subtitle">{dict.brands}</h2>
      <BrandGrid brands={brands} lid={lid} partsLabel={dict.parts} />
    </main>
  );
}
