@echo off
echo ========================================
echo   EJECUTANDO TEST DE LOTES
echo ========================================
echo.
echo Navegando al directorio del proyecto...
cd /d "%~dp0"
echo.
echo Ejecutando test de lotes (5 compras con control de stock)...
node test_lotes.js
echo.
echo Test completado. Presiona cualquier tecla para continuar...
pause > nul