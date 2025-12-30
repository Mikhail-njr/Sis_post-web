@echo off
setlocal enabledelayedexpansion

:: Herramienta de diagnóstico del Sistema POS
set "APP_DIR=%ProgramFiles%\SistemaPOS"
set "NODE_DIR=%ProgramFiles%\nodejs"
set "NGROK_DIR=%ProgramFiles%\ngrok"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🔧 HERRAMIENTA DE DIAGNÓSTICO                   ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Esta herramienta verifica el estado del Sistema POS.
echo Fecha: %DATE% %TIME%
echo.

:: Inicializar contadores
set "ISSUES=0"
set "WARNINGS=0"
set "OK_CHECKS=0"

echo ┌─ Verificación del sistema ────────────────────────────────┐

:: Verificar sistema operativo
echo │ Sistema Operativo: %OS%
for /f "tokens=2 delims==" %%i in ('wmic os get Caption /value') do set "OS_NAME=%%i"
echo │ Versión: %OS_NAME%

:: Verificar arquitectura
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo │ Arquitectura: 64-bit ✅
    set /a "OK_CHECKS+=1"
) else (
    echo │ Arquitectura: 32-bit ⚠️ (Recomendado: 64-bit)
    set /a "WARNINGS+=1"
)

:: Verificar memoria RAM
for /f "tokens=2 delims==" %%i in ('wmic ComputerSystem get TotalPhysicalMemory /value') do set "MEM=%%i"
set /a "MEM_MB=%MEM% / 1024 / 1024"
if %MEM_MB% GEQ 2048 (
    echo │ Memoria RAM: %MEM_MB% MB ✅
    set /a "OK_CHECKS+=1"
) else if %MEM_MB% GEQ 1024 (
    echo │ Memoria RAM: %MEM_MB% MB ⚠️ (Recomendado: 2048MB+)
    set /a "WARNINGS+=1"
) else (
    echo │ Memoria RAM: %MEM_MB% MB ❌ (Mínimo: 1024MB)
    set /a "ISSUES+=1"
)

:: Verificar espacio en disco
for /f "tokens=3" %%i in ('dir /-c C:\ ^| find "bytes free"') do set "FREE_SPACE=%%i"
set /a "FREE_GB=%FREE_SPACE:~0,-9% / 1024 / 1024 / 1024"
if %FREE_GB% GEQ 2 (
    echo │ Espacio libre: %FREE_GB% GB ✅
    set /a "OK_CHECKS+=1"
) else if %FREE_GB% GEQ 1 (
    echo │ Espacio libre: %FREE_GB% GB ⚠️ (Recomendado: 2GB+)
    set /a "WARNINGS+=1"
) else (
    echo │ Espacio libre: %FREE_GB% GB ❌ (Mínimo: 1GB)
    set /a "ISSUES+=1"
)

echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Verificación de componentes ─────────────────────────────┐

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('node --version') do set "CURRENT_NODE=%%i"
    echo │ Node.js: !CURRENT_NODE! ✅
    set /a "OK_CHECKS+=1"

    :: Verificar ubicación
    where node >nul 2>&1
    if %errorlevel% == 0 (
        for /f "tokens=*" %%i in ('where node') do echo │ Ubicación: %%i
    )
) else (
    echo │ Node.js: ❌ No instalado
    set /a "ISSUES+=1"
)

:: Verificar npm
npm --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo │ npm: %%i ✅
    set /a "OK_CHECKS+=1"
) else (
    echo │ npm: ❌ No disponible
    set /a "ISSUES+=1"
)

:: Verificar ngrok
ngrok version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('ngrok version') do echo │ ngrok: %%i ✅
    set /a "OK_CHECKS+=1"

    :: Verificar configuración
    if exist "%USERPROFILE%\.ngrok2\ngrok.yml" (
        echo │ Configuración: ✅ Presente
    ) else (
        echo │ Configuración: ⚠️ No encontrada
        set /a "WARNINGS+=1"
    )
) else (
    echo │ ngrok: ❌ No instalado
    set /a "WARNINGS+=1"
)

:: Verificar aplicación
if exist "%APP_DIR%" (
    echo │ Sistema POS: ✅ Instalado
    set /a "OK_CHECKS+=1"

    :: Verificar archivos críticos
    if exist "%APP_DIR%\SistemaPOS.exe" (
        echo │ Ejecutable: ✅ Presente
    ) else (
        echo │ Ejecutable: ❌ No encontrado
        set /a "ISSUES+=1"
    )

    if exist "%APP_DIR%\pos_database.sqlite" (
        echo │ Base de datos: ✅ Presente
    ) else (
        echo │ Base de datos: ⚠️ No encontrada (se creará)
        set /a "WARNINGS+=1"
    )
) else (
    echo │ Sistema POS: ❌ No instalado
    set /a "ISSUES+=1"
)

echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Verificación de conectividad ────────────────────────────┐

:: Verificar conexión a internet
ping -n 1 google.com >nul 2>&1
if %errorlevel% == 0 (
    echo │ Internet: ✅ Conectado
    set /a "OK_CHECKS+=1"
) else (
    echo │ Internet: ❌ Sin conexión
    set /a "WARNINGS+=1"
)

:: Verificar puertos
netstat -an | find "3000" >nul 2>&1
if %errorlevel% == 0 (
    echo │ Puerto 3000: ⚠️ En uso (posible conflicto)
    set /a "WARNINGS+=1"
) else (
    echo │ Puerto 3000: ✅ Disponible
    set /a "OK_CHECKS+=1"
)

echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Verificación de permisos ───────────────────────────────┐

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorlevel% == 0 (
    echo │ Administrador: ✅ Sí
    set /a "OK_CHECKS+=1"
) else (
    echo │ Administrador: ⚠️ No (algunas funciones limitadas)
    set /a "WARNINGS+=1"
)

:: Verificar escritura en directorio de programa
if exist "%ProgramFiles%" (
    echo test > "%ProgramFiles%\test.tmp" 2>nul
    if %errorlevel% == 0 (
        del "%ProgramFiles%\test.tmp" >nul 2>&1
        echo │ Escritura ProgramFiles: ✅ Permitida
        set /a "OK_CHECKS+=1"
    ) else (
        echo │ Escritura ProgramFiles: ❌ Bloqueada
        set /a "ISSUES+=1"
    )
)

echo └────────────────────────────────────────────────────────────┘
echo.

:: Resumen final
echo ┌─ Resumen del diagnóstico ────────────────────────────────┐
echo │ ✅ Verificaciones exitosas: %OK_CHECKS%
echo │ ⚠️  Advertencias: %WARNINGS%
echo │ ❌ Problemas encontrados: %ISSUES%
echo │

if %ISSUES%==0 (
    if %WARNINGS%==0 (
        echo │ 🎉 Estado: EXCELENTE - Todo funcionando correctamente
    ) else (
        echo │ ✅ Estado: BUENO - Funcional con algunas advertencias
    )
) else (
    echo │ ⚠️  Estado: REQUIERE ATENCIÓN - Hay problemas que resolver
)

echo └────────────────────────────────────────────────────────────┘
echo.

:: Recomendaciones
if %ISSUES% GTR 0 (
    echo ┌─ Problemas detectados ─────────────────────────────────┐
    if not exist "%APP_DIR%" (
        echo │ • Sistema POS no instalado
        echo │   → Ejecute el instalador principal
    )
    if not exist "%NODE_DIR%" (
        echo │ • Node.js no instalado
        echo │   → Use instaladores\instalar_nodejs.bat
    )
    if not exist "%NGROK_DIR%" (
        echo │ • ngrok no instalado
        echo │   → Use instaladores\instalar_ngrok.bat
    )
    echo └─────────────────────────────────────────────────────────┘
    echo.
)

if %WARNINGS% GTR 0 (
    echo ┌─ Recomendaciones ──────────────────────────────────────┐
    if %MEM_MB% LSS 2048 (
        echo │ • Considere aumentar la memoria RAM
    )
    if %FREE_GB% LSS 2 (
        echo │ • Libere espacio en disco
    )
    if not exist "%USERPROFILE%\.ngrok2\ngrok.yml" (
        echo │ • Configure ngrok para acceso remoto
        echo │   → Use instaladores\configurar_ngrok.bat
    )
    echo └─────────────────────────────────────────────────────────┘
    echo.
)

echo 📞 Soporte técnico:
echo    • Email: soporte@sistema-pos.com
echo    • Web: https://sistema-pos.com
echo.

pause
goto :eof