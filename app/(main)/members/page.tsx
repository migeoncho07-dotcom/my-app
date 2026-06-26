'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchGroup, cachedGroupSync } from '@/lib/group-client';
import { createInviteCode } from '@/lib/invite-client';
import Button from '@/components/ui/Button';
import ScreenHeader from '@/components/ui/ScreenHeader';
import type { Member } from '@/types';

export default function MembersPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;
  const [members, setMembers] = useState<Member[]>([]);

  // 초대 코드 생성 상태
  const [code, setCode] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const c = cachedGroupSync();
    if (c) setMembers(c.members);
    fetchGroup()
      .then((d) => {
        if (alive) setMembers(d.members);
      })
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
      /* 클립보드 권한 없으면 무시 */
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
      /* 사용자 취소 등 무시 */
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="멤버" subtitle="함께 장소를 모으는 사람들이에요" />

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((m) => (
          <div
            key={m.uid}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              border: '1px solid var(--border-light)',
              borderRadius: 16,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: m.avatar_color || 'var(--brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                flex: 'none',
              }}
            >
              {m.nickname?.[0] ?? '?'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{m.nickname}</div>
          </div>
        ))}
      </div>

      {/* 초대하기 */}
      <div style={{ padding: '0 20px 8px', marginTop: 'auto' }}>
        {code ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--border-light)',
              borderRadius: 20,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 12 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              48시간 후 만료 · 1회 사용 가능
            </div>
            {/* 6자리 코드 — 글자별 박스 */}
            <div style={{ display: 'flex', gap: 7 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    aspectRatio: '1',
                    background: '#FFF3EE',
                    border: '1.5px solid #FFD0BE',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#E85C2E',
                  }}
                >
                  {code[i] ?? ''}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <Button onClick={shareCode}>공유하기</Button>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? '복사됐어요 ✓' : '코드 복사'}
              </Button>
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting}
              style={{ width: '100%', marginTop: 10, background: '#1D1D1F', color: '#fff', borderRadius: 16, padding: 15, fontSize: 14.5, fontWeight: 700 }}
            >
              {inviting ? '생성 중…' : '＋ 새 코드 만들기'}
            </button>
          </div>
        ) : (
          <>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? '코드 만드는 중…' : '🎟️ 초대 코드 만들기'}
            </Button>
            {inviteError && (
              <div style={{ color: 'var(--brand-strong)', fontSize: 12.5, fontWeight: 600, textAlign: 'center', marginTop: 10 }}>
                {inviteError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
