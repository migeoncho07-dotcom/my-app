// 디자인 토큰 — DESIGN.md / 시안(애플 톤 v2) 기준
// 화면 코드에서 색상·카테고리를 여기서 가져다 씁니다.

export const colors = {
  brand: '#FF6B4A',
  brandStrong: '#E85C2E',
  bg: '#EFEFF4',
  bgCard: '#F5F5F7',
  textPrimary: '#1D1D1F',
  textSecondary: '#636366',
  textTertiary: '#8E8E93',
  placeholder: '#C7C7CC',
  border: '#E5E5EA',
  borderLight: '#ECECF0',
  iosMaterial: 'rgba(118,118,128,.12)',
} as const;

// 카테고리 6종 — 이모지/한글 라벨/글자색/배경색
// key 는 types/index.ts 의 Category 와 동일해야 함
export const category = {
  kids_cafe:   { emoji: '☕', label: '키즈카페',  text: '#E85C2E', bg: '#FFEAE2' },
  hotel:       { emoji: '🏨', label: '호텔/펜션', text: '#3B72DD', bg: '#E6EFFD' },
  outdoor:     { emoji: '🌿', label: '야외장소',  text: '#1F9E57', bg: '#E2F5E8' },
  performance: { emoji: '🎭', label: '공연/전시', text: '#8A4ED4', bg: '#F1E7FC' },
  restaurant:  { emoji: '🍴', label: '음식점',    text: '#C7457A', bg: '#FBE7F0' },
  etc:         { emoji: '📦', label: '기타',       text: '#847A6D', bg: '#EFEBE6' },
} as const;

// 모서리 반경
export const radius = {
  card: 22,
  button: 16,
  field: 15,
  chip: 9,
} as const;

// 그림자
export const shadow = {
  card: '0 6px 20px -14px rgba(0,0,0,.45)',
} as const;

export type CategoryKey = keyof typeof category;
