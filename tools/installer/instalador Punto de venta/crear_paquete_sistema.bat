@echo off
setlocal enabledelayedexpansion

:: Script para crear el paquete comprimido del sistema
set "SOURCE_DIR=..\sistema-Pos-Electron"
set "OUTPUT_ZIP=sistema-pos-electron.zip"
set "OUTPUT_DIR=paquetes"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              📦 CREACIÓN DE PAQUETE DEL SISTEMA              ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Origen: %SOURCE_DIR%
echo Destino: %OUTPUT_ZIP%
echo.

:: Verificar que existe el directorio fuente
if not exist "%SOURCE_DIR%" (
    echo ❌ Error: Directorio fuente no encontrado: %SOURCE_DIR%
    echo.
    echo Asegúrese de que el sistema Electron esté en la ubicación correcta.
    echo.
    pause
    exit /b 1
)

echo ✅ Directorio fuente encontrado
echo.

:: Crear directorio de salida
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: Verificar PowerShell para compresión
powershell -Command "Write-Host 'Verificando PowerShell...'" >nul 2>&1
if errorlevel 1 (
    echo ❌ PowerShell no está disponible
    echo.
    echo Este script requiere PowerShell para comprimir archivos.
    echo.
    pause
    exit /b 1
)

echo ✅ PowerShell disponible
echo.

:: Verificar archivos críticos antes de empaquetar
echo ┌─ Verificando archivos críticos ────────────────────────────┐

set "MISSING_FILES="
if not exist "%SOURCE_DIR%\main.js" set "MISSING_FILES=!MISSING_FILES! main.js"
if not exist "%SOURCE_DIR%\package.json" set "MISSING_FILES=!MISSING_FILES! package.json"
if not exist "%SOURCE_DIR%\frontend\index.html" set "MISSING_FILES=!MISSING_FILES! index.html"
if not exist "%SOURCE_DIR%\frontend\script.js" set "MISSING_FILES=!MISSING_FILES! script.js"

if defined MISSING_FILES (
    echo ❌ Archivos críticos faltantes:!MISSING_FILES!
    echo.
    echo No se puede crear el paquete sin estos archivos.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Todos los archivos críticos presentes
)

echo └────────────────────────────────────────────────────────────┘
echo.

:: Calcular tamaño aproximado
echo ┌─ Calculando tamaño del paquete ───────────────────────────┐

set "TOTAL_SIZE=0"
for /r "%SOURCE_DIR%" %%A in (*) do (
    set /a "TOTAL_SIZE+=%%~zA"
)
set /a "TOTAL_MB=%TOTAL_SIZE% / 1024 / 1024"

echo │ Tamaño aproximado: %TOTAL_MB% MB
echo │ Archivos a comprimir: %SOURCE_DIR%

:: Verificar espacio disponible
for /f "tokens=3" %%i in ('dir /-c %~dp0 ^| find "bytes free"') do set "FREE_SPACE=%%i"
set /a "FREE_GB=%FREE_SPACE:~0,-9% / 1024 / 1024 / 1024"

if %FREE_GB% LSS 1 (
    echo │ ⚠️  Espacio disponible: %FREE_GB% GB (Recomendado: 1GB+)
    echo │
    echo │ Puede que no haya suficiente espacio para crear el paquete.
    choice /C SN /M "¿Continuar de todas formas? [S/N]"
    if errorlevel 2 exit /b 1
) else (
    echo │ ✅ Espacio disponible: %FREE_GB% GB
)

echo └────────────────────────────────────────────────────────────┘
echo.

:: Crear archivo de información del paquete
echo ┌─ Creando información del paquete ──────────────────────────┐

set "INFO_FILE=%OUTPUT_DIR%\paquete_info.txt"
echo Información del Paquete Sistema POS Electron > "%INFO_FILE%"
echo ============================================ >> "%INFO_FILE%"
echo. >> "%INFO_FILE%"
echo Fecha de creación: %DATE% %TIME% >> "%INFO_FILE%"
echo Versión del sistema: 1.0.0 >> "%INFO_FILE%"
echo. >> "%INFO_FILE%"
echo Archivos incluidos: >> "%INFO_FILE%"

:: Listar archivos principales
if exist "%SOURCE_DIR%\main.js" echo • main.js (Archivo principal Electron) >> "%INFO_FILE%"
if exist "%SOURCE_DIR%\package.json" echo • package.json (Dependencias) >> "%INFO_FILE%"
if exist "%SOURCE_DIR%\sysdata.dat" echo • sysdata.dat (Licencias) >> "%INFO_FILE%"
if exist "%SOURCE_DIR%\frontend\" echo • frontend/ (Interfaz de usuario) >> "%INFO_FILE%"

echo. >> "%INFO_FILE%"
echo Tamaño aproximado: %TOTAL_MB% MB >> "%INFO_FILE%"
echo. >> "%INFO_FILE%"
echo Para instalar: >> "%INFO_FILE%"
echo 1. Coloque este ZIP junto al instalador >> "%INFO_FILE%"
echo 2. Ejecute instalar.bat >> "%INFO_FILE%"
echo 3. El instalador descomprimirá automáticamente >> "%INFO_FILE%"

echo ✅ Información del paquete creada
echo └────────────────────────────────────────────────────────────┘
echo.

:: Crear el archivo ZIP
echo ┌─ Creando archivo comprimido ──────────────────────────────┐

set "FULL_OUTPUT_PATH=%OUTPUT_DIR%\%OUTPUT_ZIP%"

:: Eliminar ZIP anterior si existe
if exist "%FULL_OUTPUT_PATH%" (
    echo Eliminando versión anterior...
    del "%FULL_OUTPUT_PATH%" >nul
)

echo Creando %OUTPUT_ZIP% (esto puede tomar varios minutos)...

:: Usar PowerShell para comprimir
powershell -Command "& { try { Compress-Archive -Path '%SOURCE_DIR%\*' -DestinationPath '%FULL_OUTPUT_PATH%' -CompressionLevel Optimal; Write-Host '✅ Compresión completada' } catch { Write-Host '❌ Error en compresión:' $_.Exception.Message; exit 1 }}" 2>nul

if errorlevel 1 (
    echo ❌ Error creando el archivo comprimido
    echo.
    echo Posibles causas:
    echo • Espacio insuficiente en disco
    echo • Permisos insuficientes
    echo • Archivos en uso
    echo.
    pause
    exit /b 1
)

:: Verificar que el ZIP se creó correctamente
if not exist "%FULL_OUTPUT_PATH%" (
    echo ❌ Error: El archivo ZIP no se creó
    pause
    exit /b 1
)

:: Obtener tamaño del archivo creado
for %%A in ("%FULL_OUTPUT_PATH%") do set "ZIP_SIZE=%%~zA"
set /a "ZIP_MB=%ZIP_SIZE% / 1024 / 1024"

echo ✅ Archivo comprimido creado exitosamente
echo └────────────────────────────────────────────────────────────┘
echo.

:: Verificación final
echo ┌─ Verificación final ──────────────────────────────────────┐

echo │ 📦 Paquete creado: %FULL_OUTPUT_PATH%
echo │ 📊 Tamaño: %ZIP_MB% MB
echo │ 📅 Fecha: %DATE% %TIME%
echo │

:: Verificar integridad del ZIP (básica)
powershell -Command "& { try { $zip = [System.IO.Compression.ZipFile]::OpenRead('%FULL_OUTPUT_PATH%'); $entries = $zip.Entries.Count; Write-Host \"│ 📁 Archivos en ZIP: $entries\" } catch { Write-Host '│ ❌ Error verificando ZIP' } }" 2>nul

echo │
echo │ ✅ Paquete listo para distribución
echo │
echo │ 📋 Para usar con el instalador:
echo │    1. Copie %OUTPUT_ZIP% junto a instalar.bat
echo │    2. Ejecute instalar.bat
echo │    3. El instalador descomprimirá automáticamente
echo │

echo └────────────────────────────────────────────────────────────┘
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🎉 PAQUETE DEL SISTEMA CREADO                   ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ El paquete comprimido se ha creado correctamente.
echo.
echo 📦 Ubicación: %FULL_OUTPUT_PATH%
echo 📊 Tamaño: %ZIP_MB% MB
echo.
echo 🚀 El instalador ahora puede usar este paquete para
echo    instalaciones completamente automatizadas.
echo.
echo 💡 Recomendaciones:
echo    • Guarde este paquete en un lugar seguro
echo    • Úselo junto con el instalador para distribución
echo    • Pruebe la instalación en un equipo limpio
echo.

pause
goto :eof