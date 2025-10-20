@echo off
echo ========================================
echo   EJECUTANDO TEST DESDE CUALQUIER LUGAR
echo ========================================
echo.
echo Navegando al directorio del proyecto...
cd /d "%~dp0backend"
echo.
echo Ejecutando test de compras de alta carga (300/hora)...
node test_compras_3min.js
echo.
echo Test completado. Presiona cualquier tecla para continuar...
pause > nul