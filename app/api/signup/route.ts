// POST /api/signup — 가입 마무리 (Admin 경유, Vercel에서 동작).
// 초대코드가 있으면 그 그룹에 합류, 없으면 새 그룹 생성. + 프로필 필드 저장.
// 헤더: Authorization: Bearer <ID토큰>
// 본문: { nickname, avatarColor, interests?, neighborhood?, kidAges?, inviteCode? }

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1) 인증
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  let uid: string;
  let email = '';
  try {
    const dec = await adminAuth.verifyIdToken(token);
    uid = dec.uid;
    email = dec.email || '';
  } catch {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  // 2) 입력
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
  const nickname = String(b.nickname ?? '').trim();
  const avatarColor = String(b.avatarColor ?? '#FF6B4A');
  const interests = Array.isArray(b.interests) ? b.interests.map(String) : [];
  const neighborhood = String(b.neighborhood ?? '');
  const kidAges = Array.isArray(b.kidAges) ? b.kidAges.map((n: any) => Number(n) || 0) : [];
  const inviteCode = String(b.inviteCode ?? '').toUpperCase().trim();
  if (!nickname) return NextResponse.json({ error: '닉네임이 필요해요.' }, { status: 400 });

  const profileBase = {
    email,
    nickname,
    avatar_color: avatarColor,
    kid_birthdays: [],
    kid_ages: kidAges,
    interests,
    neighborhood,
    created_at: FieldValue.serverTimestamp(),
  };

  try {
    if (inviteCode) {
      // ── 초대코드로 합류 ──
      const codeRef = adminDb.collection('invite_codes').doc(inviteCode);
      const snap = await codeRef.get();
      if (!snap.exists) return NextResponse.json({ error: '존재하지 않는 초대 코드예요.' }, { status: 404 });
      const data = snap.data()!;
      if (data.used_at) return NextResponse.json({ error: '이미 사용된 초대 코드예요.' }, { status: 409 });
      if (data.expires_at && data.expires_at.toMillis?.() < Date.now())
        return NextResponse.json({ error: '만료된 초대 코드예요.' }, { status: 410 });
      const groupId = data.group_id as string;
      if (!groupId) return NextResponse.json({ error: '초대 코드가 잘못됐어요.' }, { status: 400 });

      const batch = adminDb.batch();
      batch.set(adminDb.doc(`groups/${groupId}/members/${uid}`), {
        nickname, avatar_color: avatarColor, joined_at: FieldValue.serverTimestamp(),
      });
      batch.set(adminDb.doc(`users/${uid}`), { ...profileBase, group_id: groupId });
      batch.update(codeRef, { used_at: FieldValue.serverTimestamp(), used_by: uid });
      await batch.commit();
      return NextResponse.json({ ok: true, group_id: groupId });
    }

    // ── 코드 없이 새 그룹 생성 ──
    const groupRef = adminDb.collection('groups').doc();
    const groupId = groupRef.id;
    const batch = adminDb.batch();
    batch.set(groupRef, { name: `${nickname}님의 공간`, created_by: uid, created_at: FieldValue.serverTimestamp() });
    batch.set(adminDb.doc(`groups/${groupId}/members/${uid}`), {
      nickname, avatar_color: avatarColor, joined_at: FieldValue.serverTimestamp(),
    });
    batch.set(adminDb.doc(`users/${uid}`), { ...profileBase, group_id: groupId });
    await batch.commit();
    return NextResponse.json({ ok: true, group_id: groupId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
