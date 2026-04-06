@echo off
chcp 65001 >nul
title Sanliurfa.com - Environment Kontrol
color 0B
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║            ENVIRONMENT KONTROLU                          ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] Node.js kontrol ediliyor...
node --version >nul 2>&1
if errorlevel 1 (
    echo    [X] Node.js bulunamadi!
    echo    Lutfen https://nodejs.org adresinden indirin.
    pause
    exit /b 1
)
echo    [OK] Node.js bulundu
echo.

echo [2/3] Bagimliliklar kontrol ediliyor...
if not exist "node_modules" (
    echo    [!] node_modules bulunamadi. Yukleniyor...
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo    [X] Yukleme basarisiz!
        pause
        exit /b 1
    )
)
echo    [OK] Bagimliliklar tamam
echo.

echo [3/3] .env dosyasi kontrol ediliyor...
if not exist ".env" (
    echo    [!] .env dosyasi bulunamadi!
    echo    .env.example dosyasindan kopyalama yapiliyor...
    copy .env.example .env
    echo.
    echo    [UYARI] Lutfen .env dosyasini acip Supabase bilgilerinizi girin:
    echo    - PUBLIC_SUPABASE_URL
    echo    - PUBLIC_SUPABASE_ANON_KEY
    echo.
    start notepad .env
    pause
) else (
    echo    [OK] .env dosyasi mevcut
    
    findstr /C:"PUBLIC_SUPABASE_URL=your" .env >nul
    if not errorlevel 1 (
        echo    [UYARI] Supabase URL varsayilan degerde!
    )
    
    findstr /C:"PUBLIC_SUPABASE_ANON_KEY=your" .env >nul
    if not errorlevel 1 (
        echo    [UYARI] Supabase Anon Key varsayilan degerde!
    )
)
echo.

echo ================================================
echo    KONTROL TAMAMLANDI!
echo ================================================
echo.
echo Sonraki adimlar:
echo   1. .env dosyasini kontrol edin
secho   2. start.bat ile siteyi baslatin
echo.
pause
