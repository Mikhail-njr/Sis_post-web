@echo off
echo ========================================
echo    SISTEMA POS ELECTRON - INICIANDO
echo ========================================
echo.

echo [1/3] Verificando y liberando puerto 3000...
echo.

REM Matar procesos que usen el puerto 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Matando proceso PID %%a en puerto 3000...
    taskkill /f /pid %%a >nul 2>&1
    if errorlevel 1 (
        echo Advertencia: No se pudo matar el proceso %%a
    ) else (
        echo Proceso %%a terminado exitosamente.
    )
)

REM Esperar un momento para que el puerto se libere
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Verificando que el puerto 3000 esté libre...
netstat -an | find ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ERROR: El puerto 3000 aún está en uso.
    echo Por favor, cierre manualmente cualquier aplicación que use el puerto 3000.
    pause
    exit /b 1
) else (
    echo Puerto 3000 liberado correctamente.
)

echo.
echo [3/3] Iniciando Sistema POS Electron...
echo.

REM Verificar si existe node_modules
if not exist "node_modules" (
    echo ERROR: No se encontraron las dependencias instaladas.
    echo Por favor, ejecute primero: npm install
    echo.
    pause
    exit /b 1
)

REM Verificar si existe main.js
if not exist "main.js" (
    echo ERROR: No se encontró el archivo main.js
    echo.
    pause
    exit /b 1
)
echo Iniciando aplicación...
echo.

echo ========================================
echo    PRESIONE CTRL+C para detener
echo ========================================
echo.

start /B npm start

echo.
echo Aplicación iniciada en segundo plano. Presione cualquier tecla para cerrar esta ventana...
pause >nul