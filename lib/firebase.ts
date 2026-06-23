// Firebase 초기화 파일
// - 앱 전체에서 이 파일의 auth, db 를 가져다 씁니다.
// - 키는 .env.local 에서 읽어옵니다 (NEXT_PUBLIC_ 접두사 = 브라우저에서 사용 가능).

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

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

// Firestore 를 long-polling 자동감지 모드로 초기화.
// 일부 네트워크/브라우저에서 기본 WebChannel 연결이 막혀 getDoc 이 무한 대기하는
// 문제를 방지합니다. 이미 초기화돼 있으면(HMR 등) 기존 인스턴스를 재사용합니다.
function createDb() {
  try {
    // forceLongPolling: 막힌 네트워크/프록시/모바일망에서도 확실히 연결되도록 강제.
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const db = createDb();
export default app;
