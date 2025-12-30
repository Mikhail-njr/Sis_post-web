@echo off
echo ========================================
echo   INSTALADOR: EXTENSION VS CODE
echo   Sistema POS - Code Analysis
echo ========================================
echo.

echo Verificando si VS Code esta instalado...
code --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: VS Code no esta instalado o no esta en el PATH
    echo Descarga VS Code desde: https://code.visualstudio.com/
    pause
    exit /b 1
) else (
    echo ✅ VS Code detectado
)

echo.
echo Verificando estructura de la extension...
if not exist "code-analysis\vscode-extension\package.json" (
    echo ERROR: No se encuentra la extension de VS Code
    echo Ejecuta primero setup_qdrant.bat e integrate-code-analysis.bat
    pause
    exit /b 1
)

echo.
echo ✅ Estructura de extension verificada

echo.
echo Instalando dependencias de la extension...
cd code-analysis\vscode-extension
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo instalando dependencias de la extension
    cd ..\..
    pause
    exit /b 1
)
cd ..\..

echo.
echo ✅ Dependencias instaladas

echo.
echo Instalando extension en VS Code...
call code --install-extension code-analysis\vscode-extension
if %errorlevel% neq 0 (
    echo ERROR: Fallo instalando la extension
    echo Intentando metodo alternativo...
    call code --install-extension .\code-analysis\vscode-extension
    if %errorlevel% neq 0 (
        echo ERROR: No se pudo instalar la extension automaticamente
        echo Instala manualmente desde VS Code:
        echo   1. Abre VS Code
        echo   2. Ctrl+Shift+P
        echo   3. "Extensions: Install from VSIX"
        echo   4. Selecciona: code-analysis\vscode-extension\*.vsix
        pause
        exit /b 1
    )
)

echo.
echo ✅ Extension instalada correctamente

echo.
echo Verificando que el servidor de analisis este ejecutandose...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ El servidor de analisis no esta ejecutandose
    echo Para usar la extension completa:
    echo   1. Ejecuta: npm run start-analysis
    echo   2. Reinicia VS Code
    echo.
) else (
    echo ✅ Servidor de analisis detectado
)

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo La extension "Sistema POS - Code Analysis" ha sido instalada!
echo.
echo Comandos disponibles en VS Code:
echo.
echo 🔍 Analizar Archivo Actual:
echo   Ctrl+Shift+P -> "Code Analysis: Analyze Current File"
echo   Click derecho en editor -> "Analyze Current File"
echo.
echo 🔍 Buscar Codigo Similar:
echo   Selecciona codigo + Click derecho -> "Search Similar Code"
echo.
echo 💡 Mostrar Sugerencias:
echo   Ctrl+Shift+P -> "Code Analysis: Show Suggestions"
echo.
echo 📊 Indexar Workspace:
echo   Ctrl+Shift+P -> "Code Analysis: Index Workspace"
echo.
echo Configuracion:
echo   Archivo -> Preferencias -> Configuracion -> "Code Analysis"
echo.
echo 💡 Consejos de uso:
echo   • El indicador en la barra inferior muestra el estado del servidor
echo   • Los resultados aparecen en el panel "Code Analysis" de salida
echo   • El analisis automatico se puede habilitar en configuracion
echo   • Usa Ctrl+Shift+P para acceder rapidamente a todos los comandos
echo.
echo Presiona cualquier tecla para continuar...
pause >nul