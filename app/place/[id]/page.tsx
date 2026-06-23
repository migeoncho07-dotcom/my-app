'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchPlaceApi } from '@/lib/group-client';
import { category } from '@/styles/tokens';
import { timeAgo } from '@/lib/age';
import CategoryBadge from '@/components/ui/CategoryBadge';
import type { Place } from '@/types';

export default function PlaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { profile, loading } = useAuth();
  const groupId = profile?.group_id;

  const [place, setPlace] = useState<Place | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [addedByName, setAddedByName] = useState('');

  useEffect(() => {
    if (loading) return;
    let alive = true;
    (async () => {
      try {
        const { place: p, addedByName: name } = await fetchPlaceApi(id);
        if (!alive) return;
        if (!p) {
          setState('notfound');
          return;
        }
        setPlace(p);
        setAddedByName(name);
        setState('ready');
      } catch {
        if (alive) setState('notfound');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, loading]);

  if (state === 'loading') {
    return <Centered>불러오는 중…</Centered>;
  }
  if (state === 'notfound' || !place) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 20px' }}>
        <BackBtn onClick={() => router.back()} />
        <Centered>장소를 찾을 수 없어요.</Centered>
      </div>
    );
  }

  const c = category[place.category] ?? category.etc;
  const hasCoord = place.lat && place.lng;
  const mapUrl = hasCoord
    ? `https://map.kakao.com/link/map/${encodeURIComponent(place.title)},${place.lat},${place.lng}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(place.address || place.title)}`;
  const routeUrl = hasCoord
    ? `https://map.kakao.com/link/to/${encodeURIComponent(place.title)},${place.lat},${place.lng}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(place.address || place.title)}`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 28 }}>
      {/* 커버 */}
      <div
        style={{
          height: 210,
          background: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 72,
          position: 'relative',
        }}
      >
        {c.emoji}
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: 16,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          ←
        </button>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <CategoryBadge type={place.category} size="md" />
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 12, lineHeight: 1.25 }}>
          {place.title}
        </div>
        {place.region && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 6 }}>
            📍 {place.region}
          </div>
        )}
      </div>

      {/* 인셋 정보 */}
      <div style={{ padding: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, overflow: 'hidden' }}>
          <InfoRow label="주소" value={place.address || '미입력'} last={false} />
          <InfoRow label="운영기간" value={place.date_range || '—'} last={false} />
          <InfoRow label="대상연령" value={place.age_target || '—'} last={false} />
          <InfoRow label="메모" value={place.memo || '—'} last={false} />
          <InfoRow
            label="등록"
            value={`${addedByName || '멤버'}${place.added_at ? ' · ' + timeAgo(place.added_at as any) : ''}`}
            last
          />
        </div>
      </div>

      {/* 지도/길찾기 */}
      <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
          <div style={btnStyle(false)}>🗺️ 지도에서 보기</div>
        </a>
        <a href={routeUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
          <div style={btnStyle(true)}>🚗 길찾기</div>
        </a>
      </div>
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    textAlign: 'center',
    borderRadius: 16,
    padding: '15px',
    fontSize: 14.5,
    fontWeight: 700,
    ...(primary
      ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 12px 24px -12px rgba(255,107,74,.5)' }
      : { background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border)' }),
  };
}

function InfoRow({ label, value, last }: { label: string; value: string; last: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '13px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border-light)',
      }}
    >
      <div style={{ width: 64, flex: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand)', alignSelf: 'flex-start', marginBottom: 12 }}>
      ← 뒤로
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500 }}>
      {children}
    </div>
  );
}
