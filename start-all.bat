@echo off
chcp 65001 >nul
title Sanliurfa.com - Multi Port Manager
color 0B
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║         SANLIURFA.COM - PORT YONETICISI                 ║
echo    ║              1111 - 1112 - 1113                         ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.
echo    [1] PORT 1111 - Development (Gelistirme)
echo    [2] PORT 1112 - Preview (Build Test)
echo    [3] PORT 1113 - Production (Canli Sunucu)
echo    [4] Build Al (Production icin)
echo    [5] Tum Portlari Kontrol Et
echo    [0] Cikis
echo.
set /p choice="Seciminiz (0-5): "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto preview
if "%choice%"=="3" goto prod
if "%choice%"=="4" goto build
if "%choice%"=="5" goto check
if "%choice%"=="0" goto exit
goto invalid

:dev
call start-1111-dev.bat
exit

:preview
call start-1112-preview.bat
exit

:prod
call start-1113-prod.bat
exit

:build
echo.
echo Build islemi basliyor...
cd /d "%~dp0"
call npm run build
echo.
echo Build tamamlandi!
pause
exit

:check
echo.
echo Portlar kontrol ediliyor...
echo.
echo 1111:
netstat -ano | findstr :1111
echo.
echo 1112:
netstat -ano | findstr :1112
echo.
echo 1113:
netstat -ano | findstr :1113
echo.
pause
exit

:invalid
echo Gecersiz secim!
timeout /t 2 >nul
call start-all.bat

:exit
exit
