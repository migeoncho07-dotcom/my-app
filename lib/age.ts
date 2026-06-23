// 생년월일('YYYY-MM-DD')로 현재 나이를 계산하는 도우미.
// 데이터엔 생년월일만 저장하고, 화면에 보일 때 그때그때 나이를 계산합니다.
// (나이를 직접 저장하면 시간이 지나며 틀려지기 때문)

// 태어난 지 몇 개월 됐는지
export function monthsSince(isoBirthday: string): number {
  const b = new Date(`${isoBirthday}T00:00:00`);
  if (isNaN(b.getTime())) return 0;
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

// 사람이 읽기 좋은 나이 라벨: "8개월" / "3살" / "3살 2개월"
export function ageLabel(isoBirthday: string): string {
  if (!isoBirthday) return '';
  const m = monthsSince(isoBirthday);
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years < 1) return `${months}개월`;
  if (months === 0) return `${years}살`;
  return `${years}살 ${months}개월`;
}

// 오늘 날짜를 'YYYY-MM-DD'로 (date input 의 max 값 등에 사용)
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Firestore Timestamp(또는 toMillis 가진 값) → "방금 / N분 전 / N일 전" 표시
export function timeAgo(ts: { toMillis?: () => number } | null | undefined): string {
  if (!ts || typeof ts.toMillis !== 'function') return '';
  const diff = Date.now() - ts.toMillis();
  if (diff < 0) return '방금';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}주 전`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}
