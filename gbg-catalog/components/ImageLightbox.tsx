'use client';

import { useEffect, useRef, useState } from 'react';

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevSize = useRef<{ width: string; height: string } | null>(null);

  function handlePanStart(e: React.MouseEvent) {
    if (zoom <= 1 || !viewportRef.current) return;
    const vp: HTMLDivElement = viewportRef.current;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = vp.scrollLeft;
    const startScrollTop = vp.scrollTop;
    setIsPanning(true);

    function handleMouseMove(ev: MouseEvent) {
      vp.scrollLeft = startScrollLeft - (ev.clientX - startX);
      vp.scrollTop = startScrollTop - (ev.clientY - startY);
    }
    function handleMouseUp() {
      setIsPanning(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function toggleFullscreen() {
    const el = ref.current;
    if (!fullscreen) {
      if (el) {
        prevSize.current = { width: el.style.width, height: el.style.height };
        el.style.width = '';
        el.style.height = '';
      }
      setFullscreen(true);
    } else {
      if (el && prevSize.current) {
        el.style.width = prevSize.current.width;
        el.style.height = prevSize.current.height;
      }
      setFullscreen(false);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className={`image-lightbox ${fullscreen ? 'image-lightbox--fullscreen' : ''}`} ref={ref}>
      <div className="image-lightbox__toolbar">
        <input
          type="range"
          min={1}
          max={6}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="image-lightbox__zoom"
        />
        <button
          type="button"
          className="image-lightbox__icon-btn"
          onClick={toggleFullscreen}
          aria-label="fullscreen"
        >
          ⛶
        </button>
        <button
          type="button"
          className="image-lightbox__icon-btn"
          onClick={onClose}
          aria-label="close"
        >
          ✕
        </button>
      </div>
      <div
        className={`image-lightbox__viewport ${zoom > 1 ? 'image-lightbox__viewport--zoomed' : ''} ${isPanning ? 'image-lightbox__viewport--panning' : ''}`}
        ref={viewportRef}
        onMouseDown={handlePanStart}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="image-lightbox__image"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
}
