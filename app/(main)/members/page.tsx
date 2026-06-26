'use client';

import { useEffect, useState } from 'react';
import { fetchGroup, cachedGroupSync } from '@/lib/group-client';
import ScreenHeader from '@/components/ui/ScreenHeader';
import type { Member } from '@/types';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);

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
    </div>
  );
}
