'use client';

// 모든 메뉴 화면이 동일한 위치/크기의 라지 타이틀 헤더를 쓰도록 하는 공용 컴포넌트.
// 위치 기준은 홈(메인) 헤더와 100% 동일: 좌우 22px, 상단 = 노치(safe-area) + 22px.
// 디자인 시안 v2의 large-title(27px / 800 / -0.035em)을 따른다.
import type { ReactNode } from 'react';

export const HEADER_PAD_TOP = 'calc(env(safe-area-inset-top, 0px) + 22px)';

export default function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: `${HEADER_PAD_TOP} 22px 0`,
      }}
    >
      <div>
        {subtitle && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 2 }}>
            {subtitle}
          </div>
        )}
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          {title}
        </div>
      </div>
      {right}
    </div>
  );
}
