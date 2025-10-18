@echo off
echo ========================================
echo   Sistema POS - Versión Simple
echo ========================================
echo.
echo Esta versión NO usa ngrok para evitar problemas
echo Solo funciona en localhost
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Ejecuta primero 'setup.bat' para configurar el proyecto.
    pause
    exit /b 1
)

:: Cambiar al directorio backend y guardar la ruta completa
cd /d "%~dp0..\backend"
set "BACKEND_DIR=%CD%"

:: Verificar si Node.js ya está ejecutándose y detenerlo
tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if %errorlevel% equ 0 (
    echo Deteniendo proceso Node.js existente...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo Iniciando servidor...
echo Directorio actual: %CD%
echo Archivo server.js existe:
if exist "server.js" (
    echo ✅ server.js encontrado
) else (
    echo ❌ server.js NO encontrado
    dir
    pause
    exit /b 1
)

:: Usar ruta completa para evitar problemas
start /B cmd /c "cd /d "%BACKEND_DIR%" && node server.js"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    SERVIDOR EN EJECUCION
echo ========================================
echo.
echo ✅ Local: http://localhost:3000
echo.
echo 🔓 Sin login: Modo simulación
echo 🔐 Con login: Acceso completo
echo.
echo Credenciales de admin:
echo    Usuario: admin
echo    Contraseña: pos123
echo.
echo 📊 Panel de control: http://localhost:3000/dashboard
echo.
echo ⏹️  Presiona Ctrl+C para detener el servidor
echo.

pause
exit /b 0