import Image from 'next/image';
import Link from 'next/link';
import { brandLogoSlug } from '@/lib/browse';
import type { LanguageId } from '@/lib/i18n';
import type { BrandSummary } from '@/lib/types';

export function BrandGrid({
  brands,
  lid,
  partsLabel,
}: {
  brands: BrandSummary[];
  lid: LanguageId;
  partsLabel: string;
}) {
  return (
    <div className="brand-grid">
      {brands.map((brand) => (
        <Link
          key={brand.brandId}
          href={`/brands/${encodeURIComponent(brand.nameRaw)}/models?lid=${lid}`}
          className="brand-card"
        >
          <span className="brand-card__badge">
            <Image
              src={`/gbg-brands-logo/${brandLogoSlug(brand.nameRaw)}.jpg`}
              alt={brand.nameRaw}
              width={40}
              height={40}
              className="brand-card__logo"
            />
          </span>
          <span className="brand-card__name">{brand.nameRaw}</span>
          <span className="brand-card__count">
            {brand.partsCount} {partsLabel}
          </span>
        </Link>
      ))}
    </div>
  );
}
