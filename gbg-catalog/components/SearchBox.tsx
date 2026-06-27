'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';

function SearchForm({ lid, query }: { lid: string; query: string }) {
  const dict = getDictionary(lid);
  return (
    <form action="/search" method="get" className="search-form">
      <input type="hidden" name="lid" value={lid} />
      <input
        type="text"
        name="q"
        defaultValue={query}
        placeholder={dict.searchPlaceholder}
        className="search-input"
      />
      <button type="submit" className="btn btn-primary">
        {dict.searchButton}
      </button>
    </form>
  );
}

function SearchBoxInner({ lid }: { lid: string }) {
  // Reading straight from the URL (rather than a server-passed prop) means
  // this also works correctly inside loading.tsx, which has no access to
  // searchParams: the URL is already the destination URL during navigation.
  const query = useSearchParams().get('q') ?? '';
  return <SearchForm lid={lid} query={query} />;
}

export function SearchBox({ lid }: { lid: string }) {
  return (
    <Suspense fallback={<SearchForm lid={lid} query="" />}>
      <SearchBoxInner lid={lid} />
    </Suspense>
  );
}
