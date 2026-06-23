// 서버 전용 Firebase Admin 초기화.
// 서버리스 함수(/api/...)에서만 사용. 서비스 계정 키로 인증하며
// 보안 규칙을 우회해 invite_codes 같은 보호된 데이터를 안전하게 처리합니다.
// 키는 .env.local / Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT_KEY (JSON 문자열).

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 값이 올바른 JSON이 아닙니다.');
  }
}

const app: App = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(loadServiceAccount()) });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
