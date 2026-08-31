import Link from 'next/link';
import type { LanguageId } from '@/lib/i18n';

export function ToolsTile({ lid, label }: { lid: LanguageId; label: string }) {
  return (
    <div className="tools-tile-wrap">
      <Link href={`/tools?lid=${lid}`} className="brand-card tools-tile">
        <span className="brand-card__badge tools-tile__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="26" height="26">
            <path
              d="M8 9V6.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="3" y="9" width="18" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 13.2h18" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.8 12.4v1.6M13.2 12.4v1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="brand-card__name">{label}</span>
      </Link>
    </div>
  );
}
