// 가입 마무리를 서버(/api/signup) 경유로 처리하는 클라이언트 헬퍼.
import { auth } from './firebase';
import type { Category } from '@/types';

export async function completeSignup(data: {
  nickname: string;
  avatarColor: string;
  interests?: Category[];
  neighborhood?: string;
  kidAges?: number[];
  inviteCode?: string;
}): Promise<{ ok: true; group_id: string }> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요해요.');
  const token = await u.getIdToken();
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '가입 마무리에 실패했어요.');
  return json;
}
