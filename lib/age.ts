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
