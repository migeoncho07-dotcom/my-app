'use client';

export default function MapPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 20px 0', fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em' }}>
        지도
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 44 }}>🗺️</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>지도는 곧 만들어요</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6 }}>
          등록한 장소를 지도에서 한눈에 볼 수 있게<br />카카오맵으로 준비할게요.
        </div>
      </div>
    </div>
  );
}
