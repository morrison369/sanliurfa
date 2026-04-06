@echo off
chcp 65001 >nul
title Sanliurfa.com Web Scraping Agent
cls

echo ╔══════════════════════════════════════════════════════════╗
echo ║         SANLIURFA WEB SCRAPING AGENT v2.0               ║
echo ║                   API'siz Calisma                        ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Proje dizinine git
cd /d "%~dp0\.."

REM Python sanal ortam kontrolu
if not exist ".venv\Scripts\python.exe" (
    echo [1/4] Python sanal ortami olusturuluyor...
    python -m venv .venv
    if errorlevel 1 (
        echo HATA: Python sanal ortami olusturulamadi!
        echo Python'un kurulu oldugundan emin olun.
        pause
        exit /b 1
    )
)

echo [2/4] Sanal ortam aktiflestiriliyor...
call .venv\Scripts\activate.bat

echo [3/4] Bagimliliklar kontrol ediliyor...
pip install -q beautifulsoup4 requests colorama python-dotenv lxml

echo [4/4] Agent calistiriliyor...
echo.
echo ════════════════════════════════════════════════════════════
echo.

python scripts\scraping-agent.py

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo Islem tamamlandi!
echo.
echo Veriler su konuma kaydedildi:
echo   - scripts\data\tarihi_yerler.json
echo   - scripts\data\restoranlar.json
echo   - scripts\data\oteller.json
echo   - scripts\data\supabase_inserts.sql
echo.
pause
