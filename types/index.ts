// 아이랑 데이터 구조 정의
// Firestore 컬렉션과 1:1로 대응됩니다. (CLAUDE.md 3장 참고)

import type { Timestamp } from 'firebase/firestore';

// 장소 카테고리 6종 (디자인 토큰의 key 와 동일하게 유지)
export type Category =
  | 'kids_cafe'
  | 'hotel'
  | 'outdoor'
  | 'performance'
  | 'restaurant'
  | 'etc';

// groups/{groupId}
export interface Group {
  id: string;
  name: string;
  created_by: string; // uid
  created_at: Timestamp;
}

// groups/{groupId}/members/{uid}
export interface Member {
  uid: string;
  nickname: string;
  avatar_color: string;
  joined_at: Timestamp;
}

// groups/{groupId}/places/{placeId}
export interface Place {
  id: string;
  title: string;
  category: Category;
  region: string; // 예: "서울 금천"
  address: string;
  lat: number;
  lng: number;
  date_range: string; // 예: "2025.07.01~07.31" (선택)
  age_target: string; // 예: "3~7세", "전 연령"
  memo: string;
  source_text: string; // 원본 붙여넣기 텍스트
  ai_confidence: number; // 0~1, AI 추출 신뢰도
  kakao_place_id: string;
  added_by: string; // uid
  added_at: number | null; // 등록시각(밀리초). 서버 API가 millis 로 변환해 내려줌.
}

// users/{uid}
export interface User {
  uid: string;
  email: string;
  nickname: string;
  avatar_color: string;
  kid_birthdays: string[]; // 생년월일 'YYYY-MM-DD' 배열 (레거시)
  kid_ages?: number[]; // 아이 나이(살) 태그 — 가입 ⑤단계
  interests?: Category[]; // 관심 카테고리 — 홈 추천 정렬
  neighborhood?: string; // 우리 동네
  group_id: string; // MVP: 1인 1그룹 (나중에 배열로 확장 가능)
  created_at: Timestamp;
}

// invite_codes/{code}  (6자리 코드가 문서 ID)
export interface InviteCode {
  code: string;
  group_id: string;
  created_by: string; // uid
  created_at: Timestamp;
  expires_at: Timestamp; // +48시간
  used_at: Timestamp | null;
  used_by: string | null;
}

// ── AI 파싱(/api/parse) 응답 스키마 ──────────────────────────
// Claude Haiku 가 추출해서 돌려주는 한 장소의 형태 (저장 전 미리보기용)
export interface ParsedPlace {
  title: string;
  category: Category;
  region: string;
  address_hint: string;
  date_range: string | null;
  age_target: string | null;
  memo: string | null;
  confidence: number; // 0.0 ~ 1.0
}

export interface ParseResponse {
  places: ParsedPlace[];
}

// ── 카카오 검색(/api/kakao/search) 응답 한 건 ───────────────
export interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도(lng) — 카카오는 문자열로 줌
  y: string; // 위도(lat)
  id: string; // kakao_place_id
}
