// GET /api/kakao/search?q=장소명&region=지역
// 카카오 로컬 키워드 검색 → 주소/좌표 후보 반환

import { NextRequest, NextResponse } from 'next/server';
import type { KakaoPlace } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return NextResponse.json({ error: '카카오 키가 설정되지 않았어요.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const region = (searchParams.get('region') ?? '').trim();
  if (!q) return NextResponse.json({ places: [] });

  const query = [region, q].filter(Boolean).join(' ');
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`;

  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!res.ok) {
      return NextResponse.json({ error: '카카오 검색에 실패했어요.' }, { status: 502 });
    }
    const data = await res.json();
    const places: KakaoPlace[] = (data.documents ?? []).map((d: any) => ({
      place_name: d.place_name,
      address_name: d.address_name,
      road_address_name: d.road_address_name,
      x: d.x,
      y: d.y,
      id: d.id,
    }));
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: '카카오 검색 중 오류가 발생했어요.' }, { status: 502 });
  }
}
