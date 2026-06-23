/** @type {import('next').NextConfig} */
const nextConfig = {
  // 앱스토어용으로 정적 파일을 만들 때 사용 (Capacitor가 이 폴더를 감쌈)
  output: 'export',
  images: { unoptimized: true },
};

module.exports = nextConfig;
