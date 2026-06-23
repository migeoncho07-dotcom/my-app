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
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const p = await getUserProfile(uid);
      setProfile(p);
    } catch {
      setProfile(null);
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
      value={{ firebaseUser, profile, loading, refreshProfile, signOut }}
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
