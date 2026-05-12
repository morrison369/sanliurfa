@echo off
echo gcloud ADC login - custom OAuth client ile...
gcloud auth application-default login --client-id-file="D:\sanliurfa.com\sanliurfa\scripts\oauth-client.json" --scopes=openid,email,profile,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/siteverification,https://www.googleapis.com/auth/cloud-platform
echo.
echo Login tamamlandi!
pause
