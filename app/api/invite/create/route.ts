// POST /api/invite/create
// 로그인한 멤버가 자기 그룹의 1회용 초대 코드(6자리)를 생성합니다.
// Authorization: Bearer <Firebase ID 토큰> 헤더 필요.

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// 헷갈리는 글자(0,O,1,I,L) 제외한 코드 문자셋
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

async function uidFromAuthHeader(req: NextRequest): Promise<string> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('no-token');
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await uidFromAuthHeader(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const groupId = userSnap.exists ? (userSnap.data()!.group_id as string) : '';
    if (!groupId) {
      return NextResponse.json({ error: '그룹 정보를 찾을 수 없어요.' }, { status: 400 });
    }

    // 중복되지 않는 코드 뽑기
    let code = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = genCode();
      const exists = (await adminDb.collection('invite_codes').doc(candidate).get()).exists;
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return NextResponse.json({ error: '코드 생성에 실패했어요. 다시 시도해 주세요.' }, { status: 500 });
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000); // +48시간
    await adminDb.collection('invite_codes').doc(code).set({
      group_id: groupId,
      created_by: uid,
      created_at: FieldValue.serverTimestamp(),
      expires_at: expiresAt,
      used_at: null,
      used_by: null,
    });

    return NextResponse.json({ code, expiresAt: expiresAt.toDate().toISOString() });
  } catch {
    return NextResponse.json({ error: '초대 코드 생성 중 오류가 발생했어요.' }, { status: 500 });
  }
}
