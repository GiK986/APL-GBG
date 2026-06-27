'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DEFAULT_LID, getDictionary, getLanguageId } from '@/lib/i18n';

function HeaderContent({ lid }: { lid: string }) {
  const dict = getDictionary(lid);
  return (
    <>
      <span className="app-header__title">{dict.headerTitle}</span>
      <Link href="/" className="app-header__link">
        {dict.home}
      </Link>
    </>
  );
}

function AppHeaderNavInner() {
  const lid = getLanguageId(useSearchParams().get('lid') ?? undefined);
  return <HeaderContent lid={lid} />;
}

export function AppHeaderNav() {
  return (
    <Suspense fallback={<HeaderContent lid={DEFAULT_LID} />}>
      <AppHeaderNavInner />
    </Suspense>
  );
}
