/** @type {import('next').NextConfig} */
const nextConfig = {
  // 주의: 'output: export'(정적 내보내기)는 빼두었습니다.
  // 아이랑은 서버 API(/api/parse, /api/kakao 등)가 필요해서 Vercel의 일반 서버 모드로 배포합니다.
  // 앱스토어용 Capacitor 빌드는 나중에 server.url 로 Vercel 주소를 가리키는 방식으로 처리합니다.
  images: { unoptimized: true },
};

module.exports = nextConfig;
