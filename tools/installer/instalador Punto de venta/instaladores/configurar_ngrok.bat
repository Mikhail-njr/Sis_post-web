@echo off
echo ========================================
echo    CONFIGURAR NGROK
echo ========================================
echo.
echo Este script configura ngrok con tu authtoken.
echo.
echo Para configurar ngrok:
echo   1. Obtén tu authtoken desde https://dashboard.ngrok.com/get-started/your-authtoken
echo   2. Ejecuta: ngrok config add-authtoken TU_TOKEN_AQUI
echo   3. El archivo ngrok.yml se creará automáticamente
echo.
echo Una vez configurado, puedes usar tunneling remoto con:
echo   run.bat o run_all.bat
echo.
echo El archivo de configuración se guarda en:
echo   %USERPROFILE%\.ngrok2\ngrok.yml
echo.
pause
exit /b 0