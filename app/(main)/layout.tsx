'use client';

// 메인(로그인 후) 공통 레이아웃 — 하단 글래스 탭바 포함.
// 로그인 안 했으면 로그인으로, '진짜' 프로필 미완이면 가입 이어서 보냄.
// 프로필 '읽기 실패'(네트워크)면 가입으로 보내지 않고 다시 시도 화면을 보여줌.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import GlassTabBar from '@/components/ui/GlassTabBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, profile, loading, profileError, profileErrorMsg } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) router.replace('/login');
    // 프로필이 '없음'이면서 '읽기 실패가 아닌' 경우에만 가입으로 (신규 사용자)
    else if (!profile && !profileError) router.replace('/signup');
  }, [firebaseUser, profile, loading, profileError, router]);

  // 읽기 실패: 가입으로 보내지 않고 다시 시도 안내 (기존 데이터 보호)
  if (!loading && firebaseUser && !profile && profileError) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>📡</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>연결이 지연되고 있어요</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6 }}>
          네트워크 상태를 확인하고<br />다시 시도해 주세요.
        </div>
        {profileErrorMsg && (
          <div style={{ fontSize: 11, color: 'var(--brand-strong)', fontWeight: 600, background: 'var(--bg-card)', borderRadius: 10, padding: '8px 12px', maxWidth: 320, wordBreak: 'break-all', lineHeight: 1.5 }}>
            오류: {profileErrorMsg}
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 6, background: 'var(--brand)', color: '#fff', borderRadius: 14, padding: '12px 22px', fontSize: 14, fontWeight: 700 }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 인증/프로필 확인 중 / 비로그인 상태면 내용 감추기
  if (loading || !firebaseUser || !profile) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 콘텐츠 영역(이 안에서만 스크롤) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {/* 탭바는 레이아웃에 포함(고정 떠있기 아님) → 콘텐츠 위로 절대 안 겹침 */}
      <GlassTabBar />
    </div>
  );
}
