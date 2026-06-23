'use client';

// Phase 1 임시 홈 — 로그인이 끝까지 동작하는지 확인용.
// Phase 2에서 진짜 홈(검색/필터/장소 카드 목록)으로 교체합니다.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ageLabel } from '@/lib/age';
import Button from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const { firebaseUser, profile, loading, signOut } = useAuth();

  // 로그인 안 했으면 로그인으로, 계정만 있고 프로필 미완이면 가입 이어서
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/login');
    } else if (!profile) {
      router.replace('/signup');
    }
  }, [firebaseUser, profile, loading, router]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  if (loading || !firebaseUser) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: '64px 24px 32px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>
        안녕하세요{profile?.nickname ? `, ${profile.nickname}님` : ''} 👋
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 10, lineHeight: 1.6 }}>
        로그인이 정상 동작해요!<br />
        다음 단계(Phase 2)에서 여기에 장소 목록·검색·필터를 만들 거예요.
      </div>

      <div
        style={{
          marginTop: 28,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: 18,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontWeight: 500,
          lineHeight: 1.7,
        }}
      >
        <div><b style={{ color: 'var(--text-primary)' }}>이메일</b> · {firebaseUser.email}</div>
        <div><b style={{ color: 'var(--text-primary)' }}>그룹 ID</b> · {profile?.group_id ?? '(프로필 없음)'}</div>
        <div><b style={{ color: 'var(--text-primary)' }}>아이</b> · {profile?.kid_birthdays?.length ? profile.kid_birthdays.map((d) => ageLabel(d)).join(', ') : '미입력'}</div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 28 }}>
        <Button variant="secondary" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
