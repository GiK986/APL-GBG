import { getDictionary } from '@/lib/i18n';

export function SearchBox({ lid, initialQuery }: { lid: string; initialQuery?: string }) {
  const dict = getDictionary(lid);
  return (
    <form action="/search" method="get" style={{ display: 'flex', gap: 8 }}>
      <input type="hidden" name="lid" value={lid} />
      <input
        type="text"
        name="q"
        defaultValue={initialQuery}
        placeholder={dict.searchPlaceholder}
        style={{ flex: 1, padding: 8 }}
      />
      <button type="submit">{dict.searchButton}</button>
    </form>
  );
}
