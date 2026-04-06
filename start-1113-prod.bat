@echo off
chcp 65001 >nul
title Sanliurfa.com - PORT 1113 [PRODUCTION]
color 0C
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║              SANLIURFA.COM - PORT 1113                  ║
echo    ║                   PRODUCTION MODE                        ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

IF NOT EXIST "dist\index.html" (
    echo.
    echo [UYARI] Build dosyalari bulunamadi!
    echo Build aliniyor...
    echo.
    call npm run build
    if errorlevel 1 (
        echo [HATA] Build basarisiz!
        pause
        exit /b 1
    )
)

echo.
echo [1/1] Production sunucusu 1113 portunda baslatiliyor...
echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║  Siteyi tarayicida acmak icin:                           ║
echo    ║                                                          ║
echo    ║  http://localhost:1113                                   ║
echo    ║  http://127.0.0.1:1113                                   ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.
echo    PRODUCTION MODU - Gercek sunucu ortami
echo.

set PORT=1113
set NODE_ENV=production
npm run preview:1113

if errorlevel 1 (
    echo.
    echo [HATA] Production sunucusu baslatilamadi!
    pause
)
