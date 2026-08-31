import Link from 'next/link';
import type { LanguageId } from '@/lib/i18n';

export function ToolsTile({ lid, label }: { lid: LanguageId; label: string }) {
  return (
    <div className="tools-tile-wrap">
      <Link href={`/tools?lid=${lid}`} className="brand-card tools-tile">
        <span className="brand-card__badge tools-tile__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="26" height="26">
            <path
              d="M14.7 6.3a4 4 0 0 1-5.1 5.1L4 17l3 3 5.6-5.6a4 4 0 0 1 5.1-5.1l-2.5 2.5-2-2 2.5-2.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="brand-card__name">{label}</span>
      </Link>
    </div>
  );
}
