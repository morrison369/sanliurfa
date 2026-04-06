@echo off
chcp 65001 >nul
title Sanliurfa.com - Tum Icerikleri Cek
color 0B
cls

echo.
echo    ╔══════════════════════════════════════════════════════════╗
echo    ║                                                          ║
echo    ║           SANLIURFA.COM ICERIK CEKME SISTEMI            ║
echo    ║                                                          ║
echo    ║   1. Web Scraping (Wikipedia + DuckDuckGo)              ║
echo    ║   2. Gorsel Cekme (Wikimedia + Commons)                 ║
echo    ║   3. Supabase'e Aktarim                                  ║
echo    ║                                                          ║
echo    ╚══════════════════════════════════════════════════════════╝
echo.
echo    API Kullanilmadan calisir - Ucretsiz!
echo.
timeout /t 2 >nul

REM Proje dizinine git
cd /d "%~dp0\.."

REM Python kontrolu
python --version >nul 2>&1
if errorlevel 1 (
    echo [HATA] Python bulunamadi!
    echo Lutfen Python 3.11+ kurun: https://python.org
    pause
    exit /b 1
)

echo.
echo [1/5] Python sanal ortami kontrol ediliyor...
if not exist ".venv\Scripts\python.exe" (
    echo    Sanal ortam olusturuluyor...
    python -m venv .venv
)

echo.
echo [2/5] Sanal ortam aktiflestiriliyor...
call .venv\Scripts\activate.bat

echo.
echo [3/5] Bagimliliklar yukleniyor...
pip install -q beautifulsoup4 requests colorama python-dotenv lxml pillow
if errorlevel 1 (
    echo [HATA] Bagimliliklar yuklenemedi!
    pause
    exit /b 1
)

echo.
echo ================================================
echo    ADIM 1: WEB SCRAPING BASLIYOR
echo ================================================
echo.
python scripts\scraping-agent.py
if errorlevel 1 (
    echo [UYARI] Scraping hatasi olustu ama devam ediliyor...
)

echo.
echo ================================================
echo    ADIM 2: GORSELLER CEKILIYOR
echo ================================================
echo.
python scripts\fetch-all-images.py
if errorlevel 1 (
    echo [UYARI] Gorsel cekme hatasi olustu ama devam ediliyor...
)

echo.
echo ================================================
echo    ADIM 3: SUPABASE INSERTLERI HAZIRLANIYOR
echo ================================================
echo.
echo    SQL dosyalari olusturuldu:
echo    - scripts\data\supabase_inserts.sql
echo.
echo    Bu dosyayi Supabase SQL Editor'de calistirin.
echo.

REM Opsiyonel: Supabase Python aktarimi
echo Supabase'e otomatik aktarim yapilsin mi? (E/H)
set /p choice="Secim: "
if /i "%choice%"=="E" (
    echo.
    echo Supabase aktarimi basliyor...
    python scripts\import-to-supabase.py
)

echo.
echo ================================================
echo    TUM ISLEMLER TAMAMLANDI!
echo ================================================
echo.
echo Olusturulan dosyalar:
echo   📁 scripts\data\              - JSON veriler
echo   📁 public\images\historical\ - Tarihi yer gorselleri
echo   📁 public\images\places\     - Mekan gorselleri
echo   📁 public\images\foods\      - Yemek gorselleri
echo.
echo Sonraki adimlar:
echo   1. Gorselleri kontrol edin
echo   2. supabase_inserts.sql dosyasini calistirin
echo   3. npm run dev ile siteyi baslatin
echo.
pause
