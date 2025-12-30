@echo off
echo ========================================
echo   MODO MAXIMA POTENCIA - Sistema POS
echo ========================================
echo.
echo ACTIVANDO TODOS LOS RECURSOS DISPONIBLES
echo.

cd /d "%~dp0"

echo [1/4] Deteniendo servicios existentes...
docker stop qdrant-pos >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Iniciando Qdrant con maxima potencia...
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

echo [3/4] Esperando que Qdrant inicie...
timeout /t 15 /nobreak >nul

echo [4/4] Iniciando Node.js con optimizaciones extremas...
start "MAX POWER Node.js" cmd /k "cd /d %~dp0 && set NODE_OPTIONS=--max-old-space-size=6144 --max-semi-space-size=1024 && set UV_THREADPOOL_SIZE=32 && set NODE_ENV=production && node simple-server.js"

echo.
echo ========================================
echo   MAXIMA POTENCIA ACTIVADA!
echo ========================================
echo.
echo Recursos asignados:
echo ✅ Qdrant: 3.5 CPUs, 8GB RAM, 10GB Swap
echo ✅ Node.js: 6GB Heap, 32 hilos, Optimizado
echo ✅ Procesamiento paralelo maximo
echo.
echo El sistema ahora usara todos los recursos disponibles
echo durante la indexacion y busquedas.
echo.
echo Comandos utiles:
echo - npm run test:load (Probar carga maxima)
echo - docker stats qdrant-pos (Ver recursos)
echo - npm run system:health (Ver estado)
echo.
pause