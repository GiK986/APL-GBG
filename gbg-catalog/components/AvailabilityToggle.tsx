'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function AvailabilityToggle({ checked, label }: { checked: boolean; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.delete('available');
    } else {
      params.set('available', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="availability-toggle">
      <span className="availability-toggle__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch${checked ? ' switch--on' : ''}`}
        onClick={toggle}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}
