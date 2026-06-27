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

    // 평점/후기 (최신순)
    const ratingsSnap = await snap.ref.collection('ratings').get();
    const ratings = ratingsSnap.docs
      .map((d) => {
        const r = d.data();
        return {
          ...r,
          id: d.id,
          created_at: r.created_at?.toMillis?.() ?? null,
          updated_at: r.updated_at?.toMillis?.() ?? null,
        };
      })
      .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    const myRating = ratings.find((r: any) => r.uid === uid) ?? null;

    return NextResponse.json({
      place: { ...x, id: snap.id, added_at: x.added_at?.toMillis?.() ?? null },
      addedByName,
      ratings,
      myRating,
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
    const prev = snap.data()!;
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

    // 작성자에게 "누가 수정했는지" 알림 (본인이 수정한 경우는 제외)
    const ownerUid = prev.added_by as string | undefined;
    if (ownerUid && ownerUid !== uid) {
      try {
        const me = await adminDb.collection('users').doc(uid).get();
        const byName = me.exists ? (me.data()!.nickname ?? '멤버') : '멤버';
        await adminDb.collection('users').doc(ownerUid).collection('notifications').add({
          type: 'place_edited',
          place_id: params.id,
          place_title: String(body.title ?? prev.title ?? ''),
          by_uid: uid,
          by_name: byName,
          read: false,
          at: Date.now(),
        });
      } catch {
        /* 알림 실패는 무시 */
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// DELETE /api/place/[id] — 장소 삭제 (작성자 본인만)
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
    const ref = adminDb.collection('groups').doc(groupId).collection('places').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: true }); // 이미 없으면 성공 처리
    if ((snap.data()!.added_by as string) !== uid) {
      return NextResponse.json({ error: '등록한 사람만 삭제할 수 있어요.' }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
