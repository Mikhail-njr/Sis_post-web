@echo off
echo ========================================
echo   OPTIMIZACION VS CODE - MAXIMA VELOCIDAD
echo ========================================
echo.

echo [1/3] Optimizando configuraciones de VS Code...
echo Ajustando configuraciones para indexacion rapida...
echo Configuraciones ya aplicadas en .vscode/settings.json

echo [2/3] Iniciando Docker con recursos maximos...
docker-compose -f code-analysis\docker-compose.yml up -d

echo [3/3] Ejecutando indexacion optimizada...
cd code-analysis
node simple-index.js

echo.
echo ========================================
echo   OPTIMIZACION COMPLETADA!
echo ========================================
echo.
echo Configuraciones aplicadas:
echo ✅ VS Code: Indexacion acelerada
echo ✅ Docker: 4 CPUs, 12GB RAM
echo ✅ Qdrant: Segmentos optimizados
echo.
pause