// 서버 라우트 공용 — ID 토큰에서 uid, uid에서 group_id 구하기 (Admin)
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';

export async function uidFromRequest(req: NextRequest): Promise<string> {
  const h = req.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) throw new Error('no-token');
  const dec = await adminAuth.verifyIdToken(t);
  return dec.uid;
}

export async function groupIdForUid(uid: string): Promise<string> {
  const snap = await adminDb.collection('users').doc(uid).get();
  return (snap.exists ? (snap.data()!.group_id as string) : '') || '';
}
