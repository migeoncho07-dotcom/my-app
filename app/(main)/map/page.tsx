'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribePlaces } from '@/lib/firestore';
import { category } from '@/styles/tokens';
import CategoryBadge from '@/components/ui/CategoryBadge';
import type { Place } from '@/types';

declare global {
  interface Window {
    kakao: any;
  }
}

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

// 카카오맵 SDK 스크립트를 한 번만 로드
function loadKakaoSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!JS_KEY) return reject(new Error('no-key'));
    if (window.kakao && window.kakao.maps) return resolve(window.kakao);
    const existing = document.getElementById('kakao-sdk') as HTMLScriptElement | null;
    const onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    if (existing) {
      existing.addEventListener('load', onload);
      return;
    }
    const s = document.createElement('script');
    s.id = 'kakao-sdk';
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false`;
    s.async = true;
    s.onload = onload;
    s.onerror = () => reject(new Error('load-failed'));
    document.head.appendChild(s);
  });
}

export default function MapPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMap = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [status, setStatus] = useState<'init' | 'ready' | 'nokey' | 'error'>('init');

  // 장소 구독
  useEffect(() => {
    if (!groupId) return;
    return subscribePlaces(groupId, setPlaces);
  }, [groupId]);

  // 지도 초기화
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return;
        kakaoMap.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978), // 서울 기본
          level: 8,
        });
        setStatus('ready');
      })
      .catch((e) => setStatus(e.message === 'no-key' ? 'nokey' : 'error'));
    return () => {
      cancelled = true;
    };
  }, []);

  // 마커 갱신
  useEffect(() => {
    const kakao = window.kakao;
    if (status !== 'ready' || !kakao || !kakaoMap.current) return;
    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const withCoord = places.filter((p) => p.lat && p.lng);
    const bounds = new kakao.maps.LatLngBounds();

    withCoord.forEach((p) => {
      const c = category[p.category] ?? category.etc;
      const el = document.createElement('div');
      el.style.cssText = `transform:translate(-50%,-100%);cursor:pointer;display:flex;flex-direction:column;align-items:center;`;
      el.innerHTML = `<div style="background:${c.text};color:#fff;border-radius:14px 14px 14px 2px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 4px 10px -3px rgba(0,0,0,.4);">${c.emoji}</div>`;
      el.onclick = () => setSelected(p);
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      const overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1 });
      overlay.setMap(kakaoMap.current);
      overlaysRef.current.push(overlay);
      bounds.extend(pos);
    });

    if (withCoord.length > 0) kakaoMap.current.setBounds(bounds);
  }, [places, status]);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 20px 12px', fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>지도</div>

      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {status === 'nokey' && (
          <Overlay emoji="🗺️" title="지도 키 설정이 필요해요" desc={'카카오 JavaScript 키를 넣으면\n장소들이 지도에 표시돼요.'} />
        )}
        {status === 'error' && (
          <Overlay emoji="⚠️" title="지도를 불러오지 못했어요" desc={'잠시 후 다시 시도해 주세요.'} />
        )}
        {status === 'ready' && places.filter((p) => p.lat && p.lng).length === 0 && (
          <Overlay emoji="📍" title="지도에 표시할 장소가 없어요" desc={'주소가 있는 장소를 추가하면\n여기 핀으로 보여요.'} />
        )}

        {/* 선택된 장소 미니 카드 */}
        {selected && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
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
              style={{ position: 'absolute', top: -10, right: -6, width: 26, height: 26, borderRadius: '50%', background: 'var(--text-tertiary)', color: '#fff', fontSize: 14, fontWeight: 700 }}
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

function Overlay({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ fontSize: 44 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{desc}</div>
    </div>
  );
}
