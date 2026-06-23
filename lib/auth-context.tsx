'use client';

// 로그인 상태를 앱 전체에서 공유하는 Context.
// - firebaseUser: Firebase 인증 사용자 (로그인 여부)
// - profile: Firestore users/{uid} 프로필 (닉네임, group_id 등)
// - loading: 최초 인증 상태 확인 중인지
// 화면에서는 useAuth() 한 줄로 가져다 씁니다.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile } from './firestore';
import type { User } from '@/types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  profileError: boolean; // 프로필 '읽기 실패'(네트워크 등) — '프로필 없음'과 구분
  profileErrorMsg: string; // 진단용 실제 에러 메시지
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  const loadProfile = useCallback(async (uid: string) => {
    try {
      // 1) 인증 토큰
      let token = '';
      const cur = auth.currentUser;
      if (cur) {
        try {
          token = await withTimeout(cur.getIdToken(), 8000);
        } catch {
          throw new Error('auth-token-timeout');
        }
      }
      // 2) firestore.googleapis.com 에 '직접 REST' 호출 — 네트워크 자체가 막혔는지 확인
      const pid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      try {
        await withTimeout(
          fetch(
            `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/users/${uid}`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
          ),
          8000
        );
      } catch {
        throw new Error('rest-fetch-timeout'); // 브라우저→firestore 네트워크가 막힘
      }
      // 3) Firebase SDK getDoc — 네트워크는 되는데 SDK 전송만 막히는지 확인
      let p: User | null;
      try {
        p = await withTimeout(getUserProfile(uid), 8000);
      } catch (e: any) {
        throw new Error(e?.code ? `firestore:${e.code}` : 'sdk-getdoc-timeout');
      }
      setProfile(p);
      setProfileError(false);
      setProfileErrorMsg('');
    } catch (e: any) {
      console.error('[profile] load failed:', e);
      setProfile(null);
      setProfileError(true);
      setProfileErrorMsg(e?.message || String(e));
    }
  }, []);

  useEffect(() => {
    // 로그인/로그아웃을 실시간 감지
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // 로그인 직후엔 프로필을 다 불러올 때까지 loading 을 유지해야
        // "프로필 없음"으로 오인해 가입 화면으로 튕기지 않습니다.
        setLoading(true);
        setFirebaseUser(u);
        await loadProfile(u.uid);
        setLoading(false);
      } else {
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) await loadProfile(firebaseUser.uid);
  }, [firebaseUser, loadProfile]);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, profileError, profileErrorMsg, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
