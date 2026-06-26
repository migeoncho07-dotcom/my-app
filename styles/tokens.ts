// 디자인 토큰 — 아이랑 v4 "코랄 refined" (DESIGN.md v4 기준)
// v2 대비: 배경 #F5F5F7, 카테고리색 정제, 반경 축소, 버튼/카드 그림자 제거.

export const colors = {
  brand: '#FF6B4A',
  brandStrong: '#E85C2E', // brand-press
  brandTint: '#FFEDE7',
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  bgCard: '#FFFFFF',
  textPrimary: '#1D1D1F',
  textSecondary: '#636366',
  textTertiary: '#8E8E93',
  placeholder: '#C7C7CC',
  border: '#E5E5EA',
  borderLight: '#ECECF0',
  iosMaterial: 'rgba(118,118,128,.12)',
} as const;

// 카테고리 6종 — v4 정제된 색
export const category = {
  kids_cafe:   { emoji: '☕', label: '키즈카페',  text: '#E85C2E', bg: '#FFEAE2' },
  hotel:       { emoji: '🏨', label: '호텔/펜션', text: '#2E5DB0', bg: '#E6EFFD' },
  outdoor:     { emoji: '🌿', label: '야외장소',  text: '#1C8049', bg: '#E2F5E8' },
  performance: { emoji: '🎭', label: '공연/전시', text: '#7140B5', bg: '#F1E7FC' },
  restaurant:  { emoji: '🍴', label: '음식점',    text: '#B23A68', bg: '#FBE7F0' },
  etc:         { emoji: '📦', label: '기타',       text: '#6E6459', bg: '#EFEBE6' },
} as const;

// 반경 스케일 (v4)
export const radius = {
  xs: 7,    // 뱃지/작은 칩
  sm: 12,   // 입력 필드
  md: 14,   // 버튼
  lg: 16,   // 카드, 리스트 그룹
  xl: 20,   // 바텀시트 상단
  // 하위 호환 별칭
  card: 16,
  button: 14,
  field: 12,
  chip: 9,
} as const;

// 그림자 (v4) — 버튼/카드 그림자 없음. 시트만 사용.
export const shadow = {
  card: 'none',
  sheet: '0 -8px 24px -10px rgba(0,0,0,.18)',
} as const;

export type CategoryKey = keyof typeof category;
