'use client';

// 장소 카드 — 카테고리 배지 + 제목 + 지역·연령 + 등록자·시간 (썸네일 없음)
import { useRouter } from 'next/navigation';
import { category } from '@/styles/tokens';
import { timeAgo } from '@/lib/age';
import type { Place } from '@/types';

export default function PlaceCard({
  place,
  addedByName,
  addedByColor,
}: {
  place: Place;
  addedByName?: string;
  addedByColor?: string;
}) {
  const router = useRouter();
  const c = category[place.category] ?? category.etc;
  const when = timeAgo(place.added_at);

  return (
    <button
      onClick={() => router.push(`/place/${place.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1px solid #ECECF0',
        borderRadius: 14,
        padding: 0,
      }}
    >
      {/* 본문 */}
      <div style={{ flex: 1, minWidth: 0, padding: '10px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span
            style={{
              flex: 'none',
              background: c.bg,
              color: c.text,
              borderRadius: 5,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {c.label}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#1D1D1F',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {place.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#636366', fontWeight: 500, marginBottom: 4 }}>
          {[place.region, place.age_target].filter(Boolean).join(' · ')}
        </div>
        <div style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 400 }}>
          {[addedByName, when].filter(Boolean).join(' · ')}
        </div>
      </div>
      {/* 오른쪽 화살표 */}
      <div style={{ padding: '0 12px 0 4px', flex: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D2D2D7" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </button>
  );
}
