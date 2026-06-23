'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

// Firebase 에러 코드를 한글 안내로 변환
function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않아요.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 맞지 않아요.';
    case 'auth/too-many-requests':
      return '잠시 후 다시 시도해 주세요.';
    default:
      return '로그인 중 문제가 생겼어요. 다시 시도해 주세요.';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/home');
    } catch (e: any) {
      setError(authErrorMessage(e?.code ?? ''));
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, padding: '64px 24px 32px', display: 'flex', flexDirection: 'column' }}>
      {/* 로고 / 타이틀 */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>아이랑</div>
        <div
          style={{
            fontSize: 14.5,
            color: 'var(--text-secondary)',
            fontWeight: 500,
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          우리 아이랑 갈 곳, 가족이랑 같이 모아요
        </div>
      </div>

      {/* 입력 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <InputField
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <InputField
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
      </div>

      {/* 비밀번호 찾기 */}
      <div style={{ textAlign: 'right', marginTop: 12 }}>
        <Link href="/forgot" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      {/* 에러 */}
      {error && (
        <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, margin: '14px 4px 0' }}>
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button onClick={handleLogin} disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </Button>
        <Link href="/signup" style={{ width: '100%' }}>
          <Button variant="secondary">이메일로 가입하기</Button>
        </Link>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--placeholder)',
          marginTop: 'auto',
          paddingTop: 28,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        가입하면 나만의 공간이 만들어져요.<br />
        친구는 초대 코드로 함께할 수 있어요.
      </div>
    </div>
  );
}
