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
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      {page > 1 && <Link href={hrefFor(page - 1)}>← Prev</Link>}
      <span>
        {page} / {totalPages}
      </span>
      {page < totalPages && <Link href={hrefFor(page + 1)}>Next →</Link>}
    </div>
  );
}
