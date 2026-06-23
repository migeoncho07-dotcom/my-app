'use client';

// 메인(로그인 후) 공통 레이아웃 — 하단 글래스 탭바 포함.
// 로그인 안 했으면 로그인으로, 프로필 미완이면 가입 이어서 보냄.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import GlassTabBar from '@/components/ui/GlassTabBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) router.replace('/login');
    else if (!profile) router.replace('/signup');
  }, [firebaseUser, profile, loading, router]);

  // 인증 확인 중 / 비로그인 상태면 내용 감추기
  if (loading || !firebaseUser || !profile) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 86 }}>
        {children}
      </div>
      <GlassTabBar />
    </>
  );
}
