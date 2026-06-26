'use client';

// 입력 필드 — 흰 배경 + 헤어라인, 포커스 시 브랜드색 1.5px 보더
import { useState, type InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function InputField({
  label,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            margin: '0 4px 8px',
          }}
        >
          {label}
        </div>
      )}
      <input
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          width: '100%',
          background: 'var(--surface)',
          borderRadius: 14,
          padding: '15px 16px',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--text-primary)',
          border: focused
            ? '1.5px solid var(--brand)'
            : '1px solid var(--border)',
          boxShadow: focused ? 'none' : '0 2px 8px -6px rgba(0,0,0,.25)',
          transition: 'border-color .15s ease, box-shadow .15s ease',
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}
