// POST /api/tmap/route
// body: { startX, startY, dests: [{ id, x, y }] }  (x=lng, y=lat, WGS84)
// → 티맵 자동차 길찾기(실시간 교통 반영)로 각 목적지 주행시간(초) 반환
// { times: [{ id, seconds }] }  (계산 실패한 목적지는 제외)
import { NextRequest, NextResponse } from 'next/server';
import { uidFromRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TMAP_URL = 'https://apis.openapi.sk.com/tmap/routes?version=1&format=json';

async function driveSeconds(key: string, sx: number, sy: number, ex: number, ey: number): Promise<number | null> {
  try {
    const res = await fetch(TMAP_URL, {
      method: 'POST',
      headers: { appKey: key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        startX: String(sx),
        startY: String(sy),
        endX: String(ex),
        endY: String(ey),
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        searchOption: '0', // 교통최적+추천
        trafficInfo: 'Y', // 실시간 교통 반영
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.features?.[0]?.properties?.totalTime;
    return typeof t === 'number' ? t : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await uidFromRequest(req);
  } catch {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  const key = process.env.TMAP_APP_KEY;
  if (!key) {
    return NextResponse.json({ error: 'TMAP_APP_KEY가 설정되지 않았어요.', times: [] }, { status: 500 });
  }

  let body: { startX?: number; startY?: number; dests?: { id: string; x: number; y: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
  const { startX, startY } = body;
  const dests = (body.dests ?? []).slice(0, 40); // 과호출 방지
  if (typeof startX !== 'number' || typeof startY !== 'number' || dests.length === 0) {
    return NextResponse.json({ times: [] });
  }

  // 동시 호출 5개씩
  const times: { id: string; seconds: number }[] = [];
  const CONC = 5;
  for (let i = 0; i < dests.length; i += CONC) {
    const chunk = dests.slice(i, i + CONC);
    const results = await Promise.all(
      chunk.map(async (d) => {
        const sec = await driveSeconds(key, startX, startY, d.x, d.y);
        return sec == null ? null : { id: d.id, seconds: sec };
      }),
    );
    results.forEach((r) => r && times.push(r));
  }

  return NextResponse.json({ times });
}
