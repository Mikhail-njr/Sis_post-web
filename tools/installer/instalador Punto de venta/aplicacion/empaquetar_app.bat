@echo off
setlocal enabledelayedexpansion

:: Script para empaquetar la aplicación Electron
set "SOURCE_DIR=..\..\sistema-Pos-Electron"
set "TARGET_DIR=aplicacion\sistema-pos-electron"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              📦 EMPAQUETADO DE APLICACIÓN ELECTRON           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Origen: %SOURCE_DIR%
echo Destino: %TARGET_DIR%
echo.

:: Verificar que existe el directorio fuente
if not exist "%SOURCE_DIR%" (
    echo ❌ Error: Directorio fuente no encontrado: %SOURCE_DIR%
    echo.
    echo Asegúrese de que la aplicación Electron esté en la ubicación correcta.
    echo.
    pause
    exit /b 1
)

echo ✅ Directorio fuente encontrado
echo.

:: Crear directorio destino
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Copiar archivos principales
echo ┌─ Copiando archivos principales ────────────────────────────┐

:: Copiar package.json
if exist "%SOURCE_DIR%\package.json" (
    copy "%SOURCE_DIR%\package.json" "%TARGET_DIR%\" >nul
    echo ✅ package.json copiado
) else (
    echo ❌ package.json no encontrado
    exit /b 1
)

:: Copiar main.js
if exist "%SOURCE_DIR%\main.js" (
    copy "%SOURCE_DIR%\main.js" "%TARGET_DIR%\" >nul
    echo ✅ main.js copiado
) else (
    echo ❌ main.js no encontrado
    exit /b 1
)

:: Copiar sysdata.dat (códigos de activación)
if exist "%SOURCE_DIR%\sysdata.dat" (
    copy "%SOURCE_DIR%\sysdata.dat" "%TARGET_DIR%\" >nul
    echo ✅ sysdata.dat copiado
) else (
    echo ⚠️  sysdata.dat no encontrado (se creará vacío)
    echo. > "%TARGET_DIR%\sysdata.dat"
)

echo └────────────────────────────────────────────────────────────┘
echo.

:: Copiar directorio frontend
echo ┌─ Copiando interfaz frontend ──────────────────────────────┐

if exist "%SOURCE_DIR%\frontend" (
    if not exist "%TARGET_DIR%\frontend" mkdir "%TARGET_DIR%\frontend"

    xcopy "%SOURCE_DIR%\frontend\*" "%TARGET_DIR%\frontend\" /E /I /H /Y >nul
    echo ✅ Frontend copiado completamente

    :: Verificar archivos críticos
    if exist "%TARGET_DIR%\frontend\index.html" (
        echo ✅ index.html presente
    ) else (
        echo ❌ index.html faltante
    }

    if exist "%TARGET_DIR%\frontend\script.js" (
        echo ✅ script.js presente
    ) else (
        echo ❌ script.js faltante
    }

) else (
    echo ❌ Directorio frontend no encontrado
    exit /b 1
)

echo └────────────────────────────────────────────────────────────┘
echo.

:: Crear node_modules (simulado para distribución)
echo ┌─ Preparando dependencias ────────────────────────────────┐

:: Verificar si existe package-lock.json
if exist "%SOURCE_DIR%\package-lock.json" (
    copy "%SOURCE_DIR%\package-lock.json" "%TARGET_DIR%\" >nul
    echo ✅ package-lock.json copiado
) else (
    echo ⚠️  package-lock.json no encontrado
)

:: Nota sobre dependencias
echo ℹ️  Nota: Las dependencias de Node.js se instalarán
echo    automáticamente durante la instalación en el equipo destino.
echo    Esto asegura compatibilidad con la plataforma de destino.

echo └────────────────────────────────────────────────────────────┘
echo.

:: Crear archivos adicionales para distribución
echo ┌─ Creando archivos de distribución ────────────────────────┐

:: Crear README para la aplicación
echo # Sistema POS Electron > "%TARGET_DIR%\README.md"
echo. >> "%TARGET_DIR%\README.md"
echo Aplicación Electron del Sistema POS. >> "%TARGET_DIR%\README.md"
echo. >> "%TARGET_DIR%\README.md"
echo ## Instalación >> "%TARGET_DIR%\README.md"
echo Esta aplicación se instala automáticamente mediante el instalador principal. >> "%TARGET_DIR%\README.md"
echo. >> "%TARGET_DIR%\README.md"
echo ## Uso >> "%TARGET_DIR%\README.md"
echo Ejecute SistemaPOS.exe después de la instalación completa. >> "%TARGET_DIR%\README.md"
echo. >> "%TARGET_DIR%\README.md"
echo ## Requisitos >> "%TARGET_DIR%\README.md"
echo - Node.js instalado >> "%TARGET_DIR%\README.md"
echo - Windows 7 o superior >> "%TARGET_DIR%\README.md"

echo ✅ README.md creado

:: Crear archivo de versión
echo { > "%TARGET_DIR%\version.json"
echo   "version": "1.0.0", >> "%TARGET_DIR%\version.json"
echo   "build_date": "%DATE% %TIME%", >> "%TARGET_DIR%\version.json"
echo   "package_type": "electron", >> "%TARGET_DIR%\version.json"
echo   "description": "Sistema POS - Aplicación Electron" >> "%TARGET_DIR%\version.json"
echo } >> "%TARGET_DIR%\version.json"

echo ✅ version.json creado

echo └────────────────────────────────────────────────────────────┘
echo.

:: Verificar tamaño total
echo ┌─ Verificación final ──────────────────────────────────────┐

:: Calcular tamaño aproximado
set "TOTAL_SIZE=0"
for /r "%TARGET_DIR%" %%A in (*) do (
    set /a "TOTAL_SIZE+=%%~zA"
)
set /a "TOTAL_MB=%TOTAL_SIZE% / 1024 / 1024"

echo │ Archivos empaquetados: %TARGET_DIR%
echo │ Tamaño aproximado: %TOTAL_MB% MB
echo │

:: Verificar archivos críticos
set "MISSING_FILES="
if not exist "%TARGET_DIR%\package.json" set "MISSING_FILES=!MISSING_FILES! package.json"
if not exist "%TARGET_DIR%\main.js" set "MISSING_FILES=!MISSING_FILES! main.js"
if not exist "%TARGET_DIR%\frontend\index.html" set "MISSING_FILES=!MISSING_FILES! index.html"
if not exist "%TARGET_DIR%\frontend\script.js" set "MISSING_FILES=!MISSING_FILES! script.js"

if defined MISSING_FILES (
    echo ❌ Archivos faltantes:!MISSING_FILES!
    echo.
    echo El empaquetado puede estar incompleto.
) else (
    echo ✅ Todos los archivos críticos presentes
)

echo └────────────────────────────────────────────────────────────┘
echo.

if defined MISSING_FILES (
    echo ❌ Empaquetado completado con errores
    echo.
    echo Revise los archivos faltantes antes de distribuir.
    echo.
    pause
    exit /b 1
) else (
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                                                              ║
    echo ║              🎉 EMPAQUETADO COMPLETADO                       ║
    echo ║                                                              ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo ✅ Aplicación Electron empaquetada correctamente
    echo ✅ Lista para distribución
    echo.
    echo 📦 Ubicación: %TARGET_DIR%
    echo 📊 Tamaño: %TOTAL_MB% MB
    echo.
    echo 📝 Próximos pasos:
    echo    • Ejecutar el instalador principal
    echo    • Probar la instalación en un equipo limpio
    echo    • Verificar funcionamiento completo
    echo.
)

pause
goto :eof