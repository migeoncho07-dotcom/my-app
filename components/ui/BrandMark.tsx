'use client';

// 놀잇터 브랜드 마크 (새 디자인) — 둥근 사각형 + 흰 원(도넛) + 가운데 코랄 점.
// variant='default': 코랄 사각형 (흰 배경 위). variant='splash': 반투명 흰 사각형 (코랄 배경 위).
export default function BrandMark({ size = 74, variant = 'default' }: { size?: number; variant?: 'default' | 'splash' }) {
  const k = size / 74;
  const circle = size * 0.45; // 흰 원 지름
  const dot = size * 0.176; // 가운데 코랄 점 지름
  const splash = variant === 'splash';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18 * k,
        background: splash ? 'rgba(255,255,255,0.22)' : 'var(--brand)',
        border: splash ? '1px solid rgba(255,255,255,0.4)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: splash
          ? '0 22px 44px -14px rgba(0,0,0,.3)'
          : `0 ${16 * k}px ${32 * k}px ${-10 * k}px rgba(255,107,74,.6)`,
        flex: 'none',
      }}
    >
      <div style={{ width: circle, height: circle, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: dot, height: dot, borderRadius: '50%', background: 'var(--brand)' }} />
      </div>
    </div>
  );
}
