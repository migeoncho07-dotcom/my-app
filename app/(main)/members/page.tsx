'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeMembers } from '@/lib/firestore';
import { createInviteCode } from '@/lib/invite-client';
import Button from '@/components/ui/Button';
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
    if (!groupId) return;
    return subscribeMembers(groupId, setMembers);
  }, [groupId]);

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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 20px 0', fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>
        멤버
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, padding: '6px 20px 0' }}>
        함께 장소를 모으는 사람들이에요
      </div>

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
              borderRadius: 18,
              padding: 18,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 10 }}>
              친구에게 이 코드를 보내주세요 (48시간 · 1회용)
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--brand)', paddingLeft: '0.2em' }}>
              {code}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? '복사됐어요 ✓' : '코드 복사'}
              </Button>
              <Button variant="secondary" onClick={handleInvite} disabled={inviting}>
                {inviting ? '생성 중…' : '새 코드'}
              </Button>
            </div>
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
