@echo off
title AURA Expo Login
cd /d "C:\Users\USER\Documents\Codex\2026-07-01\figma-ux\aura-app"
echo AURA Expo 로그인 창입니다.
echo.
echo Expo 계정 이메일/비밀번호를 이 창에 입력하세요.
echo 비밀번호는 입력해도 화면에 안 보이는 게 정상입니다.
echo.
"C:\Program Files\nodejs\npx.cmd" --yes eas-cli@latest login
echo.
echo 로그인이 끝났으면 이 창에서 아래 명령을 실행하세요:
echo npm run build:apk
echo.
pause
