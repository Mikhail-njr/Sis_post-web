@echo off
echo ========================================
echo   SISTEMA POS - INDEXACION LOCAL
echo ========================================
echo.
echo Iniciando sistema de analisis de codigo local
echo (sin Docker, compatible con PCs sin virtualizacion)
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

echo [2/3] Indexando codebase...
node local-indexer.js --index
if errorlevel 1 (
    echo ❌ Error en indexacion
    pause
    exit /b 1
)

echo [3/3] Iniciando servidor local...
start "Sistema POS - Analisis Local" cmd /k "cd /d %~dp0 && node local-server.js"

echo.
echo ========================================
echo   SISTEMA INICIADO EXITOSAMENTE!
echo ========================================
echo.
echo Servicios activos:
echo ✅ Base de datos SQLite: code-index.db
echo ✅ Servidor API: http://localhost:3001
echo ✅ Indexacion completada
echo.
echo Comandos utiles:
echo - npm run system:health (Ver estado)
echo - npm run clear-index (Limpiar y reindexar)
echo.
pause