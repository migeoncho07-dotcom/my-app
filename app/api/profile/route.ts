// GET /api/profile
// 클라이언트의 Firebase ID 토큰을 검증하고, 서버(Admin)로 users/{uid} 를 읽어 반환.
// 일부 환경에서 브라우저 Firestore SDK 연결이 막히는 문제를 서버 경유로 우회.

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  let uid: string;
  let email = '';
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || '';
  } catch {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ profile: null });
    }
    const d = snap.data() || {};
    return NextResponse.json({
      profile: {
        uid,
        email: d.email ?? email,
        nickname: d.nickname ?? '',
        avatar_color: d.avatar_color ?? '',
        kid_birthdays: d.kid_birthdays ?? [],
        kid_ages: d.kid_ages ?? [],
        interests: d.interests ?? [],
        neighborhood: d.neighborhood ?? '',
        group_id: d.group_id ?? '',
      },
    });
  } catch {
    return NextResponse.json({ error: '프로필 조회 중 오류' }, { status: 500 });
  }
}
