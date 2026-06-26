'use client';

// 놀잇터 브랜드 마크 — 디자인 시안 v2 기준.
// 코랄 둥근 사각형 + 가운데 흰 원 + 오른쪽아래 복숭아 점(코랄 테두리).
// size를 바꾸면 모든 요소가 74px 시안 비율로 함께 커집니다.
export default function BrandMark({ size = 74 }: { size?: number }) {
  const k = size / 74; // 시안(74px) 대비 배율
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18 * k,
        background: 'var(--brand)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 ${16 * k}px ${32 * k}px ${-10 * k}px rgba(255,107,74,.6)`,
        position: 'relative',
        flex: 'none',
      }}
    >
      <div style={{ width: 30 * k, height: 30 * k, borderRadius: '50%', background: '#fff' }} />
      <div
        style={{
          position: 'absolute',
          width: 13 * k,
          height: 13 * k,
          borderRadius: '50%',
          background: '#FFB59E',
          right: 18 * k,
          bottom: 18 * k,
          border: `${Math.max(2, 2 * k)}px solid var(--brand)`,
        }}
      />
    </div>
  );
}
