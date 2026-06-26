'use client';

// 글래스 탭바 — 홈/지도/＋/멤버/나. 중앙 ＋는 브랜드색 라운드 버튼.
import { usePathname, useRouter } from 'next/navigation';

type TabKey = 'home' | 'map' | 'members' | 'profile';

function TabIcon({ name, active }: { name: TabKey; active: boolean }) {
  const color = active ? 'var(--brand)' : 'var(--text-tertiary)';
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      // 선택 시 채운 집 아이콘 (시안 02)
      return active ? (
        <svg width={23} height={23} viewBox="0 0 24 24" fill="var(--brand)" stroke="none">
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
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case 'members':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M16 3.5a3 3 0 0 1 0 5.8M21 20c0-2.6-1.6-4.8-3.9-5.6" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
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
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        zIndex: 50,
        background: 'rgba(248,248,250,.8)',
        backdropFilter: 'saturate(180%) blur(22px)',
        WebkitBackdropFilter: 'saturate(180%) blur(22px)',
        borderTop: '0.5px solid rgba(0,0,0,.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '10px 10px calc(14px + env(safe-area-inset-bottom))',
      }}
    >
      {/* 홈 · 지도 */}
      {tabs.slice(0, 2).map((t) => (
        <TabButton key={t.key} name={t.key} label={t.label} active={isActive(t.path)} onClick={() => router.push(t.path)} />
      ))}

      {/* 중앙 ＋ */}
      <button
        onClick={() => router.push('/add')}
        aria-label="장소 추가"
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--brand)',
          color: '#fff',
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          marginTop: -18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        ＋
      </button>

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
        gap: 3,
        padding: '5px 0',
      }}
    >
      <div
        style={{
          padding: '3px 14px',
          borderRadius: 9999,
          background: active ? '#FFE3DA' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background .15s',
        }}
      >
        <TabIcon name={name} active={active} />
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? 'var(--brand)' : 'var(--text-tertiary)' }}>
        {label}
      </span>
    </button>
  );
}
