// GET /api/group — 내 그룹의 장소 + 멤버 목록 (Admin 경유, 브라우저 SDK 우회)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { uidFromRequest, groupIdForUid } from '@/lib/api-auth';

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
    const groupId = await groupIdForUid(uid);
    if (!groupId) return NextResponse.json({ places: [], members: [], groupId: '' });

    const groupRef = adminDb.collection('groups').doc(groupId);
    const [placesSnap, membersSnap] = await Promise.all([
      groupRef.collection('places').orderBy('added_at', 'desc').get(),
      groupRef.collection('members').get(),
    ]);

    const places = placesSnap.docs.map((d) => {
      const x = d.data();
      return { ...x, id: d.id, added_at: x.added_at?.toMillis?.() ?? null };
    });
    const members = membersSnap.docs.map((d) => {
      const x = d.data();
      return { uid: d.id, nickname: x.nickname ?? '', avatar_color: x.avatar_color ?? '' };
    });

    return NextResponse.json({ places, members, groupId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
