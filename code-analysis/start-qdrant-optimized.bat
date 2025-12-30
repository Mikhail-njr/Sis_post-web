@echo off
echo ========================================
echo   QDRANT OPTIMIZADO - Sistema POS
echo ========================================
echo.

echo Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta instalado
    pause
    exit /b 1
)

echo.
echo Iniciando Qdrant con configuracion optimizada...
echo Recursos asignados: 3.5 CPUs, 8GB RAM (MAXIMO PODER)
echo.

cd /d "%~dp0"

if exist "docker-compose.yml" (
    echo Usando Docker Compose...
    docker-compose up -d
) else (
    echo Usando comando Docker directo...
    docker run -d --name qdrant-pos ^
        --cpus=3.5 ^
        --memory=8g ^
        --memory-swap=10g ^
        -p 6333:6333 ^
        -p 6334:6334 ^
        -v qdrant_storage:/qdrant/storage ^
        -e QDRANT__SERVICE__HTTP_PORT=6333 ^
        -e QDRANT__SERVICE__GRPC_PORT=6334 ^
        -e QDRANT__STORAGE__OPTIMIZERS__DEFAULT_SEGMENT_NUMBER=4 ^
        -e QDRANT__STORAGE__OPTIMIZERS__MEMMAP_THRESHOLD=50000 ^
        qdrant/qdrant
)

echo.
echo Esperando que Qdrant inicie...
timeout /t 10 /nobreak >nul

echo.
echo Verificando estado...
curl -s http://localhost:6333/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Qdrant esta funcionando correctamente!
    echo 📊 Dashboard: http://localhost:6333/dashboard
    echo 🔍 API: http://localhost:6333
) else (
    echo ❌ Error: Qdrant no responde
    docker logs qdrant-pos
)

echo.
echo ========================================
echo   CONFIGURACION OPTIMIZADA ACTIVA
echo ========================================
echo CPU: 2 nucleos (200%% de capacidad)
echo RAM: 4GB limite, 6GB swap
echo Optimizaciones: Segmentos paralelos
echo Persistencia: Datos guardados
echo.
pause