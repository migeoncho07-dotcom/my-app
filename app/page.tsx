'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Splash from '@/components/ui/Splash';

// 앱 진입점: 로그인 상태를 확인해서 알맞은 화면으로 보냅니다.
export default function RootPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(firebaseUser ? '/home' : '/login');
  }, [firebaseUser, loading, router]);

  // 확인하는 동안 보여줄 스플래시 (디자인: 코랄 그라데이션 + 로고)
  return <Splash subtitle="아이와 함께하는 모든 장소" />;
}
