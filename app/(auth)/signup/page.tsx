'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { createUserWithNewGroup, AVATAR_COLORS, randomAvatarColor } from '@/lib/firestore';
import { joinWithInviteCode } from '@/lib/invite-client';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일이에요. 로그인해 주세요.';
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않아요.';
    case 'auth/weak-password':
      return '비밀번호 조건을 모두 만족해 주세요.';
    default:
      return '가입 중 문제가 생겼어요. 다시 시도해 주세요.';
  }
}

// 비밀번호 규칙: 영문 + 숫자 + 특수문자 모두 포함, 8자 이상 (순서 무관)
const PW_RULES = [
  { key: 'len', label: '8자 이상', test: (p: string) => p.length >= 8 },
  { key: 'letter', label: '영문', test: (p: string) => /[A-Za-z]/.test(p) },
  { key: 'number', label: '숫자', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: '특수문자', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function isPasswordValid(p: string): boolean {
  return PW_RULES.every((r) => r.test(p));
}

function isEmailFormatValid(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// 단계: 0 이메일 · 1 비밀번호 · 2 프로필 · 3 환영
type EmailStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

export default function SignupPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);

  // 입력값
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(randomAvatarColor());
  const [inviteCode, setInviteCode] = useState('');

  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false); // 계정 생성 중
  const [loading, setLoading] = useState(false); // 프로필 저장 중

  // 진입 시 한 번만: 이미 로그인된 상태면 상황에 맞게 처리
  const initedRef = useRef(false);
  useEffect(() => {
    if (authLoading || initedRef.current) return;
    initedRef.current = true;
    if (firebaseUser && profile) {
      router.replace('/home'); // 이미 가입 완료 → 홈
    } else if (firebaseUser && !profile) {
      // 계정만 만들고 프로필 미완 → 프로필 단계부터 이어서
      setAccountUid(firebaseUser.uid);
      if (firebaseUser.email) setEmail(firebaseUser.email);
      setStep(2);
    }
  }, [authLoading, firebaseUser, profile, router]);

  // 이메일 실시간 중복 체크 (입력 멈추면 0.5초 뒤 확인)
  useEffect(() => {
    if (accountUid) return; // 이미 계정 만들었으면 체크 안 함
    const e = email.trim();
    if (!e) {
      setEmailStatus('idle');
      return;
    }
    if (!isEmailFormatValid(e)) {
      setEmailStatus('invalid');
      return;
    }
    setEmailStatus('checking');
    const t = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, e);
        setEmailStatus(methods.length > 0 ? 'taken' : 'available');
      } catch {
        setEmailStatus('idle'); // 확인 실패 시엔 막지 않음 (가입 시 다시 검증됨)
      }
    }, 500);
    return () => clearTimeout(t);
  }, [email, accountUid]);

  // --- 단계 0: 이메일 ---
  function nextFromEmail() {
    if (emailStatus === 'taken') return setError('이미 가입된 이메일이에요.');
    if (emailStatus !== 'available') return setError('사용 가능한 이메일을 입력해 주세요.');
    setError('');
    setStep(1);
  }

  // --- 단계 1: 비밀번호 → 계정 생성 ---
  async function createAccount() {
    if (accountUid) {
      setError('');
      setStep(2);
      return;
    }
    if (!isPasswordValid(password))
      return setError('비밀번호는 영문·숫자·특수문자를 모두 넣어 8자 이상으로 해주세요.');
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요.');

    setError('');
    setCreating(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      setAccountUid(cred.user.uid);
      setStep(2);
    } catch (e: any) {
      setError(authErrorMessage(e?.code ?? ''));
      if (e?.code === 'auth/email-already-in-use') {
        setEmailStatus('taken');
        setStep(0); // 이메일 단계로 되돌리기
      }
    } finally {
      setCreating(false);
    }
  }

  // --- 단계 2: 프로필 → 프로필/그룹 저장 후 완료 ---
  async function finishSignup() {
    if (!nickname.trim()) return setError('닉네임을 입력해 주세요.');
    const uid = accountUid ?? auth.currentUser?.uid;
    if (!uid) {
      setError('계정 정보를 찾을 수 없어요. 처음부터 다시 해주세요.');
      setStep(0);
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (inviteCode.trim()) {
        // 초대 코드가 있으면 친구 그룹에 합류 (서버에서 처리)
        await joinWithInviteCode(inviteCode.trim(), nickname.trim(), avatar);
      } else {
        // 없으면 나만의 새 그룹 생성
        await createUserWithNewGroup({
          uid,
          email: (email || auth.currentUser?.email || '').trim(),
          nickname: nickname.trim(),
          avatarColor: avatar,
          kidBirthdays: [], // 아이 정보는 나중에 '나' 탭에서 입력
        });
      }
      await refreshProfile();
      setStep(3);
    } catch (e: any) {
      setError(e?.message || '저장 중 문제가 생겼어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, padding: '56px 24px 32px', display: 'flex', flexDirection: 'column' }}>
      {/* 진행 점 (입력 3단계) */}
      {step < 3 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                background: i <= step ? 'var(--brand)' : 'var(--border)',
                transition: 'background .2s',
              }}
            />
          ))}
        </div>
      )}

      {/* ── 단계 0: 이메일 ── */}
      {step === 0 && (
        <>
          <Title title="이메일을 입력해요" sub="로그인에 사용할 이메일이에요" />
          <InputField
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && nextFromEmail()}
          />
          <EmailStatusLine status={emailStatus} />
          <ErrorText error={error} />
          <BottomArea>
            <Button onClick={nextFromEmail} disabled={emailStatus !== 'available'}>
              다음
            </Button>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', marginTop: 16, fontWeight: 500 }}>
              이미 계정이 있나요?{' '}
              <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>
                로그인
              </Link>
            </div>
          </BottomArea>
        </>
      )}

      {/* ── 단계 1: 비밀번호 ── */}
      {step === 1 && (
        <>
          <Title title="비밀번호를 정해요" sub={email} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <InputField
                label="비밀번호"
                type="password"
                placeholder="영문·숫자·특수문자 조합"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordChecklist password={password} />
            </div>
            <div>
              <InputField
                label="비밀번호 확인"
                type="password"
                placeholder="비밀번호를 한 번 더 입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAccount()}
              />
              {passwordConfirm.length > 0 && (
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    margin: '8px 4px 0',
                    color: password === passwordConfirm ? '#1F9E57' : 'var(--brand-strong)',
                  }}
                >
                  {password === passwordConfirm ? '✓ 비밀번호가 일치해요' : '비밀번호가 일치하지 않아요'}
                </div>
              )}
            </div>
          </div>
          <ErrorText error={error} />
          <BottomArea>
            <Button onClick={createAccount} disabled={creating}>
              {creating ? '계정 만드는 중…' : '다음'}
            </Button>
            <BackButton onClick={() => { setError(''); setStep(0); }} />
          </BottomArea>
        </>
      )}

      {/* ── 단계 2: 프로필 ── */}
      {step === 2 && (
        <>
          <Title title="프로필을 만들어요" sub="이름과 색을 골라주세요" />
          <InputField
            label="닉네임"
            placeholder="예: 지은맘"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '22px 4px 12px' }}>
            아바타 색
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setAvatar(c)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: c,
                  border: avatar === c ? '3px solid #fff' : '3px solid transparent',
                  boxShadow: avatar === c ? `0 0 0 2px ${c}` : 'none',
                  transition: 'box-shadow .15s',
                }}
                aria-label={`색상 ${c}`}
              />
            ))}
          </div>

          {/* 초대 코드 (선택) */}
          <div style={{ marginTop: 24 }}>
            <InputField
              label="초대 코드 (선택)"
              placeholder="친구에게 받은 6자리 코드"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              style={{ letterSpacing: '0.15em', fontWeight: 700 }}
            />
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500, margin: '8px 4px 0', lineHeight: 1.5 }}>
              코드를 넣으면 친구 그룹에 합류해요. 없으면 나만의 공간이 만들어져요.
            </div>
          </div>

          <ErrorText error={error} />
          <BottomArea>
            <Button onClick={finishSignup} disabled={loading}>
              {loading ? '저장하는 중…' : '가입 완료'}
            </Button>
          </BottomArea>
        </>
      )}

      {/* ── 단계 3: 환영 ── */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em' }}>
            환영해요, {nickname}님!
          </div>
          <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.65, marginTop: 14 }}>
            나만의 공간이 만들어졌어요.<br />
            이제 아이랑 갈 곳을 모아볼까요?
          </div>
          <div style={{ width: '100%', marginTop: 40 }}>
            <Button onClick={() => router.replace('/home')}>시작하기</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 작은 보조 컴포넌트들 ── */

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.25 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 7, wordBreak: 'break-all' }}>{sub}</div>
    </div>
  );
}

function EmailStatusLine({ status }: { status: EmailStatus }) {
  if (status === 'idle') return null;
  const map: Record<Exclude<EmailStatus, 'idle'>, { text: string; color: string }> = {
    checking: { text: '확인 중…', color: 'var(--text-tertiary)' },
    available: { text: '✓ 사용 가능한 이메일이에요', color: '#1F9E57' },
    taken: { text: '이미 가입된 이메일이에요', color: 'var(--brand-strong)' },
    invalid: { text: '이메일 형식을 확인해 주세요', color: 'var(--brand-strong)' },
  };
  const { text, color } = map[status];
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color, margin: '10px 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{text}</span>
      {status === 'taken' && (
        <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>
          로그인하기
        </Link>
      )}
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '10px 4px 0' }}>
      {PW_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <span
            key={r.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 600,
              color: ok ? '#1F9E57' : 'var(--text-tertiary)',
            }}
          >
            <span style={{ fontWeight: 800 }}>{ok ? '✓' : '·'}</span>
            {r.label}
          </span>
        );
      })}
    </div>
  );
}

function ErrorText({ error }: { error: string }) {
  if (!error) return null;
  return <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, margin: '14px 4px 0' }}>{error}</div>;
}

function BottomArea({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ marginTop: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--text-tertiary)', padding: 8 }}
    >
      이전
    </button>
  );
}
