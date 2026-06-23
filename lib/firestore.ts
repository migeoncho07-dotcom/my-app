// Firestore 헬퍼 함수 모음
// 회원가입 시 그룹/멤버/유저 문서를 한 번에 만드는 등 DB 작업을 여기 모읍니다.

import {
  doc,
  getDoc,
  setDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '@/types';

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

// 유저 프로필 조회 (없으면 null)
export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<User, 'uid'>) };
}
