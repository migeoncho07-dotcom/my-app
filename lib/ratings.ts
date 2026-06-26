// 평점·후기 공용 로직 (클라이언트/서버 양쪽에서 사용)
// 디자인 핸드오프: 놀잇터 평점·후기 플로우

// 별점 1~5 라벨 (별점 시트에서 선택 시 표시)
export const SCORE_LABELS: Record<number, string> = {
  1: '별로',
  2: '그저그래요',
  3: '괜찮아요',
  4: '좋아요!',
  5: '최고예요!',
};

// "빠른 한마디" 태그 (중복 선택 가능)
export const RATING_TAGS = [
  '아이가 좋아했어요',
  '깨끗했어요',
  '주차 편해요',
  '가성비 좋아요',
  '재방문 예정',
  '대기 없었어요',
] as const;

export type RatingTag = (typeof RATING_TAGS)[number];

export interface RatingInput {
  score: number; // 1~5
  tags: string[];
  comment: string;
}

export interface RatingAggregate {
  count: number;
  avg: number | null; // 평균(반올림 전 원본). 표시는 1자리.
  popular: { tag: string; count: number }[]; // 많이 선택된 순
  dist: [number, number, number, number, number]; // [1점,2점,3점,4점,5점] 개수
}

// 평점 목록 → 집계 (평균/개수/인기태그/분포). 서버·클라 공용.
export function computeAggregate(
  ratings: { score: number; tags?: string[] }[],
): RatingAggregate {
  const count = ratings.length;
  const avg = count ? ratings.reduce((s, r) => s + (r.score || 0), 0) / count : null;

  const tagCounts: Record<string, number> = {};
  ratings.forEach((r) =>
    (r.tags ?? []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }),
  );
  const popular = Object.entries(tagCounts)
    .map(([tag, c]) => ({ tag, count: c }))
    .sort((a, b) => b.count - a.count);

  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  ratings.forEach((r) => {
    if (r.score >= 1 && r.score <= 5) dist[r.score - 1]++;
  });

  return { count, avg, popular, dist };
}

// 평균을 "4.2" 형태 문자열로
export function fmtAvg(avg: number | null | undefined): string {
  if (avg == null) return '–';
  return avg.toFixed(1);
}
