@echo off
chcp 65001 >nul
title Sanliurfa.com - Baslat
color 0A
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║                                                          ║
echo    ║              SANLIURFA.COM                             ║
echo    ║         Sehir Rehberi - Tarihin Sifir Noktasi          ║
echo    ║                                                          ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.
echo    Port Secenekleri:
echo.
echo    [1] PORT 1111 - Development (Gelistirme Modu)
echo    [2] PORT 1112 - Preview (Build Sonrasi Test)
echo    [3] PORT 1113 - Production (Canli Sunucu)
echo.
echo    [4] Port Yonetici (Tum Secenekler)
echo    [5] Build Al (Production)
echo.
echo    [0] Cikis
echo.
set /p choice="Seciminiz (0-5): "

if "%choice%"=="1" (
    echo.
    echo 1111 portu aciliyor...
    call start-1111-dev.bat
    exit
)

if "%choice%"=="2" (
    echo.
    echo 1112 portu aciliyor...
    call start-1112-preview.bat
    exit
)

if "%choice%"=="3" (
    echo.
    echo 1113 portu aciliyor...
    call start-1113-prod.bat
    exit
)

if "%choice%"=="4" (
    call start-all.bat
    exit
)

if "%choice%"=="5" (
    echo.
    echo Build islemi basliyor...
    cd /d "%~dp0"
    call npm run build
    echo.
    echo Build tamamlandi!
    pause
    exit
)

if "%choice%"=="0" exit

echo Gecersiz secim!
timeout /t 2 >nul
call start.bat
