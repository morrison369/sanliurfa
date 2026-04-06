@echo off
chcp 65001 >nul
title Sanliurfa.com - PORT 1112 [PREVIEW]
color 0E
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║              SANLIURFA.COM - PORT 1112                  ║
echo    ║                    PREVIEW MODE                          ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

IF NOT EXIST "dist\index.html" (
    echo.
    echo [HATA] Build dosyalari bulunamadi!
    echo Once build almaniz gerekiyor:
    echo   npm run build
    echo.
    pause
    exit /b 1
)

echo.
echo [1/1] Preview sunucusu 1112 portunda baslatiliyor...
echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║  Siteyi tarayicida acmak icin:                           ║
echo    ║                                                          ║
echo    ║  http://localhost:1112                                   ║
echo    ║  http://127.0.0.1:1112                                   ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.
echo    PREVIEW MODU - Build sonrasi test
echo.

npm run preview:1112

if errorlevel 1 (
    echo.
    echo [HATA] Preview sunucusu baslatilamadi!
    pause
)
