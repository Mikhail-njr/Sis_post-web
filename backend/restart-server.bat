@echo off
echo Matando procesos node existentes...
taskkill /F /IM node.exe 2>nul
echo.
echo Iniciando servidor...
cd /d "%~dp0"
node server.js
