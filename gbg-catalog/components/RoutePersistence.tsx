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
  const hasCheckedInitialLoad = useRef(false);
  const storageKey = useRef(STORAGE_KEY);

  // Runs once per real page load (this component lives in the root layout,
  // which never remounts during client-side navigation) — restores the last
  // visited path if the embedding page reloaded the iframe back to its fixed
  // entry URL. Only fires on "/" so a real deep link (someone opening a
  // specific page directly) is never hijacked.
  //
  // TM1 can host several of our iframes at once (one per TM1 task tab), all
  // same-origin and sharing one sessionStorage bucket — so the key is
  // namespaced by `tid` (TM1's task id, passed once on the entry URL) to stop
  // tabs from restoring each other's path. Falls back to a shared key when
  // `tid` is absent (local dev, direct access, or before TM1 adds it). `tid`
  // only ever arrives on this first load — later client-side navigations
  // won't carry it — so it's captured once into a ref.
  useEffect(() => {
    if (hasCheckedInitialLoad.current) return;
    hasCheckedInitialLoad.current = true;
    const tid = searchParams.get('tid');
    if (tid) storageKey.current = `${STORAGE_KEY}:${tid}`;
    if (pathname !== '/') return;
    try {
      const saved = sessionStorage.getItem(storageKey.current);
      if (!saved) return;
      const current = buildPath(pathname, searchParams.toString());
      const restored = withCurrentLid(saved, searchParams.get('lid'));
      if (restored !== current) {
        router.replace(restored);
      }
    } catch {
      // sessionStorage unavailable (e.g. partitioned/blocked third-party
      // storage in a cross-origin iframe) — just stay on '/'.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the saved path up to date on every navigation.
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey.current, buildPath(pathname, searchParams.toString()));
    } catch {
      // ignore — see above
    }
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
