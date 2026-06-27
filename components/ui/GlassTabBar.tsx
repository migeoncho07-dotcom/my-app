'use client';

// 글래스 탭바 — 홈/지도/＋/멤버/나. 중앙 ＋는 브랜드색 라운드 버튼.
import { usePathname, useRouter } from 'next/navigation';

type TabKey = 'home' | 'map' | 'members' | 'profile';

function TabIcon({ name, active }: { name: TabKey; active: boolean }) {
  // 디자인 원본: 비활성 #C7C7CC / 굵기 1.8 / 23px, 활성은 브랜드색
  const common = {
    width: 23,
    height: 23,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: active ? 'var(--brand)' : '#C7C7CC',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      // 선택 시 채운 집 아이콘 (원본 22px)
      return active ? (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="var(--brand)" stroke="none">
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </svg>
      );
    case 'members':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M15.5 14c2.5 0 4.5 1.7 4.5 4.2" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
        </svg>
      );
  }
}

export default function GlassTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs: { key: TabKey; label: string; path: string }[] = [
    { key: 'home', label: '홈', path: '/home' },
    { key: 'map', label: '지도', path: '/map' },
    { key: 'members', label: '멤버', path: '/members' },
    { key: 'profile', label: '나', path: '/profile' },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav
      style={{
        flexShrink: 0,
        width: '100%',
        background: '#fff',
        borderTop: '1px solid #EDEDF0',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 6px calc(16px + env(safe-area-inset-bottom))',
      }}
    >
      {/* 홈 · 지도 */}
      {tabs.slice(0, 2).map((t) => (
        <TabButton key={t.key} name={t.key} label={t.label} active={isActive(t.path)} onClick={() => router.push(t.path)} />
      ))}

      {/* 중앙 ＋ — 동일 너비 칸 안에 가운데 정렬(좌우 메뉴 선택해도 안 움직임) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => router.push('/add')}
          aria-label="장소 추가"
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'var(--brand)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            boxShadow: '0 8px 18px -6px rgba(255,107,74,.6)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* 멤버 · 나 */}
      {tabs.slice(2).map((t) => (
        <TabButton key={t.key} name={t.key} label={t.label} active={isActive(t.path)} onClick={() => router.push(t.path)} />
      ))}
    </nav>
  );
}

function TabButton({
  name,
  label,
  active,
  onClick,
}: {
  name: TabKey;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: active ? 4 : 5,
        background: 'none',
        border: 'none',
        padding: '0 6px',
      }}
    >
      {active ? (
        // 활성: 연한 브랜드 알약 배경 (원본)
        <div style={{ background: '#FFE3DA', borderRadius: 14, padding: '3px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TabIcon name={name} active />
        </div>
      ) : (
        <TabIcon name={name} active={false} />
      )}
      <span style={{ fontSize: active ? 10.5 : 10, fontWeight: active ? 700 : 500, color: active ? 'var(--brand)' : '#8E8E93' }}>
        {label}
      </span>
    </button>
  );
}
