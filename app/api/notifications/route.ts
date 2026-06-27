// GET /api/notifications  — 내 알림 목록 + 안읽음 수
// POST /api/notifications — 모두 읽음 처리
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { uidFromRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let uid: string;
  try {
    uid = await uidFromRequest(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const snap = await adminDb
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .orderBy('at', 'desc')
      .limit(40)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
    const unread = items.filter((n: any) => !n.read).length;
    return NextResponse.json({ items, unread });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await uidFromRequest(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const col = adminDb.collection('users').doc(uid).collection('notifications');
    const unread = await col.where('read', '==', false).get();
    if (!unread.empty) {
      const batch = adminDb.batch();
      unread.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
