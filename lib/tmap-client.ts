// 클라이언트에서 티맵 자동차 길찾기(주행시간)를 호출하는 헬퍼.
import { auth } from '@/lib/firebase';

async function token(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('no-user');
  return u.getIdToken();
}

export interface DriveTime {
  id: string;
  seconds: number;
}

// 출발지(start)에서 각 목적지(dests)까지 실시간 교통 반영 주행시간(초)
// 계산 실패한 목적지는 결과에서 제외됨.
export async function fetchDrivingTimes(
  start: { lat: number; lng: number },
  dests: { id: string; lat: number; lng: number }[],
): Promise<DriveTime[]> {
  if (dests.length === 0) return [];
  try {
    const res = await fetch('/api/tmap/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({
        startX: start.lng,
        startY: start.lat,
        dests: dests.map((d) => ({ id: d.id, x: d.lng, y: d.lat })),
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.times ?? []) as DriveTime[];
  } catch {
    return [];
  }
}
