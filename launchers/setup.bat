@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Sistema POS - Configuracion Portable
echo ========================================
echo.

echo Verificando Node.js v22.19.0...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=3" %%a in ('node --version') do set "current_version=%%a"
    echo Version actual: !current_version!
    
    if "!current_version!"=="v22.19.0" (
        echo ✓ Node.js v22.19.0 ya esta instalado.
        goto continue_setup
    ) else (
        echo ⚠️  Version diferente detectada: !current_version!
    )
)

echo Instalando Node.js v22.19.0...
echo.

REM Configurar URLs de descarga
set "node_url=https://nodejs.org/dist/v22.19.0/node-v22.19.0-x64.msi"
set "alt_url=https://nodejs.org/dist/v22.19.0/node-v22.19.0-win-x64.msi"

REM Crear directorio temporal
set "temp_dir=%TEMP%\node_install_%RANDOM%"
mkdir "!temp_dir!" 2>nul
cd /d "!temp_dir!"

echo Descargando Node.js v22.19.0...
echo.

REM Intentar descarga con diferentes métodos
set "downloaded=0"

REM Método 1: PowerShell
powershell -Command "$ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '!node_url!' -OutFile 'node.msi' -ErrorAction Stop; exit 0 } catch { exit 1 }"
if !errorlevel! equ 0 if exist "node.msi" set "downloaded=1"

REM Método 2: Si falla, intentar URL alternativa
if !downloaded! equ 0 (
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '!alt_url!' -OutFile 'node.msi' -ErrorAction Stop; exit 0 } catch { exit 1 }"
    if !errorlevel! equ 0 if exist "node.msi" set "downloaded=1"
)

REM Método 3: Usar certutil como último recurso
if !downloaded! equ 0 (
    echo Intentando descarga con certutil...
    certutil -urlcache -split -f "!node_url!" node.msi >nul 2>&1
    if exist "node.msi" set "downloaded=1"
)

if !downloaded! equ 0 (
    echo ERROR: No se pudo descargar Node.js v22.19.0.
    goto manual_install
)

echo Instalando Node.js v22.19.0...
echo Por favor espere, esto puede tomar unos minutos...
start /wait msiexec /i "node.msi" /quiet /norestart ADDLOCAL=NodeRuntime,DocumentationShortcuts,NPM,AddToPath

REM Limpiar
del "node.msi" 2>nul
cd ..
rmdir /s /q "!temp_dir!" 2>nul

REM Actualizar PATH
setx PATH "%PATH%;C:\Program Files\nodejs\" /m >nul 2>&1

echo Verificando instalacion...
timeout /t 5 /nobreak >nul
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: La instalacion puede requerir reinicio.
    echo Por favor reinicia y ejecuta este script nuevamente.
    pause
    exit /b 1
)

echo ✓ Node.js v22.19.0 instalado correctamente.

:continue_setup
cd /d "%~dp0..\backend"

echo.
echo Instalando dependencias de npm...
npm install
if !errorlevel! neq 0 (
    echo ERROR: Fallo al instalar dependencias.
    pause
    exit /b 1
)

echo ✓ Configuracion completada exitosamente!
echo.
pause
exit /b 0

:manual_install
echo.
echo Por favor instala Node.js v22.19.0 manualmente desde:
echo https://nodejs.org/dist/v22.19.0/node-v22.19.0-x64.msi
echo.
pause
exit /b 1