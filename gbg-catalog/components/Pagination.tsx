import Link from 'next/link';

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  extraParams,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  extraParams: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefFor(targetPage: number) {
    const next = new URLSearchParams(extraParams);
    next.set('page', String(targetPage));
    return `${basePath}?${next.toString()}`;
  }

  return (
    <div className="pagination">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn btn-outline">
          ← Prev
        </Link>
      )}
      <span className="pagination__page">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className="btn btn-outline">
          Next →
        </Link>
      )}
    </div>
  );
}
