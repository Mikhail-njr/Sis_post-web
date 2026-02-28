@echo off
echo ========================================
echo    INSTALAR NGROK
echo ========================================
echo.
echo Este script instala ngrok para tunneling remoto.
echo.
echo Ngrok permite exponer el servidor local a internet
echo de forma segura con URLs fijas.
echo.
echo Para instalar ngrok:
echo   1. Descarga ngrok desde https://ngrok.com/download
echo   2. Extrae el archivo ngrok.exe
echo   3. Coloca ngrok.exe en una carpeta en el PATH
echo   4. Configura con: ngrok config add-authtoken TU_TOKEN
echo.
echo Para usar tunneling remoto, ejecuta:
echo   run.bat o run_all.bat
echo.
pause
exit /b 0