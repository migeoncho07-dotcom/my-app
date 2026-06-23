'use client';

import { useRouter } from 'next/navigation';

export default function PlaceDetailPage() {
  const router = useRouter();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 20px 24px' }}>
      <button
        onClick={() => router.back()}
        style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand)', alignSelf: 'flex-start' }}
      >
        ← 뒤로
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>📄</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>장소 상세 화면은 곧 만들어요</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.6 }}>
          커버 이미지, 주소·운영기간·대상연령,<br />지도·길찾기 버튼이 들어갈 거예요.
        </div>
      </div>
    </div>
  );
}
