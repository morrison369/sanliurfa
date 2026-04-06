# Şanlıurfa.com Windows Kurulum Scripti
# Yönetici olarak çalıştırın: PowerShell -ExecutionPolicy Bypass -File setup-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Sanliurfa.com Windows Kurulumu" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Node.js versiyon kontrolu
Write-Host "[1/7] Node.js kontrol ediliyor..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Node.js bulunamadı. Lütfen https://nodejs.org adresinden Node.js 20 LTS indirin." -ForegroundColor Red
    Write-Host "Kurulum dosyası indiriliyor..." -ForegroundColor Cyan
    
    # Node.js 20.11.0 LTS indir
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $output = "$env:TEMP\node-v20.11.0-x64.msi"
    
    Invoke-WebRequest -Uri $nodeUrl -OutFile $output
    Write-Host "Node.js kurulumu başlatılıyor..." -ForegroundColor Cyan
    Start-Process msiexec.exe -ArgumentList "/i", $output, "/qn" -Wait
    Write-Host "Node.js kuruldu. Lütfen PowerShell'i yeniden başlatıp scripti tekrar çalıştırın." -ForegroundColor Green
    exit
} else {
    Write-Host "Node.js bulundu: $nodeVersion" -ForegroundColor Green
}

# Python kontrolü
Write-Host "[2/7] Python kontrol ediliyor..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Python bulunamadı. Microsoft Store'dan Python 3.11 kurulumu yapılacak..." -ForegroundColor Yellow
    Write-Host "Lütfen Microsoft Store'dan Python 3.11 kurun ve scripti yeniden çalıştırın." -ForegroundColor Red
    exit
} else {
    Write-Host "Python bulundu: $pythonVersion" -ForegroundColor Green
}

# Proje dizinine git
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location $projectPath
Write-Host "[3/7] Proje dizini: $projectPath" -ForegroundColor Cyan

# Node.js bağımlılıkları
Write-Host "[4/7] Node.js bağımlılıkları yükleniyor..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# Python sanal ortam oluştur
Write-Host "[5/7] Python sanal ortamı oluşturuluyor..." -ForegroundColor Yellow
if (Test-Path ".venv") {
    Remove-Item -Recurse -Force ".venv"
}
python -m venv .venv

# Sanal ortamı aktifleştir
Write-Host "[6/7] Python sanal ortamı aktifleştiriliyor..." -ForegroundColor Yellow
& .venv\Scripts\Activate.ps1

# Python bağımlılıkları
Write-Host "[7/7] Python bağımlılıkları yükleniyor..." -ForegroundColor Yellow
pip install -r scripts\requirements.txt

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Kurulum Tamamlandı!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Geliştirme sunucusunu başlatmak için:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "İçerik çekmek için (önce sanal ortamı aktifleştirin):" -ForegroundColor Cyan
Write-Host "  .venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  python scripts\fetch-content.py" -ForegroundColor White
Write-Host ""
Write-Host "Tarayıcıda açın: http://localhost:4321" -ForegroundColor Yellow
