// Firestore 헬퍼 함수 모음
// 회원가입 시 그룹/멤버/유저 문서를 한 번에 만드는 등 DB 작업을 여기 모읍니다.

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { User, Place, Member, Category } from '@/types';

// 아바타 색상 팔레트 (가입 시 고르거나 랜덤 배정)
export const AVATAR_COLORS = [
  '#FF6B4A', // 브랜드
  '#3B72DD', // 블루
  '#1F9E57', // 그린
  '#8A4ED4', // 퍼플
  '#C7457A', // 핑크
  '#E0A400', // 옐로
  '#2BB1C4', // 시안
  '#847A6D', // 브라운
];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// 회원가입 마무리: 새 그룹 + 멤버 + 유저 프로필을 한꺼번에 생성
// (MVP: 1인 1그룹. 본인이 만든 그룹의 첫 멤버가 됩니다.)
export async function createUserWithNewGroup(params: {
  uid: string;
  email: string;
  nickname: string;
  avatarColor: string;
  kidBirthdays: string[];
  groupName?: string;
}): Promise<string> {
  const { uid, email, nickname, avatarColor, kidBirthdays, groupName } = params;

  // 1) 새 그룹 문서 ID 발급
  const groupRef = doc(collection(db, 'groups'));
  const groupId = groupRef.id;

  // 2) 그룹 생성 (created_by 는 반드시 본인 = 보안 규칙 통과 조건)
  await setDoc(groupRef, {
    name: groupName || `${nickname}님의 공간`,
    created_by: uid,
    created_at: serverTimestamp(),
  });

  // 3) 그룹 멤버로 본인 등록
  await setDoc(doc(db, 'groups', groupId, 'members', uid), {
    nickname,
    avatar_color: avatarColor,
    joined_at: serverTimestamp(),
  });

  // 4) 유저 프로필 생성
  await setDoc(doc(db, 'users', uid), {
    email,
    nickname,
    avatar_color: avatarColor,
    kid_birthdays: kidBirthdays,
    group_id: groupId,
    created_at: serverTimestamp(),
  });

  return groupId;
}

// --- Firestore REST 파서 (SDK 전송이 막힌 환경 우회용) ---
function restVal(f: any): any {
  if (!f) return undefined;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values ?? []).map(restVal);
  if ('mapValue' in f) {
    const o: any = {};
    const fields = f.mapValue.fields ?? {};
    for (const k of Object.keys(fields)) o[k] = restVal(fields[k]);
    return o;
  }
  return undefined;
}

async function getUserProfileViaRest(uid: string): Promise<User | null> {
  const u = auth.currentUser;
  if (!u) throw new Error('no-auth');
  const token = await u.getIdToken();
  const pid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('rest-' + res.status);
  const data = await res.json();
  const f = data.fields;
  if (!f) return null;
  return {
    uid,
    email: restVal(f.email) ?? '',
    nickname: restVal(f.nickname) ?? '',
    avatar_color: restVal(f.avatar_color) ?? '',
    kid_birthdays: restVal(f.kid_birthdays) ?? [],
    group_id: restVal(f.group_id) ?? '',
    created_at: null as any,
  };
}

async function getUserProfileViaSdk(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<User, 'uid'>) };
}

// 유저 프로필 조회 — SDK와 REST를 동시에 시도해 먼저 되는 쪽 사용.
// (일부 프로덕션 환경에서 SDK 전송이 매달리는 문제를 REST로 우회)
export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    return await Promise.any([getUserProfileViaSdk(uid), getUserProfileViaRest(uid)]);
  } catch (e: any) {
    // 둘 다 실패한 경우
    throw e?.errors?.[0] ?? e;
  }
}

// 장소를 그룹에 저장. 저장 시 added_by 는 반드시 본인(uid).
export interface NewPlaceInput {
  title: string;
  category: Category;
  region: string;
  address: string;
  lat: number;
  lng: number;
  date_range: string;
  age_target: string;
  memo: string;
  source_text: string;
  ai_confidence: number;
  kakao_place_id: string;
}

export async function addPlace(
  groupId: string,
  uid: string,
  data: NewPlaceInput
): Promise<string> {
  const ref = await addDoc(collection(db, 'groups', groupId, 'places'), {
    ...data,
    added_by: uid,
    added_at: serverTimestamp(),
  });
  return ref.id;
}

// 단일 장소 조회 (없으면 null)
export async function getPlace(
  groupId: string,
  placeId: string
): Promise<Place | null> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'places', placeId));
  if (!snap.exists()) return null;
  return { id: placeId, ...(snap.data() as Omit<Place, 'id'>) };
}

// 그룹 장소 실시간 구독 (최신순). 해제 함수를 반환합니다.
export function subscribePlaces(
  groupId: string,
  onData: (places: Place[]) => void
): () => void {
  const q = query(
    collection(db, 'groups', groupId, 'places'),
    orderBy('added_at', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const places = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Place, 'id'>),
      }));
      onData(places);
    },
    () => onData([]) // 권한/네트워크 오류 시 빈 목록
  );
}

// 그룹 멤버 실시간 구독 (등록자 닉네임 표시 등에 사용)
export function subscribeMembers(
  groupId: string,
  onData: (members: Member[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'groups', groupId, 'members'),
    (snap) => {
      const members = snap.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as Omit<Member, 'uid'>),
      }));
      onData(members);
    },
    () => onData([])
  );
}
