import { auth } from '@/lib/firebase';

async function token(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('no-user');
  return u.getIdToken();
}

export interface NotifItem {
  id: string;
  type: string;
  place_id: string;
  place_title: string;
  by_name: string;
  read: boolean;
  at: number;
}

export async function fetchNotifications(): Promise<{ items: NotifItem[]; unread: number }> {
  try {
    const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${await token()}` } });
    if (!res.ok) return { items: [], unread: 0 };
    return res.json();
  } catch {
    return { items: [], unread: 0 };
  }
}

export async function markNotificationsRead(): Promise<void> {
  try {
    await fetch('/api/notifications', { method: 'POST', headers: { Authorization: `Bearer ${await token()}` } });
  } catch {
    /* 무시 */
  }
}
