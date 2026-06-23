// GET /api/place/[id] — 단일 장소 + 등록자 닉네임 (Admin 경유)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { uidFromRequest, groupIdForUid } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let uid: string;
  try {
    uid = await uidFromRequest(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  try {
    const groupId = await groupIdForUid(uid);
    if (!groupId) return NextResponse.json({ place: null }, { status: 404 });

    const snap = await adminDb
      .collection('groups')
      .doc(groupId)
      .collection('places')
      .doc(params.id)
      .get();
    if (!snap.exists) return NextResponse.json({ place: null }, { status: 404 });

    const x = snap.data()!;
    let addedByName = '';
    if (x.added_by) {
      const u = await adminDb.collection('users').doc(x.added_by).get();
      addedByName = u.exists ? (u.data()!.nickname ?? '') : '';
    }
    return NextResponse.json({
      place: { ...x, id: snap.id, added_at: x.added_at?.toMillis?.() ?? null },
      addedByName,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// PUT /api/place/[id] — 장소 수정 (편집 가능한 필드만)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const ref = adminDb.collection('groups').doc(groupId).collection('places').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: '장소를 찾을 수 없어요.' }, { status: 404 });
    await ref.update({
      title: String(body.title ?? ''),
      category: String(body.category ?? 'etc'),
      region: String(body.region ?? ''),
      address: String(body.address ?? ''),
      lat: Number(body.lat) || 0,
      lng: Number(body.lng) || 0,
      date_range: String(body.date_range ?? ''),
      age_target: String(body.age_target ?? ''),
      memo: String(body.memo ?? ''),
      kakao_place_id: String(body.kakao_place_id ?? ''),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// DELETE /api/place/[id] — 장소 삭제
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let uid: string;
  try {
    uid = await uidFromRequest(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const groupId = await groupIdForUid(uid);
    if (!groupId) return NextResponse.json({ error: '그룹이 없어요.' }, { status: 400 });
    await adminDb.collection('groups').doc(groupId).collection('places').doc(params.id).delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
