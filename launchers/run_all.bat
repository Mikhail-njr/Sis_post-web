@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Sistema POS Completo - Ejecutando Todos los Servicios
echo ========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Ejecuta primero 'setup.bat' para configurar el proyecto.
    pause
    exit /b 1
)

:: Guardar rutas completas (usando directorio padre para llegar a la raíz)
set "PROJECT_DIR=%~dp0..\"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "CODE_ANALYSIS_DIR=%PROJECT_DIR%code-analysis"

:: Verificar si Node.js ya está ejecutándose y detenerlo
tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if %errorlevel% equ 0 (
    echo Deteniendo procesos Node.js existentes...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo Iniciando servicios...
echo.

:: 1. Iniciar Backend (puerto 3000)
echo [1/3] Iniciando Backend...
cd /d "%BACKEND_DIR%"
if not exist "server.js" (
    echo ❌ server.js no encontrado en backend
    pause
    exit /b 1
)
start "Backend POS" cmd /k "cd /d "%BACKEND_DIR%" && node server.js"
echo ✅ Backend iniciado en puerto 3000
timeout /t 2 /nobreak >nul

:: 2. Iniciar Code Analysis (puerto 3001)
echo [2/3] Iniciando Code Analysis...
cd /d "%CODE_ANALYSIS_DIR%"
if not exist "server.js" (
    echo ❌ server.js no encontrado en code-analysis
    pause
    exit /b 1
)
start "Code Analysis" cmd /k "cd /d "%CODE_ANALYSIS_DIR%" && npm start"
echo ✅ Code Analysis iniciado en puerto 3001
timeout /t 2 /nobreak >nul

:: 3. Iniciar ngrok tunnel
echo [3/3] Iniciando ngrok tunnel...
echo Comando: ngrok http 3000 --config=ngrok.yml
echo.
echo NOTA: Asegúrate de que ngrok esté configurado con tu authtoken.
echo El archivo ngrok.yml debe estar en el directorio backend.
echo.
cd /d "%BACKEND_DIR%"
start "Ngrok Tunnel" cmd /k "ngrok http 3000 --config=ngrok.yml"
echo ✅ Ngrok tunnel iniciado
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo    TODOS LOS SERVICIOS EJECUTÁNDOSE
echo ========================================
echo.
echo ✅ Backend: http://localhost:3000
echo ✅ Code Analysis: http://localhost:3001
echo 🌐 Ngrok: Ejecutándose en ventana separada
echo    La URL aparecerá en la terminal del tunnel (ventana "Ngrok Tunnel")
echo    Busca una línea como: https://xxxxx.ngrok.io
echo.
echo 🔓 Sin login: Modo simulación
echo 🔐 Con login: Acceso completo
echo.
echo Credenciales de admin:
echo    Usuario: admin
echo    Contraseña: pos123
echo.
echo 📊 Panel de control: http://localhost:3000/dashboard
echo 🔍 Code Analysis API: http://localhost:3001/api
echo.

:: Abrir navegador
echo [OPCIONAL] ¿Abrir navegador?
echo [1] Sí - Abrir http://localhost:3000
echo [0] No
set /p "open_browser=¿Abrir navegador? [0-1]: "
if "!open_browser!"=="1" start http://localhost:3000

echo.
echo ⚠️  NOTA:
echo     - Backend ejecutándose en ventana 'Backend POS'
echo     - Code Analysis en ventana 'Code Analysis'
echo     - Ngrok ejecutándose en ventana 'Ngrok Tunnel'
echo     - Para detener: Cierra las ventanas o presiona Ctrl+C
echo.

pause
exit /b 0