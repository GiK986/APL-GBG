import Link from 'next/link';
import { getModelGroupsForBrand } from '@/lib/browse';
import { getDictionary, getLanguageId } from '@/lib/i18n';
import { Breadcrumb } from '@/components/Breadcrumb';

export default async function ModelGroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ lid?: string }>;
}) {
  const { brand } = await params;
  const sp = await searchParams;
  const lid = getLanguageId(sp.lid);
  const dict = getDictionary(lid);
  const brandName = decodeURIComponent(brand);
  const groups = await getModelGroupsForBrand(brandName);

  return (
    <main className="page">
      <Breadcrumb items={[{ label: brandName, href: `/?lid=${lid}` }]} current={dict.series} />
      <div className="chip-grid">
        {groups.map((group) => (
          <Link
            key={group.modelGroup}
            href={`/brands/${encodeURIComponent(brandName)}/models/${encodeURIComponent(group.modelGroup)}?lid=${lid}`}
            className="chip-link"
          >
            {group.modelGroup}
            <span className="chip-link__count">
              {group.partsCount} {dict.parts}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
