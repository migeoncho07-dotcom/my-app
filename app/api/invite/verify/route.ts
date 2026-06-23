// POST /api/invite/verify
// 가입 중인 사용자가 초대 코드로 기존 그룹에 합류합니다.
// 코드 검증 + 멤버/프로필 생성 + 코드 사용처리를 서버에서 한 번에.
// 헤더: Authorization: Bearer <ID 토큰>  본문: { code, nickname, avatarColor }

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1) 인증
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
    return NextResponse.json({ error: '인증에 실패했어요. 다시 시도해 주세요.' }, { status: 401 });
  }

  // 2) 입력
  let body: { code?: string; nickname?: string; avatarColor?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }
  const code = String(body.code ?? '').toUpperCase().trim();
  const nickname = String(body.nickname ?? '').trim();
  const avatarColor = body.avatarColor || '#FF6B4A';
  if (!code || !nickname) {
    return NextResponse.json({ error: '초대 코드와 닉네임이 필요해요.' }, { status: 400 });
  }

  try {
    // 3) 코드 검증
    const codeRef = adminDb.collection('invite_codes').doc(code);
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
      return NextResponse.json({ error: '존재하지 않는 초대 코드예요.' }, { status: 404 });
    }
    const data = codeSnap.data()!;
    if (data.used_at) {
      return NextResponse.json({ error: '이미 사용된 초대 코드예요.' }, { status: 409 });
    }
    if (data.expires_at && data.expires_at.toMillis?.() < Date.now()) {
      return NextResponse.json({ error: '만료된 초대 코드예요.' }, { status: 410 });
    }
    const groupId = data.group_id as string;
    if (!groupId) {
      return NextResponse.json({ error: '초대 코드가 잘못됐어요.' }, { status: 400 });
    }

    // 4) 합류: 멤버 + 프로필 + 코드 사용처리 (원자적으로)
    const batch = adminDb.batch();
    batch.set(adminDb.doc(`groups/${groupId}/members/${uid}`), {
      nickname,
      avatar_color: avatarColor,
      joined_at: FieldValue.serverTimestamp(),
    });
    batch.set(adminDb.doc(`users/${uid}`), {
      email,
      nickname,
      avatar_color: avatarColor,
      kid_birthdays: [],
      group_id: groupId,
      created_at: FieldValue.serverTimestamp(),
    });
    batch.update(codeRef, { used_at: FieldValue.serverTimestamp(), used_by: uid });
    await batch.commit();

    return NextResponse.json({ ok: true, group_id: groupId });
  } catch {
    return NextResponse.json({ error: '초대 코드 처리 중 오류가 발생했어요.' }, { status: 500 });
  }
}
