@echo off
echo ========================================
echo   TEST DE CARGA ALTA - Sistema POS
echo ========================================
echo.

echo Verificando estado actual...
docker stats qdrant-pos --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo.

echo Iniciando test de carga alta...
echo Esto forzara el uso de mas recursos del sistema
echo.

cd /d "%~dp0"

echo 1. Probando insercion masiva de datos...
curl -X POST -H "Content-Type: application/json" -d "{\"collection\":\"code_patterns\",\"points\":[{\"id\":\"test_1\",\"vector\":[0.1,0.2,0.3],\"payload\":{\"test\":\"data\"}}]}" http://localhost:6333/collections/code_patterns/points >nul 2>&1

echo 2. Ejecutando multiples busquedas simultaneas...
for /L %%i in (1,1,10) do (
    start /B curl -s -X POST -H "Content-Type: application/json" -d "{\"query\":\"function\",\"limit\":20}" http://localhost:3001/api/search/similar >nul 2>&1
)

echo 3. Monitoreando recursos durante 30 segundos...
echo Presiona Ctrl+C para detener el monitoreo
echo.
echo Recursos actuales:
docker stats qdrant-pos --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" --no-stream

echo.
echo Test completado. Los recursos deberian haber aumentado significativamente.
pause