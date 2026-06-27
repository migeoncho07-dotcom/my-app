'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

function resetErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않아요.';
    case 'auth/too-many-requests':
      return '잠시 후 다시 시도해 주세요.';
    default:
      return '메일 전송 중 문제가 생겼어요. 다시 시도해 주세요.';
  }
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e: any) {
      setError(resetErrorMessage(e?.code ?? ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '64px 24px 32px', display: 'flex', flexDirection: 'column' }}>
      {!sent ? (
        <>
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.25 }}>
              비밀번호 재설정
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 8, lineHeight: 1.6 }}>
              가입한 이메일을 입력하면<br />
              비밀번호를 새로 정할 수 있는 링크를 보내드려요.
            </div>
          </div>

          <InputField
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          {error && (
            <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, margin: '14px 4px 0' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 26 }}>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? '보내는 중…' : '재설정 메일 보내기'}
            </Button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 28 }}>
            <Link href="/login" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>
              로그인으로 돌아가기
            </Link>
          </div>
        </>
      ) : (
        // 전송 완료 화면
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>📩</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>메일을 보냈어요</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.65, marginTop: 14 }}>
            <b style={{ color: 'var(--text-primary)' }}>{email}</b> 으로<br />
            비밀번호 재설정 링크를 보냈어요.<br />
            메일함(스팸함도!)을 확인해 주세요.
          </div>
          <div style={{ width: '100%', marginTop: 36 }}>
            <Link href="/login" style={{ width: '100%' }}>
              <Button>로그인으로 돌아가기</Button>
            </Link>
          </div>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', padding: 8 }}
          >
            메일이 안 왔어요 · 다시 보내기
          </button>
        </div>
      )}
    </div>
  );
}
