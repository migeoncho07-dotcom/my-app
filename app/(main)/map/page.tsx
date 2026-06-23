'use client';

// 무료 오픈맵(OpenStreetMap + Leaflet). 카카오 비즈월렛/키 불필요.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { fetchGroup } from '@/lib/group-client';
import { category } from '@/styles/tokens';
import CategoryBadge from '@/components/ui/CategoryBadge';
import type { Place } from '@/types';

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const Lref = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [ready, setReady] = useState(false);

  // 그룹 장소 가져오기
  useEffect(() => {
    let alive = true;
    fetchGroup()
      .then((d) => {
        if (alive) setPlaces(d.places);
      })
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
      const map = L.map(mapRef.current).setView([37.5665, 126.978], 11); // 서울 기본
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

  // 마커 갱신
  useEffect(() => {
    const L = Lref.current;
    const map = mapObj.current;
    if (!ready || !L || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const withCoord = places.filter((p) => p.lat && p.lng);
    const latlngs: [number, number][] = [];
    withCoord.forEach((p) => {
      const c = category[p.category] ?? category.etc;
      const icon = L.divIcon({
        className: 'airang-pin',
        html: `<div style="transform:translate(-50%,-100%);background:${c.text};color:#fff;border-radius:14px 14px 14px 2px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 4px 10px -3px rgba(0,0,0,.4);">${c.emoji}</div>`,
        iconSize: [0, 0],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
      m.on('click', () => setSelected(p));
      markersRef.current.push(m);
      latlngs.push([p.lat, p.lng]);
    });
    if (latlngs.length > 0) {
      map.fitBounds(latlngs, { padding: [50, 50], maxZoom: 15 });
    }
  }, [places, ready]);

  const hasPins = places.some((p) => p.lat && p.lng);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 20px 12px', fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>지도</div>

      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0, background: '#e8eef0' }} />

        {ready && !hasPins && (
          <div
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: 16,
              background: 'rgba(255,255,255,.92)',
              borderRadius: 14,
              padding: '12px 14px',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              boxShadow: '0 6px 16px -8px rgba(0,0,0,.3)',
            }}
          >
            📍 주소가 있는 장소를 추가하면 여기 핀으로 보여요
          </div>
        )}

        {selected && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 1000 }}>
            <button
              onClick={() => router.push(`/place/${selected.id}`)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: '#fff',
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 10px 30px -10px rgba(0,0,0,.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <CategoryBadge type={selected.category} />
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.title}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {selected.address || selected.region}
                </div>
              </div>
              <span style={{ fontSize: 20, color: 'var(--placeholder)' }}>›</span>
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: -10, right: -6, width: 26, height: 26, borderRadius: '50%', background: 'var(--text-tertiary)', color: '#fff', fontSize: 14, fontWeight: 700, zIndex: 1001 }}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
