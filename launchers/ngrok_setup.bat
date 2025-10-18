@echo off
echo ========================================
echo    CONFIGURACIÓN DE NGROK
echo ========================================
echo.
echo Este script te ayudara a configurar ngrok correctamente
echo.

:: Verificar si ngrok está instalado
ngrok version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: ngrok no está instalado
    echo.
    echo 📥 Descarga ngrok desde: https://ngrok.com/download
    echo    1. Ve a https://ngrok.com/download
    echo    2. Descarga la versión para Windows
    echo    3. Extrae ngrok.exe en la carpeta del proyecto
    echo    4. Vuelve a ejecutar este script
    echo.
    pause
    exit /b 1
)

echo ✅ ngrok está instalado
echo.

:: Verificar si ya tiene auth token
ngrok config check >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ngrok ya está configurado con un auth token
    goto :config_file
)

echo 🔑 Configuración del Auth Token:
echo.
echo Para obtener URLs estables, necesitas un auth token gratuito:
echo.
echo 1. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken
echo 2. Crea una cuenta gratuita si no tienes una
echo 3. Copia tu Auth Token
echo.

set /p "auth_token=Ingresa tu Auth Token de ngrok: "

if "%auth_token%"=="" (
    echo ❌ No se ingreso un token. Configuración cancelada.
    pause
    exit /b 1
)

echo Configurando ngrok con tu token...
ngrok config add-authtoken %auth_token%

if %errorlevel% neq 0 (
    echo ❌ Error al configurar el token
    pause
    exit /b 1
)

echo ✅ Token configurado correctamente
echo.

:config_file
echo 🔧 Creando archivo de configuración personalizado...
echo.

if exist "ngrok.yml" (
    echo ⚠️  El archivo ngrok.yml ya existe
    set /p "overwrite=¿Quieres sobrescribirlo? (s/n): "
    if /i not "!overwrite!"=="s" goto :test_ngrok
)

echo Creando ngrok.yml...
(
echo version: "2"
echo authtoken: %auth_token%
echo tunnels:
echo   pos-server:
echo     addr: 3000
echo     proto: http
echo     # Descomenta las siguientes líneas para URLs estables:
echo     # hostname: tu-dominio-personal.ngrok.io
echo     # subdomain: pos-sistema
) > ngrok.yml

echo ✅ Archivo ngrok.yml creado
echo.

:test_ngrok
echo 🧪 Probando ngrok...
echo.

echo Iniciando ngrok en segundo plano...
start /B ngrok http 3000
timeout /t 5 /nobreak >nul

echo Verificando si ngrok está funcionando...
curl -s http://localhost:4040/api/tunnels | findstr "public_url" >nul 2>&1

if %errorlevel% equ 0 (
    echo ✅ ngrok está funcionando correctamente
    echo.
    echo 🌐 Tu URL pública es:
    for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels ^| findstr "public_url"') do echo %%i
) else (
    echo ❌ ngrok no está respondiendo
    echo.
    echo 💡 Posibles soluciones:
    echo    1. Verifica que ngrok.exe esté en el PATH
    echo    2. Cierra otros procesos de ngrok
    echo    3. Reinicia la terminal
)

echo.
echo ========================================
echo    CONFIGURACIÓN COMPLETADA
echo ========================================
echo.
echo 🎉 ngrok está listo para usar!
echo.
echo Para iniciar el servidor con ngrok:
echo    run.bat
echo.
echo Para URLs estables, edita ngrok.yml y descomenta las líneas de hostname/subdomain
echo.

pause
exit /b 0