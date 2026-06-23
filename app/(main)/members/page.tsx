'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeMembers } from '@/lib/firestore';
import type { Member } from '@/types';

export default function MembersPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!groupId) return;
    return subscribeMembers(groupId, setMembers);
  }, [groupId]);

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

      {/* 초대하기 (다음 단계에서 동작 연결) */}
      <div style={{ padding: '0 20px', marginTop: 'auto' }}>
        <div
          style={{
            background: 'var(--ios-material)',
            borderRadius: 16,
            padding: 16,
            textAlign: 'center',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
          }}
        >
          🎟️ 초대 코드 기능은 곧 추가돼요
        </div>
      </div>
    </div>
  );
}
