'use client';

// 장소 카드 (시안 02) — 92px 썸네일 + 카테고리 배지 + 제목 + 지역·연령 + 등록자
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
        gap: 13,
        alignItems: 'stretch',
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1px solid #ECECF0',
        borderRadius: 16,
        padding: 13,
      }}
    >
      {/* 썸네일 (카테고리 색 + 이모지) */}
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 16,
          flex: 'none',
          background: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}
      >
        {c.emoji}
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            alignSelf: 'flex-start',
            background: c.bg,
            color: c.text,
            borderRadius: 7,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            marginBottom: 7,
          }}
        >
          {c.emoji} {c.label}
        </span>
        <div
          style={{
            fontSize: 16.5,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            color: '#1D1D1F',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {place.title}
        </div>
        <div style={{ fontSize: 12.5, color: '#8E8E93', fontWeight: 500, margin: '5px 0 9px' }}>
          {[place.region, place.age_target].filter(Boolean).join(' · ')}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              flex: 'none',
              background: addedByColor || '#FFD9CC',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9.5,
              fontWeight: 700,
            }}
          >
            {addedByName?.[0] ?? ''}
          </div>
          <span style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500 }}>
            {[addedByName, when].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </button>
  );
}
