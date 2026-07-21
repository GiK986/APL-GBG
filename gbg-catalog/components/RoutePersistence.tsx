'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'gbg-catalog:last-path';

function buildPath(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

// Keeps the saved path's position, but swaps in the lid the embedding page
// just sent on this load — otherwise restoring the saved path would silently
// revert a language switch back to whatever lid was current when it was saved.
function withCurrentLid(savedPath: string, currentLid: string | null): string {
  if (!currentLid) return savedPath;
  const [savedPathname, savedSearch = ''] = savedPath.split('?');
  const params = new URLSearchParams(savedSearch);
  params.set('lid', currentLid);
  return buildPath(savedPathname, params.toString());
}

function RoutePersistenceInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasRestored = useRef(false);

  // Runs exactly once per real page load (this component lives in the root
  // layout, which never remounts during client-side navigation) — restores
  // the last visited path if the embedding page reloaded the iframe back to
  // its fixed entry URL. Only fires on "/" so a real deep link (someone
  // opening a specific page directly) is never hijacked.
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    if (pathname !== '/') return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const current = buildPath(pathname, searchParams.toString());
    const restored = withCurrentLid(saved, searchParams.get('lid'));
    if (restored !== current) {
      router.replace(restored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the saved path up to date on every navigation.
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, buildPath(pathname, searchParams.toString()));
  }, [pathname, searchParams]);

  return null;
}

export function RoutePersistence() {
  return (
    <Suspense fallback={null}>
      <RoutePersistenceInner />
    </Suspense>
  );
}
