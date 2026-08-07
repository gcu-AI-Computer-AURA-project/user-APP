@echo off
title AURA APK Build
cd /d "C:\Users\USER\Documents\Codex\2026-07-01\figma-ux\aura-app"
echo AURA APK 빌드를 시작합니다.
echo.
echo Git 루트가 사용자 폴더로 잡히는 문제를 피하기 위해 EAS_NO_VCS=1 로 실행합니다.
echo.
set EAS_NO_VCS=1
set EXPO_NO_GIT_STATUS=1
"C:\Program Files\nodejs\npx.cmd" --yes eas-cli@latest build -p android --profile preview --non-interactive
echo.
echo 빌드가 끝났으면 위에 나온 APK 다운로드 링크를 안드로이드에서 열어 설치하세요.
echo.
pause
