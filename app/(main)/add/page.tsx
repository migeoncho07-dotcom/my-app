'use client';

export default function AddPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 20px 0', fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>
        장소 추가
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 44 }}>✨</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>장소 추가는 다음 단계예요</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6 }}>
          링크나 텍스트를 붙여넣으면 AI가 자동으로<br />장소 정보를 정리해주는 기능을 만들 거예요.
        </div>
      </div>
    </div>
  );
}
