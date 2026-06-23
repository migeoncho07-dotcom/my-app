// 클라이언트에서 초대 API를 호출하는 헬퍼.
import { auth } from './firebase';

async function idToken(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요해요.');
  return u.getIdToken();
}

// 내 그룹의 1회용 초대 코드 생성
export async function createInviteCode(): Promise<{ code: string; expiresAt: string }> {
  const token = await idToken();
  const res = await fetch('/api/invite/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '초대 코드 생성에 실패했어요.');
  return json;
}

// 초대 코드로 기존 그룹에 합류 (가입 마무리에 사용)
export async function joinWithInviteCode(
  code: string,
  nickname: string,
  avatarColor: string
): Promise<{ ok: true; group_id: string }> {
  const token = await idToken();
  const res = await fetch('/api/invite/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code, nickname, avatarColor }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '초대 코드 확인에 실패했어요.');
  return json;
}
