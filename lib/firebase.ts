// Firebase 초기화 파일
// - 앱 전체에서 이 파일의 auth, db 를 가져다 씁니다.
// - 키 우선순위: (1) 환경변수(.env.local / Vercel) → (2) 아래 기본값.
//   Firebase 웹 설정(apiKey 등 6개)은 '비밀'이 아니라 브라우저에 어차피 노출되는
//   공개 값입니다. 보안은 이 키가 아니라 firestore.rules(보안 규칙)가 담당합니다.
//   그래서 환경변수가 없는 환경(예: 회사 컴퓨터, 새 배포)에서도 앱이 바로 뜨도록
//   기본값을 코드에 둡니다. 환경변수가 있으면 항상 그쪽이 우선합니다.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBZD3C5pGAM4z_bfCjZ1hRxh1QH_TrMEkg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'noleattoe.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'noleattoe',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'noleattoe.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '698018404857',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:698018404857:web:27e379f725c46ae8520528',
};

// Next.js 는 화면을 여러 번 그리는데, 그때마다 새로 초기화하면 에러가 납니다.
// 이미 만들어진 앱이 있으면 그걸 재사용하도록 처리합니다.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 기본 Firestore 전송 모드 (로컬에서 정상 동작하는 모드).
// long-polling 강제/자동감지가 일부 환경에서 getDoc 을 매달리게 해 제거.
export const db = getFirestore(app);
export default app;
