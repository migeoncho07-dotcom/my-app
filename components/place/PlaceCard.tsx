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
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1px solid var(--border-light)',
        borderRadius: 22,
        padding: 15,
        boxShadow: '0 6px 20px -14px rgba(0,0,0,.45)',
      }}
    >
      {/* 본문 */}
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: c.bg,
            color: c.text,
            borderRadius: 7,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 700,
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
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {place.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '5px 0 9px', fontWeight: 500 }}>
          {[place.region, place.age_target].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: addedByColor || 'var(--brand)', flex: 'none' }} />
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {[addedByName, when].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </button>
  );
}
