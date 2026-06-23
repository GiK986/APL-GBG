import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { getDictionary, getLanguageId } from '@/lib/i18n';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lid?: string }>;
}) {
  const params = await searchParams;
  const lid = getLanguageId(params.lid);
  const dict = getDictionary(lid);

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>GBG Catalog</h1>
      <SearchBox lid={lid} />
      <p>
        <Link href={`/brands?lid=${lid}`}>{dict.brands}</Link>
      </p>
    </main>
  );
}
