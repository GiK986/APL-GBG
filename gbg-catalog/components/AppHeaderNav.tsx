'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DEFAULT_LID, getDictionary, getLanguageId } from '@/lib/i18n';

function HeaderContent({ lid }: { lid: string }) {
  const dict = getDictionary(lid);
  return (
    <>
      <Link href="/" className="app-header__home" aria-label={dict.home}>
        <svg
          className="app-header__home-icon"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 9.5L10 3.5L17 9.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 8V16H15V8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <span className="app-header__title">{dict.headerTitle}</span>
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
