'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// 앱 진입점: 로그인 상태를 확인해서 알맞은 화면으로 보냅니다.
export default function RootPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(firebaseUser ? '/home' : '/login');
  }, [firebaseUser, loading, router]);

  // 확인하는 동안 보여줄 간단한 스플래시
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand)' }}>
        아이랑
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
        불러오는 중…
      </div>
    </div>
  );
}
