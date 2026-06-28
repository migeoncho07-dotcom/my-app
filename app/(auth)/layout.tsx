// 로그인/가입/비번찾기 공통 레이아웃.
// 앱셸이 더 이상 스크롤하지 않으므로, 인증 화면은 여기서 자체 스크롤을 가짐
// (키보드가 올라와 내용이 길어지면 이 영역 안에서만 스크롤됨).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {children}
    </div>
  );
}
