
@echo off
setlocal enabledelayedexpansion

:: Utilidad de restauración del Sistema POS
set "APP_DIR=%ProgramFiles%\SistemaPOS"
set "BACKUP_DIR=%USERPROFILE%\Documents\SistemaPOS_Backups"
set "DB_FILE=%APP_DIR%\pos_database.sqlite"
set "CONFIG_FILE=%APP_DIR%\config.json"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🔄 UTILIDAD DE RESTAURACIÓN                      ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Esta utilidad restaura datos desde un respaldo anterior.
echo.

:: Verificar que la aplicación esté instalada
if not exist "%APP_DIR%" (
    echo ❌ Error: Sistema POS no está instalado.
    echo.
    echo Instale primero el Sistema POS antes de restaurar datos.
    echo.
    pause
    exit /b 1
)

echo ✅ Sistema POS detectado
echo.

:: Verificar que existan respaldos
if not exist "%BACKUP_DIR%" (
    echo ❌ Error: No se encontraron respaldos.
    echo.
    echo Use la utilidad de respaldo primero para crear un respaldo.
    echo.
    pause
    exit /b 1
)

:: Listar respaldos disponibles
echo ┌─ Respaldos disponibles ───────────────────────────────────┐
set "COUNT=0"
set "BACKUP_LIST="
for /d %%D in ("%BACKUP_DIR%\backup_*") do (
    set /a "COUNT+=1"
    set "BACKUP_LIST[!COUNT!]=%%D"
    echo │ !COUNT!. %%~nxD

    :: Mostrar información del respaldo si existe
    if exist "%%D\backup_info.json" (
        for /f "tokens=*" %%I in ('findstr "created_at" "%%D\backup_info.json" 2^>nul') do (
            echo │     Creado: %%I
        )
    )
)
echo │
if !COUNT!==0 (
    echo │ ❌ No hay respaldos disponibles
    echo └────────────────────────────────────────────────────────────┘
    echo.
    echo Use la utilidad de respaldo para crear un respaldo primero.
    echo.
    pause
    exit /b 1
) else (
    echo │ Total de respaldos: !COUNT!
)
echo └────────────────────────────────────────────────────────────┘
echo.

:: Seleccionar respaldo
set /p "SELECTION=Seleccione el número del respaldo a restaurar [1-!COUNT!]: "

:: Validar selección
if "!SELECTION!"=="" (
    echo ❌ Selección inválida.
    pause
    goto :eof
)

set /a "NUM=%SELECTION%" 2>nul
if %NUM% LSS 1 (
    echo ❌ Selección inválida.
    pause
    goto :eof
)
if %NUM% GTR !COUNT! (
    echo ❌ Selección inválida.
    pause
    goto :eof
)

:: Obtener ruta del respaldo seleccionado
set "SELECTED_BACKUP=!BACKUP_LIST[%NUM%]!"

if not exist "%SELECTED_BACKUP%" (
    echo ❌ Error: Respaldo seleccionado no encontrado.
    pause
    goto :eof
)

echo.
echo ┌─ Confirmación de restauración ────────────────────────────┐
echo │
echo │ 📦 Respaldo seleccionado: %SELECTED_BACKUP%
echo │ ⚠️  ATENCIÓN: Esta acción sobrescribirá los datos actuales
echo │
echo │ Se restaurarán:
for %%F in ("%SELECTED_BACKUP%\*") do (
    if not "%%~nxF"=="backup_info.json" (
        echo │    • %%~nxF
    )
)
echo │
echo └────────────────────────────────────────────────────────────┘
echo.

choice /C SN /M "¿Está seguro de que desea restaurar este respaldo? [S/N]"
if errorlevel 2 goto :eof

echo.
echo ┌─ Restaurando datos ──────────────────────────────────────┐

:: Crear respaldo automático antes de restaurar (por seguridad)
echo Creando respaldo automático de datos actuales...
set "AUTO_BACKUP=%BACKUP_DIR%\auto_backup_%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "AUTO_BACKUP=%AUTO_BACKUP: =0%"
mkdir "%AUTO_BACKUP%" 2>nul

if exist "%DB_FILE%" copy "%DB_FILE%" "%AUTO_BACKUP%\" >nul
if exist "%CONFIG_FILE%" copy "%CONFIG_FILE%" "%AUTO_BACKUP%\" >nul
if exist "%APP_DIR%\sysdata.dat" copy "%APP_DIR%\sysdata.dat" "%AUTO_BACKUP%\" >nul

echo ✅ Respaldo automático creado: %AUTO_BACKUP%
echo.

:: Detener aplicación si está ejecutándose
taskkill /f /im "SistemaPOS.exe" >nul 2>&1
taskkill /f /im "node.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

:: Restaurar archivos
if exist "%SELECTED_BACKUP%\pos_database.sqlite" (
    copy "%SELECTED_BACKUP%\pos_database.sqlite" "%APP_DIR%\" >nul
    echo ✅ Base de datos restaurada
) else (
    echo ⚠️  Base de datos no encontrada en el respaldo
)

if exist "%SELECTED_BACKUP%\config.json" (
    copy "%SELECTED_BACKUP%\config.json" "%APP_DIR%\" >nul
    echo ✅ Configuración restaurada
)

if exist "%SELECTED_BACKUP%\sysdata.dat" (
    copy "%SELECTED_BACKUP%\sysdata.dat" "%APP_DIR%\" >nul
    echo ✅ Datos de activación restaurados
)

:: Restaurar configuración de ngrok
if exist "%SELECTED_BACKUP%\ngrok\ngrok.yml" (
    if not exist "%USERPROFILE%\.ngrok2" mkdir "%USERPROFILE%\.ngrok2"
    copy "%SELECTED_BACKUP%\ngrok\ngrok.yml" "%USERPROFILE%\.ngrok2\" >nul
    echo ✅ Configuración de ngrok restaurada
)

echo └────────────────────────────────────────────────────────────┘
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🎉 RESTAURACIÓN COMPLETADA                      ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ Datos restaurados exitosamente desde:
echo    %SELECTED_BACKUP%
echo.
echo 📋 Respaldo automático creado por seguridad:
echo    %AUTO_BACKUP%
echo.
echo 🚀 Puede iniciar el Sistema POS normalmente.
echo.
echo 💡 Recomendaciones:
echo    • Verifique que los datos se restauraron correctamente
echo    • Pruebe las funcionalidades principales
echo    • Considere hacer un nuevo respaldo después de verificar
echo.

pause
goto :eof
