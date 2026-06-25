'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UNCATEGORIZED_KEY } from '@/lib/constants';
import type { CategorySummary } from '@/lib/types';

export function CategoryFilter({
  categories,
  selected,
  uncategorizedLabel,
  title,
  clearLabel,
  searchPlaceholder,
  noMatchLabel,
}: {
  categories: CategorySummary[];
  selected: string[];
  uncategorizedLabel: string;
  title: string;
  clearLabel: string;
  searchPlaceholder: string;
  noMatchLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');

  function setCategories(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set('categories', next.join(','));
    } else {
      params.delete('categories');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(category: string) {
    const next = selected.includes(category)
      ? selected.filter((c) => c !== category)
      : [...selected, category];
    setCategories(next);
  }

  if (categories.length === 0) return null;

  const query = search.trim().toLowerCase();
  const visibleCategories = query
    ? categories.filter((c) =>
        (c.category === UNCATEGORIZED_KEY ? uncategorizedLabel : c.category).toLowerCase().includes(query)
      )
    : categories;

  return (
    <aside className="category-filter">
      <div className="category-filter__header">
        <h3 className="category-filter__title">{title}</h3>
        {selected.length > 0 && (
          <button type="button" className="category-filter__clear" onClick={() => setCategories([])}>
            {clearLabel}
          </button>
        )}
      </div>
      <div className="category-filter__search">
        <svg
          className="category-filter__search-icon"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="category-filter__search-input"
        />
      </div>
      {visibleCategories.length === 0 ? (
        <p className="category-filter__empty">{noMatchLabel}</p>
      ) : (
        <ul className="category-filter__list">
          {visibleCategories.map((c) => (
            <li key={c.category}>
              <label className="category-filter__option">
                <input
                  type="checkbox"
                  checked={selected.includes(c.category)}
                  onChange={() => toggle(c.category)}
                />
                <span className="category-filter__label">
                  {c.category === UNCATEGORIZED_KEY ? uncategorizedLabel : c.category}
                </span>
                <span className="category-filter__count">{c.partsCount}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
