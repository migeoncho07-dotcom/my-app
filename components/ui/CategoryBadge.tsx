// 카테고리 배지 — 이모지 + 한글 라벨, 카테고리별 색
import { category } from '@/styles/tokens';
import type { Category } from '@/types';

export default function CategoryBadge({
  type,
  size = 'sm',
}: {
  type: Category;
  size?: 'sm' | 'md';
}) {
  const c = category[type] ?? category.etc;
  const isMd = size === 'md';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: c.bg,
        color: c.text,
        borderRadius: 7,
        padding: isMd ? '6px 11px' : '4px 8px',
        fontSize: isMd ? 12.5 : 11.5,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{c.emoji}</span>
      {c.label}
    </span>
  );
}
