@echo off
echo 🚀 Iniciando ChromaDB para análisis de código...

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no está instalado o no está en el PATH
    echo Por favor instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Iniciar ChromaDB
echo 📦 Iniciando contenedor ChromaDB...
docker run -d --name chroma-pos -p 8000:8000 chromadb/chroma:latest

REM Esperar a que ChromaDB esté listo
echo ⏳ Esperando a que ChromaDB se inicie...
timeout /t 10 >nul

REM Verificar si ChromaDB está respondiendo
curl -s http://localhost:8000/api/v1/heartbeat >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ChromaDB está activo en http://localhost:8000
) else (
    echo ⚠️ ChromaDB no responde, pero el contenedor se inició
    echo Puedes verificar con: docker logs chroma-pos
)

echo.
echo 🎯 ChromaDB listo para usar con las herramientas de análisis de código
echo 📊 Usa: npm run detect-duplication para detectar duplicados
echo 📊 Usa: npm run detect-text para análisis de texto básico
echo.
pause