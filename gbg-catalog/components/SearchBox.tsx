import { getDictionary } from '@/lib/i18n';

export function SearchBox({ lid, initialQuery }: { lid: string; initialQuery?: string }) {
  const dict = getDictionary(lid);
  return (
    <form action="/search" method="get" className="search-form">
      <input type="hidden" name="lid" value={lid} />
      <input
        type="text"
        name="q"
        defaultValue={initialQuery}
        placeholder={dict.searchPlaceholder}
        className="search-input"
      />
      <button type="submit" className="btn btn-primary">
        {dict.searchButton}
      </button>
    </form>
  );
}
