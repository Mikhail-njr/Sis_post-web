@echo off
echo 🔄 Reiniciando servidor backend...

REM Matar procesos de Node.js
taskkill /f /im node.exe >nul 2>&1

REM Esperar un momento
timeout /t 2 /nobreak >nul

REM Iniciar el servidor
echo 🚀 Iniciando servidor en http://localhost:3000...
start cmd /k "cd /d %~dp0 && node backend/server.js"

echo ✅ Servidor reiniciado
pause