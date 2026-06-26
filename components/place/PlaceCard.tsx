'use client';

// 장소 카드 — 카테고리 배지 + 제목 + 지역·연령 + 별점·인기태그 + 다녀왔어요 (썸네일 없음)
import { useRouter } from 'next/navigation';
import { category } from '@/styles/tokens';
import { timeAgo } from '@/lib/age';
import { useAuth } from '@/lib/auth-context';
import Stars from '@/components/ui/Stars';
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
  const { firebaseUser } = useAuth();
  const c = category[place.category] ?? category.etc;
  const when = timeAgo(place.added_at);

  const count = place.rating_count ?? 0;
  const avg = place.avg_rating ?? null;
  const visited = !!(firebaseUser && place.rated_by?.includes(firebaseUser.uid));
  const tags = (place.popular_tags ?? []).slice(0, 2);

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
      <div style={{ flex: 1, minWidth: 0, padding: '11px 13px' }}>
        {/* 배지 + 제목 + 다녀왔어요 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
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
          {visited && (
            <span
              style={{
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                background: '#E2F5E8',
                color: '#1F9E57',
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              ✓ 다녀왔어요
            </span>
          )}
        </div>

        {/* 지역 · 연령 */}
        <div style={{ fontSize: 12, color: '#636366', fontWeight: 500, marginBottom: 6 }}>
          {[place.region, place.age_target].filter(Boolean).join(' · ')}
        </div>

        {/* 별점 + 인원   ·   등록자 · 시간 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <Stars value={avg ?? 0} size={13} gap={1.5} />
            {count > 0 ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1D1D1F', whiteSpace: 'nowrap' }}>
                {avg!.toFixed(1)}{' '}
                <span style={{ color: '#AEAEB2', fontWeight: 500 }}>({count}명)</span>
              </span>
            ) : (
              <span style={{ fontSize: 11.5, color: '#AEAEB2', fontWeight: 500, whiteSpace: 'nowrap' }}>아직 평점 없음</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 400, whiteSpace: 'nowrap', flex: 'none' }}>
            {[addedByName, when].filter(Boolean).join(' · ')}
          </span>
        </div>

        {/* 인기 한마디 태그 2개 */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            {tags.map((t) => (
              <span
                key={t.tag}
                style={{
                  background: '#FFF3EE',
                  color: '#C85A36',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.tag} {t.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 화살표 */}
      <div style={{ padding: '0 12px 0 4px', flex: 'none', alignSelf: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D2D2D7" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </button>
  );
}
