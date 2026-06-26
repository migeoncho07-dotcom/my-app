'use client';

// 별점 — 표시 전용 또는 입력(interactive)
import React from 'react';

const STAR_PATH =
  'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z';

export default function Stars({
  value,
  size = 14,
  gap = 2,
  interactive = false,
  onChange,
  filled = '#FF6B4A',
  empty = '#EAEAEE',
}: {
  value: number;
  size?: number;
  gap?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  filled?: string;
  empty?: string;
}) {
  const count = Math.round(value);
  return (
    <div style={{ display: 'inline-flex', gap, lineHeight: 0 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= count;
        const svg = (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? filled : empty} style={{ display: 'block', transition: 'fill .12s, transform .15s' }}>
            <path d={STAR_PATH} />
          </svg>
        );
        if (!interactive) return <span key={i} style={{ lineHeight: 0 }}>{svg}</span>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i)}
            aria-label={`별 ${i}개`}
            style={{ padding: 0, background: 'none', border: 'none', lineHeight: 0, cursor: 'pointer' }}
          >
            {svg}
          </button>
        );
      })}
    </div>
  );
}
