'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchGroup, cachedGroupSync } from '@/lib/group-client';
import { category } from '@/styles/tokens';
import PlaceCard from '@/components/place/PlaceCard';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { Place, Member, Category } from '@/types';

type FilterKey = 'all' | Category;

// 시안 02의 세그먼트 컨트롤 (짧은 라벨, 가로 스크롤)
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'kids_cafe', label: '☕ 카페' },
  { key: 'hotel', label: '🏨 호텔' },
  { key: 'outdoor', label: '🌿 야외' },
  { key: 'performance', label: '🎭 공연' },
  { key: 'restaurant', label: '🍴 음식' },
  { key: 'etc', label: '📦 기타' },
];

export default function HomePage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [places, setPlaces] = useState<Place[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  // 그룹 장소/멤버 — 캐시 즉시표시 후 서버 갱신 + 8초 폴링
  useEffect(() => {
    let alive = true;
    const c = cachedGroupSync();
    if (c) {
      setPlaces(c.places);
      setMembers(c.members);
    }
    async function load() {
      try {
        const d = await fetchGroup();
        if (!alive) return;
        setPlaces(d.places);
        setMembers(d.members);
      } catch {
        if (alive) setPlaces((prev) => prev ?? []);
      }
    }
    load();
    const iv = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const memberMap = useMemo(() => {
    const m: Record<string, Member> = {};
    members.forEach((mem) => (m[mem.uid] = mem));
    return m;
  }, [members]);

  const visible = useMemo(() => {
    if (!places) return [];
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (q && !`${p.title} ${p.region} ${p.memo}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [places, filter, search]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 라지 타이틀 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: 'calc(env(safe-area-inset-top, 0px) + 22px) 22px 2px',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 2 }}>
            오늘도 좋은 곳 찾아봐요
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
            모아둔 곳
          </div>
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            flex: 'none',
            background: profile?.avatar_color || '#FFD9CC',
            border: '1px solid rgba(0,0,0,.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {profile?.nickname?.[0] ?? ''}
        </div>
      </div>

      {/* 검색 필드 */}
      <div
        style={{
          margin: '13px 22px 6px',
          background: 'var(--ios-material)',
          borderRadius: 11,
          padding: '11px 13px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="장소 검색"
          style={{ flex: 1, fontSize: 14.5, fontWeight: 400, color: 'var(--text-primary)' }}
        />
      </div>

      {/* 세그먼트 컨트롤 */}
      <div style={{ margin: '4px 22px 12px' }}>
        <SegmentedControl
          options={FILTERS}
          value={filter}
          onChange={(k) => setFilter(k as FilterKey)}
        />
      </div>

      {/* 카드 목록 / 빈 상태 */}
      <div style={{ flex: 1, padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        {places === null ? (
          <Centered>불러오는 중…</Centered>
        ) : visible.length === 0 ? (
          <EmptyState hasAny={places.length > 0} />
        ) : (
          visible.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              addedByName={memberMap[p.added_by]?.nickname}
              addedByColor={memberMap[p.added_by]?.avatar_color}
            />
          ))
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
        padding: '50px 20px',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 44 }}>🧸</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
        {hasAny ? '조건에 맞는 장소가 없어요' : '아직 모아둔 곳이 없어요'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6 }}>
        {hasAny ? '검색어나 필터를 바꿔보세요.' : '아래 ＋ 버튼으로 첫 장소를 추가해 보세요.'}
      </div>
    </div>
  );
}
