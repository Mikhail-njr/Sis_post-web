@echo off
setlocal enabledelayedexpansion

:: Utilidad de respaldo del Sistema POS
set "APP_DIR=%ProgramFiles%\SistemaPOS"
set "BACKUP_DIR=%USERPROFILE%\Documents\SistemaPOS_Backups"
set "DB_FILE=%APP_DIR%\pos_database.sqlite"
set "CONFIG_FILE=%APP_DIR%\config.json"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              💾 UTILIDAD DE RESPALDO                         ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Esta utilidad crea un respaldo completo de sus datos.
echo.

:: Verificar que la aplicación esté instalada
if not exist "%APP_DIR%" (
    echo ❌ Error: Sistema POS no está instalado.
    echo.
    echo Instale primero el Sistema POS antes de hacer respaldos.
    echo.
    pause
    exit /b 1
)

echo ✅ Sistema POS detectado
echo.

:: Crear directorio de respaldos
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generar nombre del respaldo con timestamp
set "TIMESTAMP=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_NAME=backup_%TIMESTAMP%"
set "BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%"

echo ┌─ Creando respaldo ────────────────────────────────────────┐
echo │ Nombre: %BACKUP_NAME%
echo │ Ubicación: %BACKUP_PATH%
echo │

:: Crear directorio del respaldo
mkdir "%BACKUP_PATH%"

:: Respaldar base de datos
if exist "%DB_FILE%" (
    copy "%DB_FILE%" "%BACKUP_PATH%\" >nul
    echo ✅ Base de datos respaldada
) else (
    echo ⚠️  Base de datos no encontrada
)

:: Respaldar configuración
if exist "%CONFIG_FILE%" (
    copy "%CONFIG_FILE%" "%BACKUP_PATH%\" >nul
    echo ✅ Configuración respaldada
) else (
    echo ⚠️  Archivo de configuración no encontrado
)

:: Respaldar datos de activación
if exist "%APP_DIR%\sysdata.dat" (
    copy "%APP_DIR%\sysdata.dat" "%BACKUP_PATH%\" >nul
    echo ✅ Datos de activación respaldados
)

:: Respaldar configuración de ngrok
if exist "%USERPROFILE%\.ngrok2\ngrok.yml" (
    if not exist "%BACKUP_PATH%\ngrok" mkdir "%BACKUP_PATH%\ngrok"
    copy "%USERPROFILE%\.ngrok2\ngrok.yml" "%BACKUP_PATH%\ngrok\" >nul
    echo ✅ Configuración de ngrok respaldada
)

:: Crear archivo de información del respaldo
echo { > "%BACKUP_PATH%\backup_info.json"
echo   "backup_name": "%BACKUP_NAME%", >> "%BACKUP_PATH%\backup_info.json"
echo   "created_at": "%DATE% %TIME%", >> "%BACKUP_PATH%\backup_info.json"
echo   "app_version": "1.0.0", >> "%BACKUP_PATH%\backup_info.json"
echo   "backup_type": "complete", >> "%BACKUP_PATH%\backup_info.json"
echo   "files": [ >> "%BACKUP_PATH%\backup_info.json"
set "FIRST_FILE=true"
for %%F in ("%BACKUP_PATH%\*") do (
    if not "%%~nxF"=="backup_info.json" (
        if defined FIRST_FILE (
            set "FIRST_FILE=false"
        ) else (
            echo , >> "%BACKUP_PATH%\backup_info.json"
        )
        echo     "%%~nxF" >> "%BACKUP_PATH%\backup_info.json"
    )
)
echo   ] >> "%BACKUP_PATH%\backup_info.json"
echo } >> "%BACKUP_PATH%\backup_info.json"

echo ✅ Información del respaldo creada
echo └────────────────────────────────────────────────────────────┘
echo.

:: Calcular tamaño del respaldo
set "BACKUP_SIZE=0"
for /r "%BACKUP_PATH%" %%A in (*) do (
    set /a "BACKUP_SIZE+=%%~zA"
)
set /a "BACKUP_MB=%BACKUP_SIZE% / 1024 / 1024"

echo ┌─ Respaldo completado ─────────────────────────────────────┐
echo │
echo │ 📦 Respaldo creado exitosamente
echo │ 📁 Ubicación: %BACKUP_PATH%
echo │ 📊 Tamaño: %BACKUP_MB% MB
echo │ 🗓️  Fecha: %DATE% %TIME%
echo │
echo │ 📋 Contenido del respaldo:
for %%F in ("%BACKUP_PATH%\*") do (
    if not "%%~nxF"=="backup_info.json" (
        echo │    • %%~nxF
    )
)
echo │
echo └────────────────────────────────────────────────────────────┘
echo.

:: Mostrar respaldos existentes
echo ┌─ Respaldos disponibles ───────────────────────────────────┐
set "COUNT=0"
for /d %%D in ("%BACKUP_DIR%\backup_*") do (
    set /a "COUNT+=1"
    echo │ !COUNT!. %%~nxD
)
if !COUNT!==0 (
    echo │ No hay respaldos anteriores
) else (
    echo │
    echo │ Total de respaldos: !COUNT!
)
echo └────────────────────────────────────────────────────────────┘
echo.

echo 💡 Recomendaciones:
echo    • Guarde este respaldo en un lugar seguro
echo    • Considere hacer respaldos regulares
echo    • Pruebe restaurar el respaldo en otro equipo
echo.

pause
goto :eof