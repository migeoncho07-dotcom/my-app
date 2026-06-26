'use client';

// 무료 오픈맵(OpenStreetMap + Leaflet) + 위치 검색 → 주변 장소 거리순 (시안 05)
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { fetchGroup, cachedGroupSync } from '@/lib/group-client';
import { searchKakao } from '@/lib/parse-client';
import { category } from '@/styles/tokens';
import type { Place, Category } from '@/types';

type FilterKey = 'all' | Category;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'kids_cafe', label: '☕ 카페' },
  { key: 'hotel', label: '🏨 호텔' },
  { key: 'outdoor', label: '🌿 야외' },
  { key: 'performance', label: '🎭 공연' },
  { key: 'restaurant', label: '🍴 음식' },
  { key: 'etc', label: '📦 기타' },
];

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const Lref = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const centerMarkerRef = useRef<any>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const visiblePlaces = useMemo(
    () => places.filter((p) => filter === 'all' || p.category === filter),
    [places, filter],
  );

  useEffect(() => {
    let alive = true;
    const c = cachedGroupSync();
    if (c) setPlaces(c.places);
    fetchGroup()
      .then((d) => alive && setPlaces(d.places))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current || mapObj.current) return;
      Lref.current = L;
      const map = L.map(mapRef.current).setView([37.5665, 126.978], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      mapObj.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, []);

  // 장소 핀
  useEffect(() => {
    const L = Lref.current;
    const map = mapObj.current;
    if (!ready || !L || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const latlngs: [number, number][] = [];
    visiblePlaces
      .filter((p) => p.lat && p.lng)
      .forEach((p) => {
        const c = category[p.category] ?? category.etc;
        // 시안 05: 물방울(teardrop) 핀 — 흰 테두리, 끝이 아래를 향함
        const icon = L.divIcon({
          className: 'airang-pin',
          html: `<div style="transform:translate(-50%,-100%);"><div style="width:34px;height:34px;border-radius:50% 50% 50% 4px;background:${c.text};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 6px 14px -4px rgba(0,0,0,.45);"><span style="transform:rotate(45deg);font-size:15px;line-height:1;">${c.emoji}</span></div></div>`,
          iconSize: [0, 0],
        });
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.on('click', () => router.push(`/place/${p.id}`));
        markersRef.current.push(m);
        latlngs.push([p.lat, p.lng]);
      });
    if (!center && latlngs.length > 0) map.fitBounds(latlngs, { padding: [50, 50], maxZoom: 15 });
  }, [visiblePlaces, ready, center, router]);

  // 검색
  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await searchKakao(q);
      if (res.length === 0) {
        setSearching(false);
        return;
      }
      const k = res[0];
      const lat = parseFloat(k.y);
      const lng = parseFloat(k.x);
      const label = k.place_name || k.address_name;
      setCenter({ lat, lng, label });
      const L = Lref.current;
      const map = mapObj.current;
      if (L && map) {
        map.setView([lat, lng], 14);
        if (centerMarkerRef.current) centerMarkerRef.current.remove();
        const icon = L.divIcon({
          className: 'airang-center',
          html: `<div style="transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#3B72DD;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,114,221,.25);"></div>`,
          iconSize: [0, 0],
        });
        centerMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  }

  // 주변 장소 (검색 위치 기준 반경 3km 이내, 거리순)
  const RADIUS_M = 3000;
  const nearby = useMemo(() => {
    if (!center) return [];
    return visiblePlaces
      .filter((p) => p.lat && p.lng)
      .map((p) => ({ p, d: distMeters(center, { lat: p.lat, lng: p.lng }) }))
      .filter((x) => x.d <= RADIUS_M)
      .sort((a, b) => a.d - b.d);
  }, [center, visiblePlaces]);

  const hasPins = places.some((p) => p.lat && p.lng);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* 디자인 시안 05: 지도는 타이틀 없이 꽉 차고, 검색창이 지도 위에 떠 있음 */}
      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0, background: '#e8eef0' }} />

        {/* 검색창 (상태바/노치 아래에 띄움) */}
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 18, right: 18, zIndex: 1000 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#fff',
              borderRadius: 13,
              padding: '11px 13px',
              boxShadow: '0 6px 18px -8px rgba(0,0,0,.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="위치 검색 (예: 잠실역, 서울숲)"
              style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--text-primary)' }}
            />
            {searching && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>…</span>}
            {center && (
              <button onClick={() => { setCenter(null); setQuery(''); if (centerMarkerRef.current) centerMarkerRef.current.remove(); }} style={{ fontSize: 16, color: 'var(--placeholder)' }} aria-label="검색 해제">×</button>
            )}
          </div>
        </div>

        {/* 카테고리 필터 칩 (시안 05) */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 62px)',
            left: 18,
            right: 0,
            zIndex: 999,
            display: 'flex',
            gap: 7,
            overflowX: 'auto',
            paddingRight: 18,
            scrollbarWidth: 'none',
          }}
        >
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  flex: 'none',
                  whiteSpace: 'nowrap',
                  borderRadius: 10,
                  padding: on ? '7px 13px' : '7px 12px',
                  fontSize: 12,
                  fontWeight: on ? 600 : 500,
                  color: on ? '#fff' : '#636366',
                  background: on ? '#1D1D1F' : '#fff',
                  border: on ? 'none' : '1px solid #E5E5EA',
                  boxShadow: '0 4px 10px -6px rgba(0,0,0,.3)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {ready && !hasPins && !center && (
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              top: 'calc(env(safe-area-inset-top, 0px) + 110px)',
              background: 'rgba(255,255,255,.92)',
              borderRadius: 12,
              padding: '10px 14px',
              textAlign: 'center',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              zIndex: 999,
            }}
          >
            📍 주소가 있는 장소를 추가하면 핀으로 보여요
          </div>
        )}

        {/* 주변 장소 하단 시트 */}
        {center && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '46%',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 24px -10px rgba(0,0,0,.3)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '12px 18px 6px' }}>
              <div style={{ width: 42, height: 5, borderRadius: 2.5, background: '#E0E0E5', margin: '0 auto 12px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  이 주변 <span style={{ color: 'var(--brand)' }}>{nearby.length}곳</span>
                </div>
                <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500 }}>가까운 순</div>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {nearby.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, padding: '12px 4px' }}>
                  주변에 등록된 장소가 없어요.
                </div>
              ) : (
                nearby.map(({ p, d }) => {
                  const c = category[p.category] ?? category.etc;
                  return (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/place/${p.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', padding: '9px 4px', borderBottom: '1px solid #EFEFF4' }}
                    >
                      <div style={{ width: 50, height: 50, borderRadius: 12, flex: 'none', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {c.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2, fontWeight: 500 }}>
                          {[c.label, p.age_target, fmtDist(d)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" style={{ flex: 'none' }}>
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
