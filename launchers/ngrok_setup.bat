@echo off
echo ========================================
echo    NGROK SETUP
echo ========================================
echo.
echo Configurando ngrok para el sistema POS...
echo.
echo Este script configura ngrok con el authtoken incluido.
echo.

:: Verificar si ngrok está instalado
ngrok version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ngrok no está instalado o no está en el PATH.
    echo.
    echo Para instalar ngrok:
    echo 1. Ve a https://ngrok.com/download
    echo 2. Descarga la versión para Windows
    echo 3. Extrae ngrok.exe a una carpeta en el PATH
    echo.
    pause
    exit /b 1
)

echo ✅ Ngrok encontrado
echo.

:: Configurar authtoken
echo Configurando authtoken...
ngrok config add-authtoken 32hPYi2DgjvBv5a1xqYdBfkW4on_5UKfs6MuN4QHyuXpBUfM8

if %errorlevel% equ 0 (
    echo ✅ Authtoken configurado exitosamente
) else (
    echo ❌ Error al configurar authtoken
    echo Verifica que el token sea válido
)

echo.
echo Configuración completada. Ahora puedes usar:
echo   run.bat o run_all.bat
echo.
pause
exit /b 0