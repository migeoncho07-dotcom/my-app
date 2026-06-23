'use client';

// iOS 세그먼트 컨트롤 — ios-material 트랙 위, 선택 칸만 흰색 + 미세 그림자.
// 항목이 많으면 가로 스크롤됩니다.

export interface SegmentOption {
  key: string;
  label: string;
}

export default function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      style={{
        background: 'var(--ios-material)',
        borderRadius: 10,
        padding: 2,
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              flex: '1 0 auto',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? '#fff' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.04)' : 'none',
              transition: 'background .15s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
