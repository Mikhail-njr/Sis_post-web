@echo off
echo ========================================
echo   OPTIMIZACION DE NODE.JS - Sistema POS
echo ========================================
echo.

echo Configurando Node.js para maximo rendimiento...
echo.

cd /d "%~dp0"

echo 1. Verificando version de Node.js...
node --version

echo.
echo 2. Configurando variables de entorno para alto rendimiento...

set NODE_OPTIONS=--max-old-space-size=4096 --max-semi-space-size=512
set UV_THREADPOOL_SIZE=16
set NODE_ENV=production

echo Variables configuradas:
echo - Max heap: 4GB
echo - Semi space: 512MB
echo - Thread pool: 16 hilos
echo - Environment: production

echo.
echo 3. Verificando recursos disponibles...
echo CPUs disponibles:
wmic cpu get NumberOfCores,NumberOfLogicalProcessors /format:list

echo.
echo Memoria disponible:
wmic ComputerSystem get TotalPhysicalMemory /format:list

echo.
echo 4. Iniciando servidor con optimizaciones...
echo Presiona Ctrl+C para detener
echo.

node --max-old-space-size=4096 --max-semi-space-size=512 simple-server.js

pause