import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumb({ items, current }: { items: BreadcrumbItem[]; current: string }) {
  return (
    <nav className="breadcrumb">
      {items.map((item) => (
        <span key={item.href} className="breadcrumb__chip">
          {item.label}
          <Link href={item.href} className="breadcrumb__chip-close" aria-label={`Премахни ${item.label}`}>
            ×
          </Link>
        </span>
      ))}
      <span className="breadcrumb__sep">›</span>
      <span className="breadcrumb__current">{current}</span>
    </nav>
  );
}
