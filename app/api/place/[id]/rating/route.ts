// 평점 작성/수정/삭제 — groups/{gid}/places/{pid}/ratings/{uid} (유저당 1개)
// 작성 후 place 문서의 집계 필드(avg_rating, rating_count, popular_tags, rated_by)를 갱신.
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { uidFromRequest, groupIdForUid } from '@/lib/api-auth';
import { computeAggregate } from '@/lib/ratings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// place 문서의 평점 집계 다시 계산해서 반영
async function recomputeAggregate(placeRef: FirebaseFirestore.DocumentReference) {
  const snap = await placeRef.collection('ratings').get();
  const all = snap.docs.map((d) => d.data() as { score: number; tags?: string[] });
  const agg = computeAggregate(all);
  await placeRef.update({
    avg_rating: agg.avg,
    rating_count: agg.count,
    popular_tags: agg.popular.slice(0, 5),
    rated_by: snap.docs.map((d) => d.id),
  });
}

// POST — 내 평점 생성 또는 수정
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  const score = Math.round(Number(body.score));
  if (!(score >= 1 && score <= 5)) {
    return NextResponse.json({ error: '별점을 선택해 주세요.' }, { status: 400 });
  }
  const tags: string[] = Array.isArray(body.tags) ? body.tags.map(String).slice(0, 10) : [];
  const comment = String(body.comment ?? '').slice(0, 500);

  try {
    const groupId = await groupIdForUid(uid);
    if (!groupId) return NextResponse.json({ error: '그룹이 없어요.' }, { status: 400 });

    const placeRef = adminDb.collection('groups').doc(groupId).collection('places').doc(params.id);
    const placeSnap = await placeRef.get();
    if (!placeSnap.exists) {
      return NextResponse.json({ error: '장소를 찾을 수 없어요.' }, { status: 404 });
    }

    // 작성자 프로필 (닉네임·아바타색)
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const u = userSnap.exists ? userSnap.data()! : {};

    const ratingRef = placeRef.collection('ratings').doc(uid);
    const prev = await ratingRef.get();

    await ratingRef.set(
      {
        uid,
        user_nickname: u.nickname ?? '',
        avatar_color: u.avatar_color ?? '#FF6B4A',
        score,
        tags,
        comment,
        is_visited: true,
        created_at: prev.exists ? prev.data()!.created_at ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await recomputeAggregate(placeRef);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// DELETE — 내 평점 삭제
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
    const placeRef = adminDb.collection('groups').doc(groupId).collection('places').doc(params.id);
    await placeRef.collection('ratings').doc(uid).delete();
    await recomputeAggregate(placeRef);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
