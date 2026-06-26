'use client';

// 버튼 — Primary(브랜드색 채움) / Secondary(흰 배경 + 헤어라인)
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  fullWidth = true,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      disabled={disabled}
      style={{
        width: fullWidth ? '100%' : undefined,
        borderRadius: 14,
        padding: isPrimary ? '17px 18px' : '16px 18px',
        fontSize: isPrimary ? 15.5 : 14.5,
        fontWeight: isPrimary ? 700 : 600,
        letterSpacing: '-0.01em',
        transition: 'transform .08s ease, opacity .15s ease, box-shadow .15s ease',
        opacity: disabled ? 0.5 : 1,
        ...(isPrimary
          ? {
              background: 'var(--brand)',
              color: '#fff',
              // v4 갤럭시: 브랜드색 입체 그림자
              boxShadow: disabled ? 'none' : '0 16px 32px -12px rgba(255,107,74,.6)',
            }
          : {
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px -6px rgba(0,0,0,.25)',
            }),
        ...style,
      }}
      onPointerDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
