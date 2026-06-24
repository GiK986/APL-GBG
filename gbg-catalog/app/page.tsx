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
    <main className="page">
      <h1 className="page-title">Каталог на артикули</h1>
      <div className="panel">
        <SearchBox lid={lid} />
      </div>
      <div className="panel">
        <Link href={`/brands?lid=${lid}`} className="btn btn-outline">
          {dict.brands} →
        </Link>
      </div>
    </main>
  );
}
