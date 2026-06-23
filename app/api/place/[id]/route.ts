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
