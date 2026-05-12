@echo off
chcp 65001 >nul
echo ============================================================
echo  Sanliurfa.com - Google Cloud Full Setup
echo  APIs + IAM + OAuth Consent + GA4 + GSC
echo ============================================================
echo.

set PROJECT=sanliurfa-com-2026
set PROJECT_NUMBER=652938049971
set SA=sanliurfa-sa@sanliurfa-com-2026.iam.gserviceaccount.com

rem --- [1] APIs Etkinlestir ---
echo [1/3] APIs etkinlestiriliyor...
gcloud services enable ^
  analyticsadmin.googleapis.com ^
  analytics.googleapis.com ^
  webmasters.googleapis.com ^
  siteverification.googleapis.com ^
  people.googleapis.com ^
  iamcredentials.googleapis.com ^
  cloudresourcemanager.googleapis.com ^
  --project=%PROJECT%

if %errorlevel% neq 0 (
  echo.
  echo HATA: APIs etkinlestirilemedi. gcloud auth login yapip tekrar deneyin.
  pause
  exit /b 1
)
echo   TAMAM: APIs aktif.
echo.

rem --- [2] IAM Rolleri ---
echo [2/3] IAM rolleri ataniyor (service account)...
gcloud projects add-iam-policy-binding %PROJECT% ^
  --member="serviceAccount:%SA%" ^
  --role="roles/serviceusage.serviceUsageConsumer" ^
  --condition=None --quiet
gcloud projects add-iam-policy-binding %PROJECT% ^
  --member="serviceAccount:%SA%" ^
  --role="roles/iam.serviceAccountUser" ^
  --condition=None --quiet
gcloud projects add-iam-policy-binding %PROJECT% ^
  --member="serviceAccount:%SA%" ^
  --role="roles/viewer" ^
  --condition=None --quiet
echo   TAMAM: IAM rolleri atandi.
echo.

rem --- [3] OAuth Consent + GA4 + GSC ---
echo [3/3] OAuth consent screen + GA4 + GSC kurulumu...
node scripts/setup-oauth-consent.mjs

pause
