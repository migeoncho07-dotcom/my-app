'use client';

// 장소 카드 — 92px 썸네일 + 카테고리 배지 + 제목 + 지역·연령 + 등록자
import { useRouter } from 'next/navigation';
import CategoryBadge from '@/components/ui/CategoryBadge';
import { category } from '@/styles/tokens';
import type { Place } from '@/types';

export default function PlaceCard({
  place,
  addedByName,
}: {
  place: Place;
  addedByName?: string;
}) {
  const router = useRouter();
  const c = category[place.category] ?? category.etc;

  return (
    <button
      onClick={() => router.push(`/place/${place.id}`)}
      style={{
        display: 'flex',
        gap: 14,
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1px solid var(--border-light)',
        borderRadius: 18,
        padding: 12,
        boxShadow: '0 6px 20px -14px rgba(0,0,0,.45)',
      }}
    >
      {/* 썸네일 (이미지 없으면 카테고리색 플레이스홀더) */}
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 14,
          flex: 'none',
          background: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 34,
        }}
      >
        {c.emoji}
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
        <div>
          <CategoryBadge type={place.category} />
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {place.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {[place.region, place.age_target].filter(Boolean).join(' · ')}
        </div>
        {addedByName && (
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 'auto' }}>
            {addedByName} 등록
          </div>
        )}
      </div>
    </button>
  );
}
