@echo off
echo ========================================
echo   TEST COMPRAS DE ALTA CARGA
echo   300 ventas por hora durante 1 hora
echo ========================================
echo.
echo Ejecutando test desde el directorio correcto...
echo.
cd /d %~dp0
node test_compras_3min.js
echo.
echo Test completado. Presiona cualquier tecla para continuar...
pause > nul