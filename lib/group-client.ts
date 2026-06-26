// 클라이언트에서 그룹 데이터(장소·멤버)를 서버 API 경유로 가져오는 헬퍼.
// 브라우저 Firestore SDK 가 일부 환경에서 막히는 문제를 우회.
import { auth } from './firebase';
import type { Place, Member, Rating } from '@/types';
import type { RatingInput } from './ratings';

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

// --- 캐시 (즉시 렌더 + 백그라운드 갱신) ---
const CACHE_KEY = 'airang_group';
let memCache: GroupData | null = null;
let inflight: Promise<GroupData> | null = null;

// 동기 캐시 읽기 (초기 렌더용). SSR/없으면 null.
export function cachedGroupSync(): GroupData | null {
  if (memCache) return memCache;
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      memCache = JSON.parse(raw);
      return memCache;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function fetchGroup(): Promise<GroupData> {
  // 동시 호출은 하나로 합침 (중복 요청 방지)
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/group', { headers: { Authorization: `Bearer ${await token()}` } });
      if (!res.ok) throw new Error('group-' + res.status);
      const data: GroupData = await res.json();
      memCache = data;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        /* ignore */
      }
      return data;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// 로그인 직후 미리 당겨두기 (홈 진입 시 이미 준비)
export function prefetchGroup() {
  fetchGroup().catch(() => {});
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
): Promise<{ place: Place | null; addedByName: string; ratings: Rating[]; myRating: Rating | null }> {
  const res = await fetch(`/api/place/${id}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (res.status === 404) return { place: null, addedByName: '', ratings: [], myRating: null };
  if (!res.ok) throw new Error('place-' + res.status);
  const json = await res.json();
  return { ratings: [], myRating: null, ...json };
}

// 내 평점 작성/수정
export async function submitRatingApi(placeId: string, input: RatingInput): Promise<void> {
  const res = await fetch(`/api/place/${placeId}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error || '평점 등록에 실패했어요.');
}

// 내 평점 삭제
export async function deleteRatingApi(placeId: string): Promise<void> {
  const res = await fetch(`/api/place/${placeId}/rating`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || '삭제에 실패했어요.');
}

export async function updatePlaceApi(id: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/place/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || '수정에 실패했어요.');
}

export async function deletePlaceApi(id: string): Promise<void> {
  const res = await fetch(`/api/place/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || '삭제에 실패했어요.');
}
