'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { AVATAR_COLORS, randomAvatarColor } from '@/lib/firestore';
import { completeSignup } from '@/lib/signup-client';
import { category } from '@/styles/tokens';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';
import type { Category } from '@/types';

function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return '이미 가입된 이메일이에요. 로그인해 주세요.';
    case 'auth/invalid-email': return '이메일 형식이 올바르지 않아요.';
    case 'auth/weak-password': return '비밀번호 조건을 모두 만족해 주세요.';
    default: return '가입 중 문제가 생겼어요. 다시 시도해 주세요.';
  }
}
const PW_RULES = [
  { key: 'len', label: '8자 이상', test: (p: string) => p.length >= 8 },
  { key: 'letter', label: '영문', test: (p: string) => /[A-Za-z]/.test(p) },
  { key: 'number', label: '숫자', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: '특수문자', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
const isPwValid = (p: string) => PW_RULES.every((r) => r.test(p));
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const CATS = Object.keys(category) as Category[];

type EmailStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';
// 0 이메일 · 1 비번 · 2 초대코드 · 3 가입완료 · 4 프로필 · 5 관심·동네 · 6 환영

export default function SignupPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, profileError, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);

  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(randomAvatarColor());
  const [interests, setInterests] = useState<Category[]>([]);
  const [neighborhood, setNeighborhood] = useState('');
  const [kidAges, setKidAges] = useState<number[]>([]);

  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 진입 시 한 번만: 이미 로그인 상태면 상황에 맞게
  const inited = useRef(false);
  useEffect(() => {
    if (authLoading || inited.current) return;
    inited.current = true;
    if (firebaseUser && profile) router.replace('/home');
    else if (firebaseUser && profileError) router.replace('/home');
    else if (firebaseUser && !profile) {
      setAccountUid(firebaseUser.uid);
      if (firebaseUser.email) setEmail(firebaseUser.email);
      setStep(4); // 계정만 있고 프로필 미완 → 프로필부터
    }
  }, [authLoading, firebaseUser, profile, profileError, router]);

  // 이메일 실시간 중복 체크
  useEffect(() => {
    if (accountUid) return;
    const e = email.trim();
    if (!e) return setEmailStatus('idle');
    if (!isEmail(e)) return setEmailStatus('invalid');
    setEmailStatus('checking');
    const t = setTimeout(async () => {
      try {
        const m = await fetchSignInMethodsForEmail(auth, e);
        setEmailStatus(m.length > 0 ? 'taken' : 'available');
      } catch { setEmailStatus('idle'); }
    }, 500);
    return () => clearTimeout(t);
  }, [email, accountUid]);

  function nextFromEmail() {
    if (emailStatus === 'taken') return setError('이미 가입된 이메일이에요.');
    if (emailStatus !== 'available') return setError('사용 가능한 이메일을 입력해 주세요.');
    setError(''); setStep(1);
  }

  async function createAccount() {
    if (accountUid) { setError(''); setStep(2); return; }
    if (!isPwValid(password)) return setError('비밀번호는 영문·숫자·특수문자를 모두 넣어 8자 이상으로 해주세요.');
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요.');
    setError(''); setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      setAccountUid(cred.user.uid);
      setStep(2);
    } catch (e: any) {
      setError(authErrorMessage(e?.code ?? ''));
      if (e?.code === 'auth/email-already-in-use') { setEmailStatus('taken'); setStep(0); }
    } finally { setBusy(false); }
  }

  // 가입 마무리 (관심·동네 후 또는 건너뛰기)
  async function finalize() {
    if (!nickname.trim()) { setError('닉네임을 입력해 주세요.'); setStep(4); return; }
    setError(''); setBusy(true);
    try {
      await completeSignup({
        nickname: nickname.trim(), avatarColor: avatar,
        interests, neighborhood: neighborhood.trim(), kidAges,
        inviteCode: inviteCode.length === 6 ? inviteCode : undefined,
      });
      await refreshProfile();
      setStep(6);
    } catch (e: any) {
      setError(e?.message || '가입 마무리에 실패했어요.');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '52px 24px 28px' }}>
      {/* 진행 점 */}
      {step < 6 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 26 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? 'var(--brand)' : 'var(--border)', transition: 'background .2s' }} />
          ))}
        </div>
      )}

      {step === 0 && (
        <>
          <Title t="이메일을 입력해요" s="로그인에 사용할 이메일이에요" />
          <InputField label="이메일" type="email" inputMode="email" autoComplete="email" placeholder="이메일 주소"
            value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && nextFromEmail()} />
          <EmailLine status={emailStatus} />
          <Err e={error} />
          <Bottom>
            <Button onClick={nextFromEmail} disabled={emailStatus !== 'available'}>다음</Button>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', marginTop: 16, fontWeight: 500 }}>
              이미 계정이 있나요? <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>로그인</Link>
            </div>
          </Bottom>
        </>
      )}

      {step === 1 && (
        <>
          <Title t="비밀번호를 정해요" s={email} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <InputField label="비밀번호" type="password" placeholder="영문·숫자·특수문자 조합" value={password} onChange={(e) => setPassword(e.target.value)} />
              <PwChecklist password={password} />
            </div>
            <div>
              <InputField label="비밀번호 확인" type="password" placeholder="비밀번호를 한 번 더 입력" value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createAccount()} />
              {passwordConfirm.length > 0 && (
                <div style={{ fontSize: 11.5, fontWeight: 600, margin: '8px 4px 0', color: password === passwordConfirm ? '#1C8049' : 'var(--brand-strong)' }}>
                  {password === passwordConfirm ? '✓ 비밀번호가 일치해요' : '비밀번호가 일치하지 않아요'}
                </div>
              )}
            </div>
          </div>
          <Err e={error} />
          <Bottom>
            <Button onClick={createAccount} disabled={busy}>{busy ? '계정 만드는 중…' : '다음'}</Button>
            <Back onClick={() => { setError(''); setStep(0); }} />
          </Bottom>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: '#FFEAE2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF6B4A" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </div>
          <Title t="초대 코드를 입력해 주세요" s="친구가 보내준 6자리를 넣어주세요." />
          <CodeInput value={inviteCode} onChange={setInviteCode} />
          <div style={{ background: '#FFF7E8', border: '1px solid #F3E4C0', borderRadius: 12, padding: '12px 14px', margin: '16px 0 8px', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={{ flex: 'none', marginTop: 1 }}>⚠️</span>
            <div style={{ fontSize: 11.5, color: '#9a7b2e', lineHeight: 1.55, fontWeight: 500 }}>초대 코드는 <b>한 번만</b> 쓸 수 있어요. 보낼 때마다 새로 만들어지고, 쓰거나 만료되면 못 써요.</div>
          </div>
          <Err e={error} />
          <Bottom>
            <Button onClick={() => { setError(''); setStep(3); }} disabled={inviteCode.length !== 6}>가입 완료하기</Button>
            <button onClick={() => { setInviteCode(''); setError(''); setStep(3); }} style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', padding: 8 }}>코드 없이 새로 시작하기</button>
          </Bottom>
        </>
      )}

      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#E2F5E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 20 }}>가입 완료!</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.65, marginTop: 12 }}>이제 프로필만 꾸미면 끝이에요.</div>
          <div style={{ marginTop: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 16px', fontSize: 13.5, fontWeight: 700 }}>{email}</div>
          <div style={{ width: '100%', marginTop: 32 }}><Button onClick={() => setStep(4)}>시작하기</Button></div>
        </div>
      )}

      {step === 4 && (
        <>
          <Title t="프로필을 만들어요" s="이름과 색을 골라주세요" />
          <InputField label="닉네임" placeholder="예: 지은맘" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: '22px 4px 12px' }}>아바타 색</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {AVATAR_COLORS.map((c) => (
              <button key={c} onClick={() => setAvatar(c)} aria-label={`색상 ${c}`}
                style={{ width: 44, height: 44, borderRadius: '50%', background: c, border: avatar === c ? '3px solid #fff' : '3px solid transparent', boxShadow: avatar === c ? `0 0 0 2px ${c}` : 'none', transition: 'box-shadow .15s' }} />
            ))}
          </div>
          <Err e={error} />
          <Bottom>
            <Button onClick={() => { if (!nickname.trim()) return setError('닉네임을 입력해 주세요.'); setError(''); setStep(5); }}>다음</Button>
          </Bottom>
        </>
      )}

      {step === 5 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={finalize} disabled={busy} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', padding: 4 }}>건너뛰기</button>
          </div>
          <Title t="어떤 정보가 제일 궁금하세요?" s="고른 카테고리를 홈에서 먼저 보여드려요" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
            {CATS.map((c) => {
              const on = interests.includes(c);
              return (
                <button key={c} onClick={() => setInterests((prev) => on ? prev.filter((x) => x !== c) : [...prev, c])}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700,
                    background: on ? 'var(--brand)' : 'var(--surface)', color: on ? '#fff' : 'var(--text-secondary)', border: on ? 'none' : '1.5px solid var(--border)' }}>
                  {category[c].emoji} {category[c].label} {on && '✓'}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, margin: '0 2px 11px' }}>주로 어디서 노시나요?</div>
          <InputField placeholder="예: 서울 금천구" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />

          <div style={{ fontSize: 13.5, fontWeight: 700, margin: '20px 2px 11px' }}>우리 아이 나이 <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 12 }}>(여러 명 가능)</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kidAges.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#FFF3EE', border: '1.5px solid var(--brand)', color: '#E85C2E', borderRadius: 10, padding: '7px 11px', fontSize: 13, fontWeight: 700 }}>
                <button onClick={() => setKidAges((p) => p.map((v, idx) => idx === i ? Math.max(0, v - 1) : v))}>−</button>
                {a}살
                <button onClick={() => setKidAges((p) => p.map((v, idx) => idx === i ? Math.min(18, v + 1) : v))}>＋</button>
                <button onClick={() => setKidAges((p) => p.filter((_, idx) => idx !== i))} style={{ color: 'var(--placeholder)' }}>×</button>
              </div>
            ))}
            <button onClick={() => setKidAges((p) => [...p, 3])} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>＋ 추가</button>
          </div>

          <Err e={error} />
          <Bottom>
            <Button onClick={finalize} disabled={busy}>{busy ? '마무리하는 중…' : '거의 다 됐어요'}</Button>
          </Bottom>
        </>
      )}

      {step === 6 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 18 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>환영해요, {nickname}님!</div>
          <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.65, marginTop: 14 }}>이제 놀잇터를 쓸 수 있어요.<br />아이랑 갈 곳을 모아볼까요?</div>
          <div style={{ width: '100%', marginTop: 36 }}><Button onClick={() => router.replace('/home')}>둘러보기</Button></div>
        </div>
      )}
    </div>
  );
}

/* ── 6칸 초대코드 입력 ── */
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 8, marginTop: 4 }} onClick={() => ref.current?.focus()}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const ch = value[i] || '';
        const focused = i === value.length;
        return (
          <div key={i} style={{ flex: 1, aspectRatio: '1', background: 'var(--surface)', border: `1.5px solid ${ch || focused ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
            {ch}
          </div>
        );
      })}
      <input ref={ref} value={value} autoFocus inputMode="text" autoCapitalize="characters" maxLength={6}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
    </div>
  );
}

function Title({ t, s }: { t: string; s: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.25 }}>{t}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 7, wordBreak: 'break-all' }}>{s}</div>
    </div>
  );
}
function PwChecklist({ password }: { password: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '10px 4px 0' }}>
      {PW_RULES.map((r) => {
        const ok = r.test(password);
        return <span key={r.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: ok ? '#1C8049' : 'var(--text-tertiary)' }}><span style={{ fontWeight: 800 }}>{ok ? '✓' : '·'}</span>{r.label}</span>;
      })}
    </div>
  );
}
function EmailLine({ status }: { status: EmailStatus }) {
  if (status === 'idle') return null;
  const m: Record<Exclude<EmailStatus, 'idle'>, { t: string; c: string }> = {
    checking: { t: '확인 중…', c: 'var(--text-tertiary)' },
    available: { t: '✓ 사용 가능한 이메일이에요', c: '#1C8049' },
    taken: { t: '이미 가입된 이메일이에요', c: 'var(--brand-strong)' },
    invalid: { t: '이메일 형식을 확인해 주세요', c: 'var(--brand-strong)' },
  };
  return <div style={{ fontSize: 12, fontWeight: 600, color: m[status].c, margin: '10px 4px 0' }}>{m[status].t}</div>;
}
function Err({ e }: { e: string }) {
  if (!e) return null;
  return <div style={{ color: 'var(--brand-strong)', fontSize: 13, fontWeight: 600, margin: '14px 4px 0' }}>{e}</div>;
}
function Bottom({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>;
}
function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ marginTop: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--text-tertiary)', padding: 8 }}>이전</button>;
}
