import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // 앱스토어에서 쓰는 고유 ID. 보통 거꾸로 된 도메인 형식.
  appId: 'com.example.myapp',
  appName: 'My App',
  // Next.js가 'next build'로 만들어내는 정적 파일 폴더
  webDir: 'out',
};

export default config;
