// Firebase 초기화 파일
// - 앱 전체에서 이 파일의 auth, db 를 가져다 씁니다.
// - 키는 .env.local 에서 읽어옵니다 (NEXT_PUBLIC_ 접두사 = 브라우저에서 사용 가능).

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.js 는 화면을 여러 번 그리는데, 그때마다 새로 초기화하면 에러가 납니다.
// 이미 만들어진 앱이 있으면 그걸 재사용하도록 처리합니다.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 기본 Firestore 전송 모드 (로컬에서 정상 동작하는 모드).
// long-polling 강제/자동감지가 일부 환경에서 getDoc 을 매달리게 해 제거.
export const db = getFirestore(app);
export default app;
