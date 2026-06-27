'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchNotifications, markNotificationsRead, type NotifItem } from '@/lib/notif-client';
import { timeAgo } from '@/lib/age';

export default function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    const d = await fetchNotifications();
    setItems(d.items);
    setUnread(d.unread);
  }
  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  async function openSheet() {
    setOpen(true);
    if (unread > 0) {
      await markNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <>
      <button
        onClick={openSheet}
        aria-label="알림"
        style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flex: 'none', background: 'transparent' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--brand)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '70%', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div style={{ padding: '14px 20px 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E5', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>알림</div>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500, padding: '36px 0' }}>아직 알림이 없어요</div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); router.push(`/place/${n.place_id}`); }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left', padding: '11px 8px', borderRadius: 12, background: 'transparent' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', background: '#FFF3EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FF6B4A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: '#1D1D1F', fontWeight: 500, lineHeight: 1.5 }}>
                        <b style={{ fontWeight: 700 }}>{n.by_name}</b>님이 <b style={{ fontWeight: 700 }}>{n.place_title}</b>을(를) 수정했어요
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>{n.at ? timeAgo(n.at) : ''}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
