// 카테고리 라인 아이콘 — 디자인 시안 v4의 SVG 그대로. (이모지 아님)
// 같은 path 데이터를 React 컴포넌트와 Leaflet용 HTML 문자열 양쪽에서 사용.
import type { Category } from '@/types';

// 각 카테고리의 <path d="…"> 묶음 (v4 시안에서 추출)
const PATHS: Record<Category, string[]> = {
  kids_cafe: [
    'M5 9h11v4a4 4 0 01-4 4H9a4 4 0 01-4-4z',
    'M16 10h2.2a2.3 2.3 0 010 4.6H16',
    'M8 3.6c-.5.6-.5 1.2 0 1.8M11.4 3.6c-.5.6-.5 1.2 0 1.8',
  ],
  hotel: [
    'M5 21V4.6a1 1 0 011-1h12a1 1 0 011 1V21',
    'M3 21h18',
    'M9.5 21v-3.4h5V21',
    'M8.6 8h0M12 8h0M15.4 8h0M8.6 12h0M12 12h0M15.4 12h0',
  ],
  outdoor: [
    'M5 19c0-7 5-12.5 14-13.5C19 14 14 19 7.5 19c-1 0-2.5 0-2.5 0z',
    'M5.5 19C9 15.2 13 12 17 10',
  ],
  performance: [
    'M4 7.2a1 1 0 011-1h14a1 1 0 011 1v2a2 2 0 000 3.6V17a1 1 0 01-1 1H5a1 1 0 01-1-1v-2.2a2 2 0 000-3.6z',
    'M13 7.6v8.8',
  ],
  restaurant: [
    'M6 3v5a2.2 2.2 0 004.4 0V3',
    'M8.2 8.2V21',
    'M16.6 3c-1.6 0-2.7 2.2-2.7 5.2 0 2.6 1.4 4 2.7 4.2V21',
  ],
  etc: [
    'M4 8.5l8-4.5 8 4.5v7l-8 4.5-8-4.5z',
    'M4 8.5l8 4.5 8-4.5',
    'M12 13v8',
  ],
};

export default function CategoryIcon({ type, size = 14 }: { type: Category; size?: number }) {
  const paths = PATHS[type] ?? PATHS.etc;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// Leaflet divIcon 등 HTML 문자열이 필요한 곳용
export function categoryIconHtml(type: Category, color: string, size = 15) {
  const paths = (PATHS[type] ?? PATHS.etc).map((d) => `<path d="${d}"/>`).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
