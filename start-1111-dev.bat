@echo off
chcp 65001 >nul
title Sanliurfa.com - PORT 1111 [DEVELOPMENT]
color 0A
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║              SANLIURFA.COM - PORT 1111                  ║
echo    ║                   DEVELOPMENT MODE                       ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/2] Bagimliliklar kontrol ediliyor...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [HATA] Bagimliliklar yuklenemedi!
    pause
    exit /b 1
)

echo.
echo [2/2] Sunucu 1111 portunda baslatiliyor [DEV]...
echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║  Siteyi tarayicida acmak icin:                           ║
echo    ║                                                          ║
echo    ║  http://localhost:1111                                   ║
echo    ║  http://127.0.0.1:1111                                   ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.
echo    GELISTIRME MODU - Hot reload aktif
echo.

npm run dev:1111

if errorlevel 1 (
    echo.
    echo [HATA] Sunucu baslatilamadi!
    pause
)
