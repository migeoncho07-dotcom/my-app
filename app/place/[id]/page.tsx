'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchPlaceApi, updatePlaceApi, deletePlaceApi, cachedGroupSync } from '@/lib/group-client';
import { searchKakao } from '@/lib/parse-client';
import { category } from '@/styles/tokens';
import { timeAgo } from '@/lib/age';
import CategoryBadge from '@/components/ui/CategoryBadge';
import CategoryIcon from '@/components/ui/CategoryIcon';
import RatingSection from '@/components/place/Ratings';
import type { Place, Category, KakaoPlace, Rating } from '@/types';

const CATS = Object.keys(category) as Category[];

const iconBox: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
};

interface Draft {
  title: string;
  category: Category;
  region: string;
  address: string;
  lat: number;
  lng: number;
  date_range: string;
  age_target: string;
  memo: string;
  kakao_place_id: string;
}

export default function PlaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { loading, firebaseUser } = useAuth();

  const [place, setPlace] = useState<Place | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [addedByName, setAddedByName] = useState('');
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myRating, setMyRating] = useState<Rating | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 평점 등록/수정 후 다시 불러오기
  async function refresh() {
    try {
      const { place: p, addedByName: name, ratings: rs, myRating: mine } = await fetchPlaceApi(id);
      if (!p) return;
      setPlace(p);
      setAddedByName(name);
      setRatings(rs);
      setMyRating(mine);
    } catch {
      /* 무시 */
    }
  }

  useEffect(() => {
    if (loading) return;
    let alive = true;

    // 1) 이미 받아둔 목록 캐시에서 즉시 표시 (로딩 없이 바로 뜸)
    const cached = cachedGroupSync();
    if (cached) {
      const p = cached.places.find((x) => x.id === id);
      if (p) {
        setPlace(p);
        const m = cached.members.find((mm) => mm.uid === p.added_by);
        setAddedByName(m?.nickname || '');
        setState('ready');
      }
    }

    // 2) 서버에서 최신 정보(평점 포함)로 갱신
    (async () => {
      try {
        const { place: p, addedByName: name, ratings: rs, myRating: mine } = await fetchPlaceApi(id);
        if (!alive) return;
        if (!p) {
          // 캐시에 이미 떠 있으면 유지, 아니면 없음 처리
          setState((s) => (s === 'ready' ? s : 'notfound'));
          return;
        }
        setPlace(p);
        setAddedByName(name);
        setRatings(rs);
        setMyRating(mine);
        setState('ready');
      } catch {
        if (alive) setState((s) => (s === 'ready' ? s : 'notfound'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, loading]);

  function startEdit() {
    if (!place) return;
    setDraft({
      title: place.title,
      category: place.category,
      region: place.region,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      date_range: place.date_range,
      age_target: place.age_target,
      memo: place.memo,
      kakao_place_id: place.kakao_place_id,
    });
    setEditing(true);
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      await updatePlaceApi(id, draft as unknown as Record<string, unknown>);
      setPlace((prev) => (prev ? { ...prev, ...draft } : prev));
      setEditing(false);
    } catch {
      /* keep editing */
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('이 장소를 삭제할까요?')) return;
    setDeleting(true);
    try {
      await deletePlaceApi(id);
      router.replace('/home');
    } catch {
      setDeleting(false);
      alert('등록한 사람만 삭제할 수 있어요.');
    }
  }

  async function shareIt() {
    if (!place) return;
    const text = `${place.title}${place.address ? '\n' + place.address : ''}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: place.title, text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert('장소 정보를 복사했어요');
      }
    } catch {
      /* 사용자 취소 등 무시 */
    }
  }

  if (state === 'loading') return <Centered>불러오는 중…</Centered>;
  if (state === 'notfound' || !place) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '56px 20px' }}>
        <button onClick={() => router.back()} style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand)', alignSelf: 'flex-start' }}>← 뒤로</button>
        <Centered>장소를 찾을 수 없어요.</Centered>
      </div>
    );
  }

  const hasCoord = place.lat && place.lng;
  // 티맵 앱 호출 — 길찾기는 좌표로 경로안내, 지도보기는 주소로 검색
  const tName = encodeURIComponent(place.title);
  const tQuery = encodeURIComponent(place.address || place.title);
  const routePath = hasCoord ? 'route' : 'search';
  const routeQuery = hasCoord
    ? `goalname=${tName}&goalx=${place.lng}&goaly=${place.lat}`
    : `name=${tQuery}`;
  const viewQuery = `name=${tQuery}`;

  // 티맵 앱 열기. 안드로이드는 intent://로 앱을 확실히 띄우고(미설치 시 플레이스토어),
  // 그 외(iOS 등)는 tmap:// 스킴으로 앱 실행.
  function openTmap(path: string, query: string) {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (/Android/i.test(ua)) {
      const fb = encodeURIComponent('https://play.google.com/store/apps/details?id=com.skt.tmap.ku');
      window.location.href = `intent://${path}?${query}#Intent;scheme=tmap;package=com.skt.tmap.ku;S.browser_fallback_url=${fb};end`;
    } else {
      window.location.href = `tmap://${path}?${query}`;
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 상단 헤더바 (시안 04): 뒤로 박스 · 타이틀 · 공유/편집 박스 */}
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => (editing ? setEditing(false) : router.back())} aria-label={editing ? '취소' : '뒤로'}
          style={iconBox}>
          {editing ? (
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-secondary)' }}>✕</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M11 5l-7 7 7 7" /></svg>
          )}
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}>{editing ? '편집' : '장소 상세'}</div>
        {!editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={shareIt} aria-label="공유" style={iconBox}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
              </svg>
            </button>
            <button onClick={startEdit} aria-label="수정" style={iconBox}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={save} disabled={saving} style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', padding: '8px 4px' }}>
            {saving ? '저장 중…' : '완료'}
          </button>
        )}
      </div>

      {!editing ? (
        /* ── 보기 (시안 04) ── */
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>
            <CategoryBadge type={place.category} size="md" />
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', margin: '11px 0 14px', lineHeight: 1.25 }}>{place.title}</div>

            {/* 정보 카드 — 아이콘 행 */}
            <div style={{ background: '#fff', border: '1px solid #ECECF0', borderRadius: 14, padding: '4px 16px', boxShadow: '0 6px 20px -16px rgba(0,0,0,.5)' }}>
              <IconRow icon={<PinIcon />} main={place.address || '주소 미입력'} sub={place.region || undefined} />
              <IconRow icon={<CalIcon />} main={place.date_range || '상시 운영'} divider />
              {place.age_target && (
                <IconRow icon={<PersonIcon />} main={<>대상 연령 <span style={{ color: '#1F9E57' }}>{place.age_target}</span></>} divider />
              )}
            </div>

            {/* 메모 카드 */}
            {place.memo && (
              <div style={{ background: '#FFF3EE', borderRadius: 13, padding: 15, marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E85C2E', marginBottom: 7 }}>메모</div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#5b544a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{place.memo}</div>
              </div>
            )}

            {/* 등록자 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 2px 0' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', background: '#FFD9CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                {addedByName?.[0] ?? ''}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{addedByName || '멤버'}님이 등록</div>
                {place.added_at && <div style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500, marginTop: 1 }}>{timeAgo(place.added_at as any)}</div>}
              </div>
            </div>

            {/* 평점·후기 섹션 */}
            <RatingSection
              placeId={id}
              placeName={place.title}
              ratings={ratings}
              myRating={myRating}
              onChanged={refresh}
            />

            <div style={{ height: 8 }} />
          </div>

          <div style={{ padding: '14px 22px 26px', display: 'flex', gap: 9 }}>
            <button onClick={() => openTmap('search', viewQuery)} style={{ ...btnStyle(false), flex: 1 }}>지도에서 보기</button>
            <button onClick={() => openTmap(routePath, routeQuery)} style={{ ...btnStyle(true), flex: 1 }}>길찾기</button>
          </div>
        </>
      ) : (
        /* ── 편집 ── */
        draft && (
          <EditForm
            draft={draft}
            setDraft={setDraft as (d: Draft) => void}
            onDelete={remove}
            deleting={deleting}
            isOwner={firebaseUser?.uid === place.added_by}
          />
        )
      )}
    </div>
  );
}

function EditForm({
  draft,
  setDraft,
  onDelete,
  deleting,
  isOwner,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onDelete: () => void;
  deleting: boolean;
  isOwner: boolean;
}) {
  const [candidates, setCandidates] = useState<KakaoPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const up = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  async function findAddr() {
    setSearching(true);
    try {
      setCandidates(await searchKakao(draft.title, draft.region));
    } catch {
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }
  function pick(k: KakaoPlace) {
    up({ address: k.road_address_name || k.address_name, lat: parseFloat(k.y) || 0, lng: parseFloat(k.x) || 0, kakao_place_id: k.id });
    setCandidates(null);
  }

  const f: React.CSSProperties = { width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px', fontSize: 14.5, fontWeight: 500 };

  return (
    <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="이름">
        <input value={draft.title} onChange={(e) => up({ title: e.target.value })} style={f} />
      </Field>
      <Field label="카테고리">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATS.map((c) => {
            const on = draft.category === c;
            return (
              <button key={c} onClick={() => up({ category: c })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, background: on ? category[c].bg : 'var(--ios-material)', color: on ? category[c].text : 'var(--text-tertiary)' }}>
                <CategoryIcon type={c} size={12} /> {category[c].label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="지역">
        <input value={draft.region} onChange={(e) => up({ region: e.target.value })} placeholder="예: 서울 강남" style={f} />
      </Field>
      <Field label="주소">
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={draft.address} onChange={(e) => up({ address: e.target.value })} placeholder="주소" style={{ ...f, flex: 1 }} />
          <button onClick={findAddr} disabled={searching} style={{ flex: 'none', borderRadius: 12, padding: '0 13px', fontSize: 13, fontWeight: 700, background: 'var(--ios-material)', color: 'var(--text-secondary)' }}>
            {searching ? '…' : '📍 찾기'}
          </button>
        </div>
        {candidates && (
          <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {candidates.length === 0 ? (
              <div style={{ padding: 10, fontSize: 12.5, color: 'var(--text-tertiary)' }}>검색 결과가 없어요.</div>
            ) : (
              candidates.map((k) => (
                <button key={k.id} onClick={() => pick(k)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', borderBottom: '1px solid var(--border-light)', background: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{k.place_name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{k.road_address_name || k.address_name}</div>
                </button>
              ))
            )}
          </div>
        )}
      </Field>
      <Field label="대상연령">
        <input value={draft.age_target} onChange={(e) => up({ age_target: e.target.value })} placeholder="예: 3~7세" style={f} />
      </Field>
      <Field label="운영기간">
        <input value={draft.date_range} onChange={(e) => up({ date_range: e.target.value })} placeholder="예: 2025.07.01~07.31" style={f} />
      </Field>
      <Field label="메모">
        <textarea value={draft.memo} onChange={(e) => up({ memo: e.target.value })} style={{ ...f, minHeight: 64, resize: 'vertical' }} />
      </Field>

      {isOwner ? (
        <button onClick={onDelete} disabled={deleting} style={{ marginTop: 6, marginBottom: 8, fontSize: 14, fontWeight: 700, color: 'var(--brand-strong)', padding: 12 }}>
          {deleting ? '삭제 중…' : '🗑️ 이 장소 삭제'}
        </button>
      ) : (
        <div style={{ marginTop: 6, marginBottom: 8, fontSize: 12.5, fontWeight: 500, color: 'var(--text-tertiary)', textAlign: 'center', padding: 12, lineHeight: 1.5 }}>
          삭제는 등록한 사람만 할 수 있어요.<br />수정 내용은 등록자에게 알림이 가요.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 2px 7px' }}>{label}</div>
      {children}
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    textAlign: 'center',
    borderRadius: 14,
    padding: '16px',
    fontSize: 14,
    fontWeight: primary ? 700 : 600,
    ...(primary
      ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 14px 30px -12px rgba(255,107,74,.6)' }
      : { background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border)' }),
  };
}

function IconRow({ icon, main, sub, divider }: { icon: React.ReactNode; main: React.ReactNode; sub?: string; divider?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: divider ? '1px solid #f5efe6' : 'none' }}>
      <div style={{ flex: 'none' }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', lineHeight: 1.4, wordBreak: 'break-all' }}>{main}</div>
        {sub && <div style={{ fontSize: 11.5, color: '#8E8E93', fontWeight: 500, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
function PinIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FF6B4A" strokeWidth="2"><path d="M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>;
}
function CalIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3B72DD" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
}
function PersonIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1F9E57" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500 }}>
      {children}
    </div>
  );
}
