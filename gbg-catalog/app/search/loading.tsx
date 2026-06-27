import { SearchBox } from '@/components/SearchBox';
import { DEFAULT_LID } from '@/lib/i18n';

export default function SearchLoading() {
  return (
    <main className="page">
      <div className="panel">
        <SearchBox lid={DEFAULT_LID} />
      </div>
      <div className="loading-state loading-state--spinner">
        <span className="spinner" aria-hidden="true" />
        Търсене...
      </div>
    </main>
  );
}
