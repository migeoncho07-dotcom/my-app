'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ageLabel } from '@/lib/age';
import Button from '@/components/ui/Button';
import ScreenHeader from '@/components/ui/ScreenHeader';

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const kids = profile?.kid_birthdays ?? [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="나" />

      {/* 프로필 카드 */}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: '#fff',
            border: '1px solid var(--border-light)',
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: profile?.avatar_color || 'var(--brand)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              flex: 'none',
            }}
          >
            {profile?.nickname?.[0] ?? '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{profile?.nickname ?? '이름 없음'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {firebaseUser?.email}
            </div>
          </div>
        </div>
      </div>

      {/* 아이 정보 */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 4px 10px' }}>
          우리 아이
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: '14px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {kids.length > 0 ? kids.map((d) => ageLabel(d)).join(', ') : '아직 등록된 아이 정보가 없어요'}
        </div>
      </div>

      {/* 로그아웃 */}
      <div style={{ padding: '20px', marginTop: 'auto' }}>
        <Button variant="secondary" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
