// 클라이언트에서 파싱/카카오 API를 호출하는 헬퍼.
import type { ParsedPlace, KakaoPlace } from '@/types';

// 텍스트 또는 링크 → 추출된 장소들
export async function parseInput(input: {
  text?: string;
  url?: string;
}): Promise<ParsedPlace[]> {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'AI 정리에 실패했어요.');
  return json.places ?? [];
}

// 장소명 + 지역 → 카카오 주소 후보
export async function searchKakao(q: string, region = ''): Promise<KakaoPlace[]> {
  const params = new URLSearchParams({ q, region });
  const res = await fetch(`/api/kakao/search?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '주소 검색에 실패했어요.');
  return json.places ?? [];
}
