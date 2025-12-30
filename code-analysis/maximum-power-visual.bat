@echo off
echo ========================================
echo   MODO MAXIMA POTENCIA VISUAL
echo ========================================
echo.
echo ACTIVANDO TODOS LOS RECURSOS CON INFORMACION VISUAL
echo.

cd /d "%~dp0"

echo [FASE 1/4] Deteniendo servicios existentes...
echo - Deteniendo contenedor qdrant-pos...
docker stop qdrant-pos >nul 2>&1
echo - Deteniendo procesos Node.js...
taskkill /f /im node.exe >nul 2>&1
echo - Esperando 3 segundos...
timeout /t 3 /nobreak >nul
echo ✅ Servicios detenidos correctamente
echo.

echo [FASE 2/4] Iniciando Qdrant con maxima potencia...
echo - Iniciando contenedor Docker...
docker run -d --name qdrant-pos ^
    --cpus=3.5 ^
    --memory=8g ^
    --memory-swap=10g ^
    --cpuset-cpus=0-3 ^
    -p 6333:6333 ^
    -p 6334:6334 ^
    -v qdrant_storage:/qdrant/storage ^
    -e QDRANT__SERVICE__HTTP_PORT=6333 ^
    -e QDRANT__SERVICE__GRPC_PORT=6334 ^
    -e QDRANT__STORAGE__OPTIMIZERS__DEFAULT_SEGMENT_NUMBER=8 ^
    -e QDRANT__STORAGE__OPTIMIZERS__MEMMAP_THRESHOLD=100000 ^
    qdrant/qdrant

if %errorlevel% neq 0 (
    echo ❌ ERROR: No se pudo iniciar Qdrant
    pause
    exit /b 1
)

echo ✅ Qdrant iniciado correctamente
echo - Esperando que Qdrant inicie completamente...
timeout /t 10 /nobreak >nul

echo - Verificando conectividad de Qdrant...
curl -s http://localhost:6333 >nul
if %errorlevel% neq 0 (
    echo ❌ ERROR: Qdrant no responde
    pause
    exit /b 1
)
echo ✅ Qdrant responde correctamente
echo.

echo [FASE 3/4] Verificando estado del sistema...
echo - Contenedores Docker activos:
docker ps --filter name=qdrant-pos --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo - Procesos Node.js activos:
tasklist /fi "imagename eq node.exe" /nh
echo.

echo [FASE 4/4] Iniciando servidor de analisis...
echo - Iniciando Node.js con optimizaciones extremas...
start "MAX POWER Node.js - SERVIDOR ACTIVO" cmd /k "cd /d %~dp0 && set NODE_OPTIONS=--max-old-space-size=6144 --max-semi-space-size=1024 && set UV_THREADPOOL_SIZE=32 && set NODE_ENV=production && echo 🚀 Servidor iniciandose... && node simple-server.js && echo ✅ Servidor ejecutandose en http://localhost:3001"

echo.
echo ========================================
echo   MAXIMA POTENCIA ACTIVADA!
echo ========================================
echo.
echo ✅ Qdrant ejecutandose en: http://localhost:6333
echo ✅ Servidor de analisis: http://localhost:3001
echo ✅ API disponible en: http://localhost:3001/api
echo.
echo 📊 Recursos asignados:
echo   • Qdrant: 3.5 CPUs, 8GB RAM, 10GB Swap
echo   • Node.js: 6GB Heap, 32 hilos, Optimizado
echo   • Procesamiento paralelo maximo
echo.
echo 🔍 Para verificar estado:
echo   • Ejecuta: ver-estado.bat
echo   • O usa: monitor-indexacion.bat
echo.
echo ⚡ La indexacion comenzara automaticamente
echo   Busca la ventana "MAX POWER Node.js" para ver progreso
echo.
pause