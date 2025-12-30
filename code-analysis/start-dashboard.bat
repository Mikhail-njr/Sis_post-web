@echo off
echo 🚀 Iniciando Dashboard de Indexación Local...
echo ===========================================
echo.
echo 1. Iniciando servidor de indexación...
start "Servidor de Indexación" cmd /k "cd /d %~dp0 && node local-server.js"
echo.
echo 2. Iniciando dashboard en navegador...
timeout /t 3 /nobreak >nul
start "" "http://localhost:3001/api" 2>nul
start "" "%~dp0\indexer-dashboard.html"
echo.
echo ✅ Dashboard iniciado!
echo.
echo 📊 Accesos rápidos:
echo    - API: http://localhost:3001/api
echo    - Dashboard: %~dp0\indexer-dashboard.html
echo    - Documentación: %~dp0\SOLUCION_INDEXACION_LOCAL.md
echo.
echo 📝 Comandos disponibles en el dashboard:
echo    - Indexar Codebase: Indexa todos los archivos
echo    - Limpiar Índice: Elimina todo el índice
echo    - Limpiar y Reindexar: Limpieza completa + indexación
echo    - Ver Estadísticas: Muestra métricas del proyecto
echo    - Verificar Salud: Comprueba estado del servidor
echo.
echo 🔍 Búsqueda de Código:
echo    - Busca código similar usando palabras clave
echo    - Resultados en tiempo real
echo    - Información detallada de coincidencias
echo.
pause