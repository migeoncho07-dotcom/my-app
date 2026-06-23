// GET /api/health — 서버(Admin)가 Firestore에 닿는지 + 키 로드 진단용.
// firebase-admin 을 '동적 import' 해서, 키 로드 에러까지 JSON 으로 노출.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  const keyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  const info: any = {
    keyPresent: keyRaw.length > 0,
    keyLen: keyRaw.length,
    keyHead: keyRaw.slice(0, 12),
  };
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    await adminDb.collection('_health').doc('ping').get();
    return NextResponse.json({ ok: true, ms: Date.now() - t0, ...info });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, ms: Date.now() - t0, error: String(e?.message || e), ...info },
      { status: 200 }
    );
  }
}
