@echo off
setlocal enabledelayedexpansion

:: Configuración del instalador de Node.js
set "NODE_VERSION=22.12.0"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi"
set "NODE_INSTALLER=%TEMP%\nodejs-installer.msi"
set "NODE_DIR=%ProgramFiles%\nodejs"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              📥 INSTALADOR DE NODE.JS                        ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Versión a instalar: %NODE_VERSION%
echo URL: %NODE_URL%
echo.

:: Verificar si Node.js ya está instalado
echo Verificando instalación existente de Node.js...
node --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('node --version') do set "CURRENT_NODE=%%i"
    echo ✅ Node.js ya está instalado: !CURRENT_NODE!

    :: Comparar versiones
    for /f "tokens=2 delims=v." %%a in ("!CURRENT_NODE!") do set "CURRENT_MAJOR=%%a"
    for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set "TARGET_MAJOR=%%a"

    if !CURRENT_MAJOR! GEQ !TARGET_MAJOR! (
        echo ✅ La versión instalada es compatible o superior.
        echo.
        choice /C SN /M "¿Reinstalar Node.js de todas formas? [S/N]"
        if errorlevel 2 (
            echo Instalación de Node.js omitida.
            goto :eof
        )
    ) else (
        echo ⚠️  La versión instalada es anterior. Se recomienda actualizar.
    )
) else (
    echo ℹ️  Node.js no está instalado. Procediendo con la instalación.
)

echo.
echo ┌─ Paso 1: Descargando Node.js ──────────────────────────────┐

:: Verificar conexión a internet
ping -n 1 google.com >nul 2>&1
if errorlevel 1 (
    echo ❌ No hay conexión a internet.
    echo.
    echo Verifique su conexión e intente nuevamente.
    echo También puede descargar Node.js manualmente desde:
    echo https://nodejs.org/
    echo.
    exit /b 1
)

:: Descargar Node.js usando PowerShell
echo Descargando Node.js v%NODE_VERSION%...
powershell -Command "& {try { Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_INSTALLER%' -UseBasicParsing; Write-Host '✅ Descarga completada' } catch { Write-Host '❌ Error en la descarga:' $_.Exception.Message; exit 1 }}" 2>nul

if not exist "%NODE_INSTALLER%" (
    echo ❌ Error: No se pudo descargar el instalador.
    echo.
    echo Posibles causas:
    echo • Conexión a internet inestable
    echo • Firewall bloqueando la descarga
    echo • URL de descarga incorrecta
    echo.
    echo Soluciones alternativas:
    echo 1. Descargue manualmente desde: https://nodejs.org/
    echo 2. Ejecute como administrador
    echo 3. Desactive temporalmente el antivirus
    echo.
    exit /b 1
)

for %%A in ("%NODE_INSTALLER%") do set "FILE_SIZE=%%~zA"
set /a "FILE_SIZE_MB=%FILE_SIZE% / 1024 / 1024"
echo ✅ Instalador descargado: %FILE_SIZE_MB% MB
echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Paso 2: Instalando Node.js ───────────────────────────────┐

:: Verificar permisos de administrador para instalación
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Permisos de administrador detectados
) else (
    echo ⚠️  No se detectaron permisos de administrador
    echo La instalación podría fallar o requerir confirmación manual
    echo.
)

:: Instalar Node.js de forma silenciosa
echo Instalando Node.js (esto puede tomar unos minutos)...
msiexec /i "%NODE_INSTALLER%" /quiet /norestart /l*v "%TEMP%\nodejs_install.log"

:: Verificar código de salida
if %errorlevel% == 0 (
    echo ✅ Instalación completada exitosamente
) else (
    echo ❌ Error durante la instalación (Código: %errorlevel%)
    echo.
    echo Revisando log de instalación...
    if exist "%TEMP%\nodejs_install.log" (
        echo Últimas líneas del log:
        powershell -Command "& {Get-Content '%TEMP%\nodejs_install.log' | Select-Object -Last 10}"
    )
    echo.
    echo Soluciones:
    echo 1. Ejecute como administrador
    echo 2. Cierre otras aplicaciones
    echo 3. Reinicie el sistema e intente nuevamente
    echo.
    del "%NODE_INSTALLER%" 2>nul
    exit /b 1
)

:: Limpiar instalador
del "%NODE_INSTALLER%" 2>nul
echo ✅ Instalador temporal eliminado
echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Paso 3: Verificando instalación ──────────────────────────┐

:: Actualizar variables de entorno (puede requerir reinicio)
call refreshenv.cmd >nul 2>&1

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('node --version') do echo │ Node.js: %%i ✅
) else (
    echo │ Node.js: ❌ Error - No se detecta en PATH
    echo.
    echo Solución: Reinicie la línea de comandos o el sistema
    exit /b 1
)

:: Verificar npm
npm --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo │ npm: %%i ✅
) else (
    echo │ npm: ❌ Error - No se detecta en PATH
    exit /b 1
)

:: Verificar ubicación de instalación
if exist "%NODE_DIR%" (
    echo │ Ubicación: %NODE_DIR% ✅
) else (
    echo │ Ubicación: No encontrada ⚠️
)

echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Paso 4: Configuración adicional ──────────────────────────┐

:: Configurar npm para mejor rendimiento
echo Configurando npm...
npm config set fund false >nul 2>&1
npm config set audit false >nul 2>&1
npm config set progress false >nul 2>&1
echo ✅ Configuración de npm completada

:: Verificar permisos de escritura en directorio global de npm
npm config get prefix >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Permisos de npm verificados
) else (
    echo ⚠️  Posibles problemas con permisos de npm
)

echo └────────────────────────────────────────────────────────────┘
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🎉 NODE.JS INSTALADO CORRECTAMENTE              ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ Node.js v%NODE_VERSION% instalado exitosamente
echo ✅ npm incluido y configurado
echo.
echo 🔄 Puede ser necesario reiniciar la línea de comandos
echo    para que los cambios de PATH surtan efecto.
echo.
echo 📝 Próximos pasos:
echo    • El instalador principal continuará automáticamente
echo    • Node.js estará disponible para todas las aplicaciones
echo.

:: Pausa breve para que el usuario vea el resultado
timeout /t 3 /nobreak >nul

goto :eof