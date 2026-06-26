'use client';

// 전체 후기 화면 — 평점 요약 + 별점 필터 + 정렬 + 후기 목록
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchPlaceApi } from '@/lib/group-client';
import { computeAggregate, fmtAvg } from '@/lib/ratings';
import Stars from '@/components/ui/Stars';
import { ReviewItem } from '@/components/place/Ratings';
import type { Place, Rating } from '@/types';

type Sort = 'recent' | 'high' | 'low';
const SORT_LABEL: Record<Sort, string> = { recent: '최신순', high: '별점 높은 순', low: '별점 낮은 순' };

export default function ReviewsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { loading } = useAuth();

  const [place, setPlace] = useState<Place | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ready, setReady] = useState(false);
  const [starFilter, setStarFilter] = useState(0); // 0 = 전체
  const [sort, setSort] = useState<Sort>('recent');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    let alive = true;
    (async () => {
      try {
        const { place: p, ratings: rs } = await fetchPlaceApi(id);
        if (!alive) return;
        setPlace(p);
        setRatings(rs);
      } catch {
        /* 무시 */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, loading]);

  const agg = useMemo(() => computeAggregate(ratings), [ratings]);

  const list = useMemo(() => {
    const f = ratings.filter((r) => starFilter === 0 || r.score === starFilter);
    const sorted = [...f];
    if (sort === 'recent') sorted.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    else if (sort === 'high') sorted.sort((a, b) => b.score - a.score || (b.created_at ?? 0) - (a.created_at ?? 0));
    else sorted.sort((a, b) => a.score - b.score || (b.created_at ?? 0) - (a.created_at ?? 0));
    return sorted;
  }, [ratings, starFilter, sort]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 헤더 */}
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} aria-label="뒤로" style={{ width: 40, height: 40, borderRadius: 12, flex: 'none', background: '#fff', border: '1px solid #E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M11 5l-7 7 7 7" /></svg>
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}>전체 후기</div>
          <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500 }}>{place?.title ? `${place.title} · ${agg.count}개` : ''}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        {/* 요약 카드 (컴팩트) */}
        {agg.count > 0 && (
          <div style={{ background: '#fff', border: '1px solid #ECECF0', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtAvg(agg.avg)}</div>
            <div>
              <Stars value={agg.avg ?? 0} size={15} />
              <div style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500, marginTop: 3 }}>{agg.count}명 참여</div>
            </div>
          </div>
        )}

        {/* 필터칩 + 정렬 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[0, 5, 4, 3, 2, 1].map((s) => {
              const on = starFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStarFilter(s)}
                  style={{ flex: 'none', borderRadius: 13, padding: '7px 13px', fontSize: 12.5, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap', background: on ? '#FF6B4A' : '#fff', color: on ? '#fff' : '#444', border: on ? 'none' : '1px solid #E2E2E6' }}
                >
                  {s === 0 ? '전체' : `${s}점`}
                </button>
              );
            })}
          </div>

          {/* 정렬 컨텍스트 메뉴 */}
          <div style={{ position: 'relative', flex: 'none' }}>
            <button onClick={() => setMenuOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F5F7', border: 'none', borderRadius: 10, padding: '7px 11px', fontSize: 12.5, fontWeight: 700, color: '#1D1D1F', whiteSpace: 'nowrap' }}>
              {SORT_LABEL[sort]}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 11, background: '#fff', borderRadius: 13, boxShadow: '0 8px 32px -8px rgba(0,0,0,.22)', overflow: 'hidden', minWidth: 130 }}>
                  {(['recent', 'high', 'low'] as Sort[]).map((s) => {
                    const on = sort === s;
                    return (
                      <button key={s} onClick={() => { setSort(s); setMenuOpen(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', fontSize: 13, fontWeight: on ? 700 : 500, background: on ? '#FFF3EE' : '#fff', color: on ? '#E85C2E' : '#1D1D1F', border: 'none' }}>
                        {SORT_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 후기 목록 */}
        {!ready ? (
          <div style={{ textAlign: 'center', color: '#AEAEB2', fontSize: 13, fontWeight: 500, padding: '40px 0' }}>불러오는 중…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#AEAEB2', fontSize: 13, fontWeight: 500, padding: '40px 0' }}>
            {agg.count === 0 ? '아직 후기가 없어요.' : '해당 별점의 후기가 없어요.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((r) => (
              <ReviewItem key={r.id} r={r} clamp />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
