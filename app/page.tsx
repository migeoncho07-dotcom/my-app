'use client';

import { useState } from 'react';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <main className="container">
      <h1>🎉 내 앱이 실행됐어요!</h1>
      <p>이 화면이 보이면 셋팅이 잘 된 거예요.</p>
      <p>이제 클로드에게 "이 화면을 이렇게 바꿔줘"라고 말하면서 만들어 나가면 됩니다.</p>

      <button onClick={() => setCount(count + 1)}>
        눌러보기: {count}
      </button>

      <p className="hint">app/page.tsx 파일이 이 화면입니다.</p>
    </main>
  );
}
