'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribePlaces, subscribeMembers } from '@/lib/firestore';
import { category } from '@/styles/tokens';
import PlaceCard from '@/components/place/PlaceCard';
import type { Place, Member, Category } from '@/types';

type FilterKey = 'all' | Category;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  ...(Object.keys(category) as Category[]).map((k) => ({ key: k, label: category[k].label })),
];

export default function HomePage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [places, setPlaces] = useState<Place[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  // 그룹 장소/멤버 실시간 구독
  useEffect(() => {
    if (!groupId) return;
    const unsubP = subscribePlaces(groupId, setPlaces);
    const unsubM = subscribeMembers(groupId, setMembers);
    return () => {
      unsubP();
      unsubM();
    };
  }, [groupId]);

  // uid → 닉네임 맵
  const nameByUid = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((mem) => (m[mem.uid] = mem.nickname));
    return m;
  }, [members]);

  // 필터 + 검색 적용
  const visible = useMemo(() => {
    if (!places) return [];
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (q && !(`${p.title} ${p.region} ${p.memo}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [places, filter, search]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 라지 타이틀 */}
      <div style={{ padding: '60px 20px 0' }}>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>
          우리 아이랑 갈 곳
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 6 }}>
          {profile?.nickname ? `${profile.nickname}님의 공간` : ' '}
        </div>
      </div>

      {/* 검색 필드 */}
      <div style={{ padding: '16px 20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--ios-material)',
            borderRadius: 12,
            padding: '11px 14px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="장소, 지역 검색"
            style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* 카테고리 필터 칩 (가로 스크롤) */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '14px 20px 4px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flex: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: active ? 'var(--brand)' : 'var(--ios-material)',
                color: active ? '#fff' : 'var(--text-secondary)',
                boxShadow: active ? '0 8px 16px -8px rgba(255,107,74,.5)' : 'none',
              }}
            >
              {f.key !== 'all' && `${category[f.key as Category].emoji} `}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 목록 / 빈 상태 */}
      <div style={{ flex: 1, padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {places === null ? (
          <Centered>불러오는 중…</Centered>
        ) : visible.length === 0 ? (
          <EmptyState hasAny={places.length > 0} />
        ) : (
          visible.map((p) => <PlaceCard key={p.id} place={p} addedByName={nameByUid[p.added_by]} />)
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500 }}>
      {children}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 44 }}>🧸</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
        {hasAny ? '조건에 맞는 장소가 없어요' : '아직 등록된 장소가 없어요'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6 }}>
        {hasAny ? '검색어나 필터를 바꿔보세요.' : '아래 ＋ 버튼으로 첫 장소를 추가해 보세요.'}
      </div>
    </div>
  );
}
