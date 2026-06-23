// 클라이언트에서 그룹 데이터(장소·멤버)를 서버 API 경유로 가져오는 헬퍼.
// 브라우저 Firestore SDK 가 일부 환경에서 막히는 문제를 우회.
import { auth } from './firebase';
import type { Place, Member } from '@/types';

async function token(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요해요.');
  return u.getIdToken();
}

export interface GroupData {
  places: Place[];
  members: Member[];
  groupId: string;
}

export async function fetchGroup(): Promise<GroupData> {
  const res = await fetch('/api/group', { headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error('group-' + res.status);
  return res.json();
}

export async function savePlaceApi(data: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '저장에 실패했어요.');
  return json;
}

export async function fetchPlaceApi(
  id: string
): Promise<{ place: Place | null; addedByName: string }> {
  const res = await fetch(`/api/place/${id}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (res.status === 404) return { place: null, addedByName: '' };
  if (!res.ok) throw new Error('place-' + res.status);
  return res.json();
}
