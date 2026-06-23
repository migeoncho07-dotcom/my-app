#!/usr/bin/env bash
# 이 프로젝트를 처음 실행하기 위한 자동 셋업 스크립트
# 사용법:  bash setup.sh
set -e

echo "==> 1/2 라이브러리 설치 중... (1~2분 걸릴 수 있어요)"
npm install

echo ""
echo "==> 2/2 설치 완료!"
echo ""
echo "이제 아래 명령으로 앱을 실행하세요:"
echo "    npm run dev"
echo "그 다음 브라우저에서 http://localhost:3000 을 열면 됩니다."
