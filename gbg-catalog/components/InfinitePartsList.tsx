'use client';

import { useEffect, useRef, useState } from 'react';
import { ResultCard } from './ResultCard';
import { PartDetailModal } from './PartDetailModal';
import type { ProductSummary } from '@/lib/types';

interface CategoryGroup {
  category: string;
  items: ProductSummary[];
}

function groupByCategory(items: ProductSummary[], uncategorizedLabel: string): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const item of items) {
    const category = item.categoryRaw ?? uncategorizedLabel;
    const last = groups[groups.length - 1];
    if (last && last.category === category) {
      last.items.push(item);
    } else {
      groups.push({ category, items: [item] });
    }
  }
  return groups;
}

export function InfinitePartsList({
  initialItems,
  total,
  lid,
  fetchUrl,
  fetchParams,
  uncategorizedLabel,
  loadingLabel,
}: {
  initialItems: ProductSummary[];
  total: number;
  lid: string;
  fetchUrl: string;
  fetchParams: Record<string, string>;
  uncategorizedLabel: string;
  loadingLabel: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = items.length < total;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading, hasMore]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams({ ...fetchParams, page: String(nextPage) });
    const res = await fetch(`${fetchUrl}?${params.toString()}`);
    const data = await res.json();
    setItems((prev) => [...prev, ...data.items]);
    setPage(nextPage);
    setLoading(false);
  }

  const groups = groupByCategory(items, uncategorizedLabel);
  let flatIndex = -1;

  return (
    <div>
      {groups.map((group, i) => (
        <section key={`${group.category}-${i}`} className="category-section">
          <h2 className="category-header">{group.category}</h2>
          {group.items.map((item) => {
            flatIndex += 1;
            const currentIndex = flatIndex;
            return (
              <ResultCard
                key={item.productId}
                product={item}
                lid={lid}
                showCategory={false}
                onOpenDetail={() => setActiveIndex(currentIndex)}
              />
            );
          })}
        </section>
      ))}
      {hasMore && <div ref={sentinelRef} />}
      {loading && <p className="loading-state">{loadingLabel}</p>}
      {activeIndex !== null && items[activeIndex] && (
        <PartDetailModal
          barcode={items[activeIndex].barcode}
          lid={lid}
          onClose={() => setActiveIndex(null)}
          onPrev={() => setActiveIndex((idx) => (idx !== null ? Math.max(0, idx - 1) : idx))}
          onNext={() =>
            setActiveIndex((idx) => (idx !== null ? Math.min(items.length - 1, idx + 1) : idx))
          }
          hasPrev={activeIndex > 0}
          hasNext={activeIndex < items.length - 1}
        />
      )}
    </div>
  );
}
