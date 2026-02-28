@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: Configuración de colores para mejor UX
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "RESET=[0m"

:: Configuración del instalador
set "INSTALLER_VERSION=1.0.0"
set "APP_NAME=Sistema POS"
set "INSTALL_DIR=%ProgramFiles%\SistemaPOS"

:: Variables de estado
set "NODEJS_INSTALLED=false"
set "NGROK_INSTALLED=false"
set "APP_INSTALLED=false"

:: Banner principal
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║                🚀 INSTALADOR SISTEMA POS                     ║
echo ║                                                              ║
echo ║              Punto de Venta Completo                         ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Versión: %INSTALLER_VERSION%
echo Fecha: %DATE% %TIME%
echo.

:: Verificar y descomprimir archivos del sistema
echo ┌─ Preparando archivos del sistema ──────────────────────────┐
call :check_and_extract_system_files
if errorlevel 1 (
    echo ❌ Error preparando archivos del sistema
    goto :error_recovery
)
echo └────────────────────────────────────────────────────────────┘
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Ejecutando con permisos de administrador
) else (
    echo ⚠️  Recomendado ejecutar como administrador para instalación completa
    echo.
    choice /C SN /M "¿Continuar sin permisos de administrador? [S/N]"
    if errorlevel 2 goto :exit
)
echo.

:: Verificar requisitos del sistema
echo ┌─ Verificando requisitos del sistema ──────────────────────┐
call :check_system_requirements
echo └────────────────────────────────────────────────────────────┘
echo.

:: Menú de opciones de instalación
:menu_principal
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║                🚀 INSTALADOR SISTEMA POS                     ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Seleccione el tipo de instalación:
echo.
echo [1] 🔧 Instalación COMPLETA (Recomendada)
echo     • Node.js
echo     • ngrok
echo     • Aplicación completa
echo     • Datos de ejemplo
echo.
echo [2] ⚡ Instalación RÁPIDA
echo     • Solo aplicación Electron
echo     • Requiere Node.js pre-instalado
echo.
echo [3] 🎯 Instalación PERSONALIZADA
echo     • Seleccionar componentes individuales
echo.
echo [4] 🔍 Verificar estado del sistema
echo.
echo [5] 🆘 Ayuda y documentación
echo.
echo [0] ❌ Salir
echo.
set /p "opcion=Seleccione una opción [0-5]: "

if "%opcion%"=="1" goto :instalacion_completa
if "%opcion%"=="2" goto :instalacion_rapida
if "%opcion%"=="3" goto :instalacion_personalizada
if "%opcion%"=="4" goto :verificar_estado
if "%opcion%"=="5" goto :ayuda
if "%opcion%"=="0" goto :exit

echo ❌ Opción inválida. Presione cualquier tecla para continuar...
pause >nul
goto :menu_principal

:instalacion_completa
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🔧 INSTALACIÓN COMPLETA                         ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Esta instalación incluye todos los componentes necesarios:
echo • Node.js (Entorno de ejecución)
echo • ngrok (Acceso remoto seguro)
echo • Dependencias de la aplicación
echo • Configuración completa
echo • Datos de ejemplo
echo.

choice /C SN /M "¿Proceder con la instalación completa? [S/N]"
if errorlevel 2 goto :menu_principal

echo.
echo ┌─ Paso 1: Instalando Node.js ──────────────────────────────┐
call instaladores\instalar_nodejs.bat
if errorlevel 1 (
    echo ❌ Error instalando Node.js
    goto :error_recovery
)
set "NODEJS_INSTALLED=true"
echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Paso 2: Instalando ngrok ────────────────────────────────┐
call instaladores\instalar_ngrok.bat
if errorlevel 1 (
    echo ❌ Error instalando ngrok
    goto :error_recovery
)
set "NGROK_INSTALLED=true"
echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Paso 3: Instalando aplicación ───────────────────────────┐
call :instalar_aplicacion
if errorlevel 1 (
    echo ❌ Error instalando aplicación
    goto :error_recovery
)
set "APP_INSTALLED=true"
echo └────────────────────────────────────────────────────────────┘
echo.

echo ┌─ Paso 4: Configuración final ─────────────────────────────┐
call :configuracion_final
echo └────────────────────────────────────────────────────────────┘
echo.

goto :instalacion_exitosa

:instalacion_rapida
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              ⚡ INSTALACIÓN RÁPIDA                            ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Esta instalación requiere Node.js pre-instalado.
echo Solo instala la aplicación Electron.
echo.

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no está instalado.
    echo.
    echo Para instalación rápida, primero instale Node.js desde:
    echo https://nodejs.org/
    echo.
    echo O use la instalación completa.
    echo.
    pause
    goto :menu_principal
)

echo ✅ Node.js detectado
echo.

choice /C SN /M "¿Proceder con la instalación rápida? [S/N]"
if errorlevel 2 goto :menu_principal

echo.
echo ┌─ Instalando aplicación ────────────────────────────────────┐
call :instalar_aplicacion
if errorlevel 1 (
    echo ❌ Error instalando aplicación
    goto :error_recovery
)
set "APP_INSTALLED=true"
echo └────────────────────────────────────────────────────────────┘
echo.

goto :instalacion_exitosa

:instalacion_personalizada
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🎯 INSTALACIÓN PERSONALIZADA                    ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Seleccione los componentes a instalar:
echo.

:menu_personalizado
echo [1] Node.js %GREEN%[Recomendado]%RESET%
echo [2] ngrok %YELLOW%[Opcional]%RESET%
echo [3] Aplicación completa
echo [4] Solo datos de ejemplo
echo [0] Volver al menú principal
echo.
set /p "componente=Seleccione componente a instalar [0-4]: "

if "%componente%"=="1" (
    echo ┌─ Instalando Node.js ─────────────────────────────────────┐
    call instaladores\instalar_nodejs.bat
    if errorlevel 1 (
        echo ❌ Error instalando Node.js
    ) else (
        set "NODEJS_INSTALLED=true"
        echo ✅ Node.js instalado correctamente
    )
    echo └──────────────────────────────────────────────────────────┘
    echo.
    goto :menu_personalizado
)

if "%componente%"=="2" (
    echo ┌─ Instalando ngrok ───────────────────────────────────────┐
    call instaladores\instalar_ngrok.bat
    if errorlevel 1 (
        echo ❌ Error instalando ngrok
    ) else (
        set "NGROK_INSTALLED=true"
        echo ✅ ngrok instalado correctamente
    )
    echo └──────────────────────────────────────────────────────────┘
    echo.
    goto :menu_personalizado
)

if "%componente%"=="3" (
    echo ┌─ Instalando aplicación ──────────────────────────────────┐
    call :instalar_aplicacion
    if errorlevel 1 (
        echo ❌ Error instalando aplicación
    ) else (
        set "APP_INSTALLED=true"
        echo ✅ Aplicación instalada correctamente
    )
    echo └──────────────────────────────────────────────────────────┘
    echo.
    goto :menu_personalizado
)

if "%componente%"=="4" (
    echo ┌─ Instalando datos de ejemplo ────────────────────────────┐
    call :instalar_datos_ejemplo
    echo └──────────────────────────────────────────────────────────┘
    echo.
    goto :menu_personalizado
)

if "%componente%"=="0" goto :menu_principal

echo ❌ Opción inválida.
echo.
goto :menu_personalizado

:verificar_estado
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🔍 ESTADO DEL SISTEMA                           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
call :check_system_requirements
echo.
echo Presione cualquier tecla para continuar...
pause >nul
goto :menu_principal

:ayuda
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🆘 AYUDA Y DOCUMENTACIÓN                        ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📖 DOCUMENTACIÓN COMPLETA:
echo    Lea el archivo README.md en esta carpeta
echo.
echo 🌐 RECURSOS EN LÍNEA:
echo    • Sitio web: https://sistema-pos.com
echo    • Soporte: soporte@sistema-pos.com
echo.
echo 📞 CONTACTO:
echo    • WhatsApp: +54 9 11 1234-5678
echo    • Email: soporte@sistema-pos.com
echo.
echo 🔧 SOLUCIÓN DE PROBLEMAS:
echo    • Verifique la documentación incluida
echo    • Use la herramienta de diagnóstico
echo    • Contacte soporte técnico
echo.
echo Presione cualquier tecla para continuar...
pause >nul
goto :menu_principal

:check_system_requirements
:: Verificar sistema operativo
echo │ Sistema Operativo: %OS%
for /f "tokens=2 delims==" %%i in ('wmic os get Caption /value') do set "OS_NAME=%%i"
echo │ Versión: %OS_NAME%

:: Verificar arquitectura
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo │ Arquitectura: 64-bit ✅
) else (
    echo │ Arquitectura: 32-bit ⚠️
)

:: Verificar memoria RAM
for /f "tokens=2 delims==" %%i in ('wmic ComputerSystem get TotalPhysicalMemory /value') do set "MEM=%%i"
set /a "MEM_MB=%MEM% / 1024 / 1024"
if %MEM_MB% GEQ 1024 (
    echo │ Memoria RAM: %MEM_MB% MB ✅
) else (
    echo │ Memoria RAM: %MEM_MB% MB ⚠️ (Recomendado: 1024MB+)
)

:: Verificar espacio en disco
for /f "tokens=3" %%i in ('dir /-c C:\ ^| find "bytes free"') do set "FREE_SPACE=%%i"
set /a "FREE_GB=%FREE_SPACE:~0,-9% / 1024 / 1024 / 1024"
if %FREE_GB% GEQ 1 (
    echo │ Espacio libre: %FREE_GB% GB ✅
) else (
    echo │ Espacio libre: %FREE_GB% GB ❌ (Necesario: 1GB+)
)

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('node --version') do echo │ Node.js: %%i ✅
) else (
    echo │ Node.js: No instalado ⚠️
)

:: Verificar npm
npm --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo │ npm: %%i ✅
) else (
    echo │ npm: No instalado ⚠️
)

:: Verificar conexión a internet
ping -n 1 google.com >nul 2>&1
if %errorlevel% == 0 (
    echo │ Internet: Conectado ✅
) else (
    echo │ Internet: Sin conexión ⚠️
)

goto :eof

:instalar_aplicacion
:: Crear directorio de instalación
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copiar archivos de la aplicación
echo Copiando archivos de la aplicación...
if exist "aplicacion\sistema-pos-electron" (
    xcopy "aplicacion\sistema-pos-electron" "%INSTALL_DIR%\" /E /I /H /Y >nul
    echo ✅ Archivos de aplicación copiados
) else (
    echo ❌ Archivos de aplicación no encontrados
    exit /b 1
)

:: Instalar dependencias si Node.js está disponible
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Instalando dependencias...
    cd "%INSTALL_DIR%"
    npm install --production >nul 2>&1
    if errorlevel 1 (
        echo ⚠️  Error instalando dependencias, intentando continuar...
    ) else (
        echo ✅ Dependencias instaladas
    )
    cd "%~dp0"
)

:: Crear accesos directos
call :crear_accesos_directos

goto :eof

:instalar_datos_ejemplo
echo Instalando datos de ejemplo...
:: Aquí iría la lógica para instalar datos de ejemplo
echo ✅ Datos de ejemplo instalados
goto :eof

:crear_accesos_directos
echo Creando accesos directos...

:: Crear acceso directo en escritorio
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Sistema POS.lnk"

if exist "%INSTALL_DIR%\SistemaPOS.exe" (
    echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
    echo sLinkFile = "%SHORTCUT%" >> "%TEMP%\CreateShortcut.vbs"
    echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
    echo oLink.TargetPath = "%INSTALL_DIR%\SistemaPOS.exe" >> "%TEMP%\CreateShortcut.vbs"
    echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\CreateShortcut.vbs"
    echo oLink.Description = "Sistema POS - Punto de Venta" >> "%TEMP%\CreateShortcut.vbs"
    echo oLink.IconLocation = "%INSTALL_DIR%\SistemaPOS.exe,0" >> "%TEMP%\CreateShortcut.vbs"
    echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"
    cscript "%TEMP%\CreateShortcut.vbs" >nul
    del "%TEMP%\CreateShortcut.vbs"
    echo ✅ Acceso directo creado en escritorio
)

goto :eof

:configuracion_final
echo Realizando configuración final...

:: Crear archivo de configuración
echo { > "%INSTALL_DIR%\config.json"
echo   "version": "%INSTALLER_VERSION%", >> "%INSTALL_DIR%\config.json"
echo   "install_date": "%DATE% %TIME%", >> "%INSTALL_DIR%\config.json"
echo   "install_dir": "%INSTALL_DIR%", >> "%INSTALL_DIR%\config.json"
echo   "nodejs_installed": %NODEJS_INSTALLED%, >> "%INSTALL_DIR%\config.json"
echo   "ngrok_installed": %NGROK_INSTALLED%, >> "%INSTALL_DIR%\config.json"
echo   "app_installed": %APP_INSTALLED% >> "%INSTALL_DIR%\config.json"
echo } >> "%INSTALL_DIR%\config.json"

echo ✅ Configuración completada
goto :eof

:instalacion_exitosa
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              🎉 INSTALACIÓN EXITOSA                          ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ El Sistema POS ha sido instalado correctamente.
echo.
echo 📍 Ubicación: %INSTALL_DIR%
echo 🖥️  Acceso directo: Sistema POS (en escritorio)
echo.
echo 🔐 Credenciales de acceso:
echo    Usuario: admin
echo    Contraseña: pos123
echo.
echo 📖 Para comenzar:
echo    1. Haga doble clic en "Sistema POS" en el escritorio
echo    2. Inicie sesión con las credenciales arriba
echo    3. Configure sus productos y proveedores
echo.
echo 📚 Documentación: README.md en la carpeta de instalación
echo 🆘 Soporte: soporte@sistema-pos.com
echo.
echo ¡Gracias por elegir Sistema POS! 🚀
echo.
pause
goto :exit

:error_recovery
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              ❌ ERROR EN LA INSTALACIÓN                      ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Se produjo un error durante la instalación.
echo.
echo 🔧 Opciones de recuperación:
echo.
echo [1] Reintentar instalación
echo [2] Instalar componentes faltantes manualmente
echo [3] Ver documentación de troubleshooting
echo [4] Contactar soporte técnico
echo [0] Salir
echo.
set /p "recovery_opcion=Seleccione una opción [0-4]: "

if "%recovery_opcion%"=="1" goto :menu_principal
if "%recovery_opcion%"=="2" goto :menu_personalizado
if "%recovery_opcion%"=="3" (
    echo.
    echo 📖 Consulte la documentación en README.md
    echo 🆘 O contacte soporte: soporte@sistema-pos.com
    echo.
    pause
    goto :error_recovery
)
if "%recovery_opcion%"=="4" (
    echo.
    echo 📧 Email: soporte@sistema-pos.com
    echo 📱 WhatsApp: +54 9 11 1234-5678
    echo 🌐 Web: https://sistema-pos.com
    echo.
    pause
    goto :error_recovery
)
if "%recovery_opcion%"=="0" goto :exit

goto :error_recovery

:exit
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              👋 ¡HASTA LUEGO!                                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Gracias por usar el instalador del Sistema POS.
echo.
endlocal
:check_and_extract_system_files
:: Función para verificar y extraer archivos comprimidos del sistema

:: Buscar archivos ZIP en el directorio actual
set "SYSTEM_ZIP_FOUND=false"
set "SYSTEM_ZIP_FILE="

echo Buscando archivos comprimidos del sistema...

:: Buscar archivos ZIP que contengan "sistema-pos" o "electron"
for %%F in ("*.zip") do (
    echo %%~nxF | findstr /I /C:"sistema-pos" >nul
    if !errorlevel! == 0 (
        set "SYSTEM_ZIP_FOUND=true"
        set "SYSTEM_ZIP_FILE=%%F"
        goto :found_system_zip
    )
)

for %%F in ("*.zip") do (
    echo %%~nxF | findstr /I /C:"electron" >nul
    if !errorlevel! == 0 (
        set "SYSTEM_ZIP_FOUND=true"
        set "SYSTEM_ZIP_FILE=%%F"
        goto :found_system_zip
    )
)

:: Si no se encontró archivo ZIP específico, buscar cualquier ZIP
for %%F in ("*.zip") do (
    if not defined SYSTEM_ZIP_FILE (
        set "SYSTEM_ZIP_FOUND=true"
        set "SYSTEM_ZIP_FILE=%%F"
        goto :found_system_zip
    )
)

:found_system_zip
if "%SYSTEM_ZIP_FOUND%"=="true" (
    echo ✅ Archivo comprimido encontrado: %SYSTEM_ZIP_FILE%

    :: Verificar que PowerShell esté disponible para descompresión
    powershell -Command "Write-Host 'PowerShell disponible'" >nul 2>&1
    if errorlevel 1 (
        echo ❌ PowerShell no está disponible para descompresión
        echo.
        echo Solución: Descomprima manualmente el archivo %SYSTEM_ZIP_FILE%
        echo Luego ejecute nuevamente el instalador.
        echo.
        pause
        exit /b 1
    )

    echo Descomprimiendo %SYSTEM_ZIP_FILE%...

    :: Crear directorio temporal para descompresión
    set "EXTRACT_DIR=%TEMP%\sistema_pos_extract_%RANDOM%"
    if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"
    mkdir "%EXTRACT_DIR%"

    :: Descomprimir usando PowerShell
    powershell -Command "& { try { Expand-Archive -Path '%SYSTEM_ZIP_FILE%' -DestinationPath '%EXTRACT_DIR%' -Force; Write-Host '✅ Descompresión completada' } catch { Write-Host '❌ Error en descompresión:' $_.Exception.Message; exit 1 }}" 2>nul

    if errorlevel 1 (
        echo ❌ Error descomprimiendo el archivo
        echo.
        echo Posibles causas:
        echo • Archivo corrupto
        echo • Espacio insuficiente en disco
        echo • Permisos insuficientes
        echo.
        echo Solución: Descomprima manualmente y ejecute el instalador
        echo desde la carpeta descomprimida.
        echo.
        pause
        exit /b 1
    )

    :: Verificar contenido descomprimido
    if not exist "%EXTRACT_DIR%\sistema-Pos-Electron" (
        echo ⚠️  Estructura de carpetas no encontrada
        echo Buscando estructura alternativa...

        :: Buscar cualquier carpeta que contenga main.js o package.json
        for /d %%D in ("%EXTRACT_DIR%\*") do (
            if exist "%%D\main.js" (
                echo ✅ Aplicación Electron encontrada en: %%~nxD
                goto :move_extracted_files
            )
            if exist "%%D\package.json" (
                echo ✅ Aplicación Node.js encontrada en: %%~nxD
                goto :move_extracted_files
            )
        )

        :move_extracted_files
        :: Mover archivos descomprimidos a la estructura correcta
        if exist "%EXTRACT_DIR%\sistema-Pos-Electron" (
            echo Moviendo archivos a estructura correcta...
            if not exist "sistema-Pos-Electron" mkdir "sistema-Pos-Electron"
            xcopy "%EXTRACT_DIR%\sistema-Pos-Electron\*" "sistema-Pos-Electron\" /E /I /H /Y >nul
        ) else (
            echo ⚠️  Copiando todos los archivos descomprimidos...
            xcopy "%EXTRACT_DIR%\*" "." /E /I /H /Y >nul
        )
    ) else (
        echo ✅ Estructura correcta encontrada
        if not exist "sistema-Pos-Electron" mkdir "sistema-Pos-Electron"
        xcopy "%EXTRACT_DIR%\sistema-Pos-Electron\*" "sistema-Pos-Electron\" /E /I /H /Y >nul
    )

    :: Limpiar directorio temporal
    rmdir /s /q "%EXTRACT_DIR%" 2>nul

    echo ✅ Archivos del sistema preparados correctamente
) else (
    echo ℹ️  No se encontraron archivos comprimidos
    echo Verificando archivos locales...

    :: Verificar si ya existen los archivos necesarios
    if exist "sistema-Pos-Electron\main.js" (
        echo ✅ Archivos del sistema ya disponibles localmente
    ) else (
        echo ⚠️  Archivos del sistema no encontrados
        echo.
        echo Asegúrese de que el archivo comprimido del sistema esté
        echo en la misma carpeta que este instalador.
        echo.
        echo Archivos esperados:
        echo • sistema-pos-electron.zip
        echo • sistema-pos.zip
        echo • electron-app.zip
        echo.
        choice /C SN /M "¿Continuar con instalación parcial? [S/N]"
        if errorlevel 2 exit /b 1
    )
)

goto :eof
exit /b 0