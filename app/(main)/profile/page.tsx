'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ageLabel } from '@/lib/age';
import { fetchGroup, cachedGroupSync } from '@/lib/group-client';
import { createInviteCode } from '@/lib/invite-client';
import Button from '@/components/ui/Button';
import ScreenHeader from '@/components/ui/ScreenHeader';
import type { Place } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, profile, signOut } = useAuth();
  const uid = firebaseUser?.uid;

  const [places, setPlaces] = useState<Place[]>([]);

  // 친구 초대 (코드 생성/표시)
  const [code, setCode] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    let alive = true;
    const c = cachedGroupSync();
    if (c) setPlaces(c.places);
    fetchGroup()
      .then((d) => alive && setPlaces(d.places))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function handleInvite() {
    setInviteError('');
    setCopied(false);
    setInviting(true);
    try {
      const res = await createInviteCode();
      setCode(res.code);
    } catch (e: any) {
      setInviteError(e?.message || '초대 코드 생성에 실패했어요.');
    } finally {
      setInviting(false);
    }
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 무시 */
    }
  }
  async function shareCode() {
    const text = `놀잇터 초대 코드: ${code}\n앱에서 이 코드로 가입하면 우리 그룹에 합류해요. (48시간 후 만료 · 1회용)`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: '놀잇터 초대', text });
      } else {
        await copyCode();
      }
    } catch {
      /* 무시 */
    }
  }

  const stats = useMemo(() => {
    const saved = places.filter((p) => p.added_by === uid).length;
    const visited = places.filter((p) => uid && p.rated_by?.includes(uid)).length;
    return { saved, visited, reviews: visited };
  }, [places, uid]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const kids = profile?.kid_birthdays ?? [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="나" />

      {/* 프로필 카드 */}
      <div style={{ padding: '20px 20px 0' }}>
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
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: profile?.avatar_color || 'var(--brand)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              flex: 'none',
              boxShadow: '0 0 0 3px #fff, 0 0 0 5px var(--brand)',
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

      {/* 활동 요약 */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: '16px 0' }}>
          <Stat n={stats.saved} label="저장한 곳" />
          <Divider />
          <Stat n={stats.visited} label="다녀온 곳" />
          <Divider />
          <Stat n={stats.reviews} label="남긴 평점" />
        </div>
      </div>

      {/* 친구 초대하기 */}
      <div style={{ padding: '14px 20px 0' }}>
        {code ? (
          <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 18, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 12 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              48시간 후 만료 · 1회 사용 가능
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ flex: 1, aspectRatio: '1', background: '#FFF3EE', border: '1.5px solid #FFD0BE', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: '#E85C2E' }}>
                  {code[i] ?? ''}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <Button onClick={shareCode}>공유하기</Button>
              <Button variant="secondary" onClick={copyCode}>{copied ? '복사됐어요 ✓' : '코드 복사'}</Button>
            </div>
            <button onClick={handleInvite} disabled={inviting} style={{ width: '100%', marginTop: 10, background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 16, padding: 15, fontSize: 14.5, fontWeight: 700 }}>
              {inviting ? '생성 중…' : '＋ 새 코드 만들기'}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleInvite}
              disabled={inviting}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, boxShadow: '0 14px 30px -12px rgba(255,107,74,.6)', opacity: inviting ? 0.6 : 1 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              </svg>
              {inviting ? '코드 만드는 중…' : '친구 초대하기'}
            </button>
            {inviteError && (
              <div style={{ color: 'var(--brand-strong)', fontSize: 12.5, fontWeight: 600, textAlign: 'center', marginTop: 10 }}>{inviteError}</div>
            )}
          </>
        )}
      </div>

      {/* 아이 정보 */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 4px 10px' }}>우리 아이</div>
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

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#1D1D1F' }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: 'var(--border-light)', alignSelf: 'stretch', margin: '2px 0' }} />;
}
