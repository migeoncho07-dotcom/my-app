// GET /api/health — 서버(Admin)가 Firestore에 닿는지 진단용.
// 인증 없이 호출 가능. 임의의 문서를 한 번 읽어 성공/실패와 소요시간을 반환.

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  try {
    // 존재하지 않아도 되는 임의 문서 1회 읽기 — 연결만 확인
    await adminDb.collection('_health').doc('ping').get();
    return NextResponse.json({ ok: true, ms: Date.now() - t0 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, ms: Date.now() - t0, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
