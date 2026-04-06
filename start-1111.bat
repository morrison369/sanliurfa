@echo off
chcp 65001 >nul
title Sanliurfa.com - Port 1111
color 0A
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║                                                          ║
echo    ║              SANLIURFA.COM - PORT 1111                  ║
echo    ║                                                          ║
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
echo [2/2] Sunucu 1111 portunda baslatiliyor...
echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║  Siteyi tarayicida acmak icin:                           ║
echo    ║                                                          ║
echo    ║  http://localhost:1111                                   ║
echo    ║                                                          ║
echo    ║  VEYA                                                    ║
echo    ║                                                          ║
echo    ║  http://127.0.0.1:1111                                   ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.

npm run dev:1111

if errorlevel 1 (
    echo.
    echo [HATA] Sunucu baslatilamadi!
    echo Port 1111 baska bir uygulama tarafindan kullaniliyor olabilir.
    pause
)
