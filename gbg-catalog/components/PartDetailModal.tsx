'use client';

import { useEffect, useRef, useState } from 'react';
import type { PartDetail } from '@/lib/types';
import { getDictionary } from '@/lib/i18n';
import { sideLabel } from '@/lib/format';
import { StockIndicator } from './StockIndicator';
import { AddToBasketButton } from './AddToBasketButton';

export function PartDetailModal({
  barcode,
  lid,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  barcode: string;
  lid: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const dict = getDictionary(lid);
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPart(null);
    fetch(`/api/part/${barcode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setPart(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [barcode]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    }
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (modalRef.current?.contains(target)) return;
      if (target.closest('.part-modal-nav')) return;
      onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const side = part ? sideLabel(part.side) : '';

  return (
    <div className="part-modal-overlay">
      <button
        type="button"
        className="part-modal-nav part-modal-nav--prev"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="previous"
      >
        ‹
      </button>
      <div className="part-modal" ref={modalRef}>
        <button type="button" className="part-modal__close" onClick={onClose} aria-label="close">
          ✕
        </button>
        {loading || !part ? (
          <p className="loading-state">{dict.loadingMore}</p>
        ) : (
          <>
            <div className="panel part-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/${part.barcode}`} alt={part.barcode} className="part-image" />
              <div className="part-modal-info">
                <div className="part-modal-info__main">
                  <div className="part-modal-info__row">
                    <span className="part-modal-info__label">{dict.partNumberLabel}:</span>
                    <span className="part-modal-info__value">{part.barcode} GBG</span>
                  </div>
                  <div className="part-modal-info__row">
                    <span className="part-modal-info__label">{dict.descriptionLabel}:</span>
                    <span className="part-modal-info__value">
                      {part.description}
                      {side && ` ${side}`}
                    </span>
                  </div>
                  <div className="part-modal-info__row">
                    <span className="part-modal-info__label">{dict.categoryLabel}:</span>
                    <span className="part-modal-info__value">{part.categoryRaw ?? dict.uncategorized}</span>
                    <StockIndicator stockAth={part.stockAth} stockThe={part.stockThe} lid={lid} />
                  </div>
                  <h2 className="section-label">{dict.oemNumbers}</h2>
                  <ul className="oem-chip-list">
                    {part.oemNumbers.map((oem) => (
                      <li key={oem.oemCode}>{oem.oemCode}</li>
                    ))}
                  </ul>
                </div>
                <div className="part-modal-info__side">
                  <span
                    className={`part-price ${part.salePrice == null ? 'part-price--empty' : ''}`}
                  >
                    {part.salePrice != null ? `${part.salePrice.toFixed(2)} €` : '—'}
                  </span>
                  <AddToBasketButton
                    barcode={part.barcode}
                    lid={lid}
                    inStock={part.stockAth || part.stockThe}
                  />
                </div>
              </div>
            </div>

            <h2 className="section-label">{dict.usedIn}</h2>
            <ul className="detail-list">
              {part.applications.map((app, i) => (
                <li key={i}>
                  {app.brandName} — {app.modelRaw}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <button
        type="button"
        className="part-modal-nav part-modal-nav--next"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="next"
      >
        ›
      </button>
    </div>
  );
}
