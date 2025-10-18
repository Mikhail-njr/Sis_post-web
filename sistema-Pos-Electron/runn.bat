@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Sistema POS - Electron App
echo ========================================
echo.

:: Verificar si hay procesos de Electron ejecutándose y detenerlos
tasklist /fi "imagename eq electron.exe" 2>nul | find /i "electron.exe" >nul
if %errorlevel% equ 0 (
    echo Deteniendo procesos Electron existentes...
    taskkill /f /im electron.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Verificar si hay procesos de Node.js relacionados y detenerlos
tasklist /fi "WINDOWTITLE eq Sistema POS*" 2>nul | find /i "node.exe" >nul
if %errorlevel% equ 0 (
    echo Deteniendo procesos Node.js relacionados...
    for /f "tokens=2" %%i in ('tasklist /fi "WINDOWTITLE eq Sistema POS*" /fo csv ^| find "node.exe"') do (
        taskkill /f /pid %%i >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)
:: Verificar si hay procesos usando el puerto 3000 y detenerlos
echo Verificando procesos en puerto 3000...
netstat -ano | find "3000" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo Se encontraron procesos usando el puerto 3000. Deteniendo...
    for /f "tokens=5" %%i in ('netstat -ano ^| find "3000" ^| find "LISTENING"') do (
        echo Deteniendo proceso PID: %%i
        taskkill /f /pid %%i >nul 2>&1
    )
    echo Procesos detenidos. Esperando...
    timeout /t 2 /nobreak >nul
) else (
    echo No se encontraron procesos usando el puerto 3000.
)

:: Verificar si hay procesos cmd.exe relacionados con nuestro script y NO detenerlos
:: Solo detenemos procesos externos que puedan estar interfiriendo

:: NO cerrar ventanas de consola relacionadas con Sistema POS
:: porque podríamos estar cerrando nuestro propio proceso
:: Solo cerramos procesos específicos que sabemos que interfieren

echo ========================================
echo   Sistema POS - Electron App
echo ========================================
echo.

:: Verificar si existe main.js
if not exist "main.js" (
    echo ERROR: No se encuentra main.js
    echo.
    pause
    exit /b 1
)

:: Verificar si existe node_modules
if not exist "node_modules" (
    echo ERROR: No se encuentra node_modules. Ejecuta 'npm install' primero.
    echo.
    pause
    exit /b 1
)

echo Iniciando aplicación Electron...
echo Directorio actual: %CD%
echo.

:: Ejecutar electron directamente - NO usar npm start
echo Ejecutando: npx electron .
echo.
echo IMPORTANTE: La aplicación Electron se abrirá en una nueva ventana.
echo Esta ventana de comandos permanecerá abierta.
echo Presiona Ctrl+C para cerrar la aplicación Electron.
echo.

:: Ejecutar electron y mantener la consola abierta
start "Sistema POS - Electron" cmd /k "npx electron ."

:: Esperar un poco para que se inicie
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Aplicación iniciada correctamente
echo ========================================
echo.
echo La aplicación Sistema POS se ha abierto en una nueva ventana.
echo Puedes cerrar esta ventana de comandos cuando desees.
echo.
pause
