// POST /api/places — 장소 저장 (Admin 경유). body 는 장소 필드들.
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { uidFromRequest, groupIdForUid } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await uidFromRequest(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  try {
    const groupId = await groupIdForUid(uid);
    if (!groupId) return NextResponse.json({ error: '그룹이 없어요.' }, { status: 400 });

    const ref = await adminDb.collection('groups').doc(groupId).collection('places').add({
      title: String(body.title ?? ''),
      category: String(body.category ?? 'etc'),
      region: String(body.region ?? ''),
      address: String(body.address ?? ''),
      lat: Number(body.lat) || 0,
      lng: Number(body.lng) || 0,
      date_range: String(body.date_range ?? ''),
      age_target: String(body.age_target ?? ''),
      memo: String(body.memo ?? ''),
      source_text: String(body.source_text ?? '').slice(0, 2000),
      ai_confidence: Number(body.ai_confidence) || 0,
      kakao_place_id: String(body.kakao_place_id ?? ''),
      added_by: uid,
      added_at: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: ref.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
