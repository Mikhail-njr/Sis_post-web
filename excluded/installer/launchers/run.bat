@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Sistema POS - Ejecutando Servidor
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

:: Cambiar al directorio backend y guardar la ruta completa
cd /d "%~dp0..\..\..\backend"
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

:: SOLUCIÓN: Iniciar Node.js en una ventana
echo Iniciando servidor Node.js en nueva ventana...
start "Servidor POS" cmd /k "node server.js"
echo Esperando a que Node.js se inicie completamente...
timeout /t 3 /nobreak >nul

:: Verificar y generar claves SSH si no existen
echo Verificando claves SSH...
if not exist "%USERPROFILE%\.ssh\id_rsa" (
    echo Generando claves SSH para localhost.run...
    ssh-keygen -t rsa -b 4096 -C "debbye@localhost.run" -f "%USERPROFILE%\.ssh\id_rsa" -N ""
    echo Claves SSH generadas. La clave pública está en %USERPROFILE%\.ssh\id_rsa.pub
) else (
    echo Claves SSH ya existen.
)

:: SOLUCIÓN: Iniciar ngrok tunnel en una ventana SEPARADA
echo Iniciando ngrok tunnel en nueva ventana...
echo Comando: ngrok http 3000 --config=ngrok.yml
echo.
echo NOTA: Asegúrate de que ngrok esté configurado con tu authtoken.
echo El archivo ngrok.yml debe estar en el directorio backend.
echo.
cd /d "%BACKEND_DIR%"
start "Ngrok Tunnel" cmd /k "ngrok http 3000 --config=ngrok.yml"
timeout /t 5 /nobreak >nul

:: Volver al directorio backend para continuar
cd /d "%BACKEND_DIR%"

echo.
echo ========================================
echo        DETECCIÓN DE NAVEGADORES
echo ========================================
echo.

:: Lista de navegadores comunes
echo [1] Google Chrome
echo [2] Microsoft Edge
echo [3] Mozilla Firefox
echo [4] Opera
echo [5] Brave Browser
echo [6] Navegador predeterminado
echo [0] No abrir navegador
echo.

set /p "eleccion=Selecciona con que navegador abrir [0-6]: "

if "!eleccion!"=="0" (
    echo No se abrira navegador.
    goto :mostrar_servidor
)

if "!eleccion!"=="1" start chrome http://localhost:3000
if "!eleccion!"=="2" start msedge http://localhost:3000
if "!eleccion!"=="3" start firefox http://localhost:3000
if "!eleccion!"=="4" start opera http://localhost:3000
if "!eleccion!"=="5" start brave http://localhost:3000
if "!eleccion!"=="6" start http://localhost:3000

:mostrar_servidor
echo.
echo ========================================
echo    SERVIDOR EN EJECUCION
echo ========================================
echo.
echo ✅ Local: http://localhost:3000
echo.
echo 🌐 Ngrok: Se está iniciando en ventana separada
echo    La URL aparecerá en la terminal del tunnel (ventana "Ngrok Tunnel")
echo    Busca una línea como: https://xxxxx.ngrok.io
echo.

echo ========================================
echo    ACCESO AL SISTEMA
echo ========================================
echo.
echo 🔓 Sin login: Modo simulación (solo ver productos)
echo 🔐 Con login: Acceso completo al sistema
echo.
echo Credenciales de admin:
echo    Usuario: admin
echo    Contraseña: pos123
echo.
echo 📊 Panel de control: http://localhost:3000/dashboard
echo.

echo.
echo ⚠️  NOTA:
echo     - Servidor ejecutándose en ventana 'Servidor POS'
echo     - Ngrok ejecutándose en ventana 'Ngrok Tunnel'
echo     - La URL aparecerá en la terminal del tunnel
echo.

echo.
echo 🎉 ¡Sistema POS listo y funcionando!
echo.
pause
::exit /b 0