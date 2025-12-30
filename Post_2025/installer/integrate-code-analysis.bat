@echo off
echo ========================================
echo   INTEGRACION: SISTEMA POS + ANALISIS DE CODIGO
echo ========================================
echo.

echo Verificando estructura del proyecto...
if not exist "backend\package.json" (
    echo ERROR: No se encuentra backend/package.json
    echo Asegurate de estar en el directorio raiz del proyecto
    pause
    exit /b 1
)

if not exist "code-analysis\package.json" (
    echo ERROR: No se encuentra code-analysis/package.json
    echo Ejecuta primero setup_qdrant.bat
    pause
    exit /b 1
)

echo.
echo ✅ Estructura del proyecto verificada
echo.

echo Instalando dependencias del analizador...
cd code-analysis
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo instalando dependencias del analizador
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Dependencias instaladas
echo.

echo Agregando scripts de analisis al backend...
call node -e "
const fs = require('fs');
const path = require('path');

// Leer package.json del backend
const backendPkgPath = path.join('backend', 'package.json');
const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8'));

// Agregar scripts de análisis
if (!backendPkg.scripts) backendPkg.scripts = {};
backendPkg.scripts['analyze'] = 'cd ../code-analysis && npm run analyze-file';
backendPkg.scripts['analyze-backend'] = 'cd ../code-analysis && node scripts/analyze-file.js backend/server.js javascript';
backendPkg.scripts['analyze-frontend'] = 'cd ../code-analysis && node scripts/analyze-file.js frontend/script.js javascript';
backendPkg.scripts['code-stats'] = 'cd ../code-analysis && curl -s http://localhost:3001/api/stats | jq .';
backendPkg.scripts['start-analysis'] = 'cd code-analysis && npm start';
backendPkg.scripts['index-project'] = 'cd code-analysis && npm run index-codebase ..';

// Agregar dependencias de desarrollo para integracion
if (!backendPkg.devDependencies) backendPkg.devDependencies = {};
backendPkg.devDependencies['concurrently'] = '^7.6.0';

// Escribir package.json actualizado
fs.writeFileSync(backendPkgPath, JSON.stringify(backendPkg, null, 2));
console.log('Scripts agregados al backend exitosamente');
"

echo.
echo ✅ Scripts agregados al backend
echo.

echo Creando interfaz de analisis en el frontend...
if not exist "frontend" mkdir frontend

echo ^<!DOCTYPE html^> > frontend/code-analysis.html
echo ^<html lang="es"^> >> frontend/code-analysis.html
echo ^<head^> >> frontend/code-analysis.html
echo     ^<meta charset="UTF-8"^> >> frontend/code-analysis.html
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^> >> frontend/code-analysis.html
echo     ^<title^>Análisis de Código - Sistema POS^</title^> >> frontend/code-analysis.html
echo     ^<link rel="stylesheet" href="style.css"^> >> frontend/code-analysis.html
echo ^</head^> >> frontend/code-analysis.html
echo ^<body^> >> frontend/code-analysis.html
echo     ^<div class="container"^> >> frontend/code-analysis.html
echo         ^<h1^>🔍 Análisis de Código^</h1^> >> frontend/code-analysis.html
echo         ^<div id="analysis-section"^> >> frontend/code-analysis.html
echo             ^<button onclick="analyzeCurrentFile()" class="btn btn-primary"^>Analizar Archivo Actual^</button^> >> frontend/code-analysis.html
echo             ^<button onclick="showStats()" class="btn btn-secondary"^>Ver Estadísticas^</button^> >> frontend/code-analysis.html
echo             ^<button onclick="searchSimilar()" class="btn btn-secondary"^>Buscar Similar^</button^> >> frontend/code-analysis.html
echo             ^<div id="results" class="results-container"^>^</div^> >> frontend/code-analysis.html
echo         ^</div^> >> frontend/code-analysis.html
echo     ^</div^> >> frontend/code-analysis.html
echo     ^<script src="code-analysis.js"^>^</script^> >> frontend/code-analysis.html
echo ^</body^> >> frontend/code-analysis.html
echo ^</html^> >> frontend/code-analysis.html

echo.
echo ✅ Interfaz de análisis creada
echo.

echo Creando launcher para análisis completo...
if not exist "launchers" mkdir launchers
echo @echo off > launchers/run-code-analysis.bat
echo echo Iniciando análisis completo del código... >> launchers/run-code-analysis.bat
echo cd .. >> launchers/run-code-analysis.bat
echo call npm run start-analysis >> launchers/run-code-analysis.bat
echo pause >> launchers/run-code-analysis.bat

echo.
echo ✅ Launcher creado
echo.

echo ========================================
echo   INTEGRACION COMPLETADA
echo ========================================
echo.
echo El sistema de análisis de código ha sido integrado exitosamente!
echo.
echo Comandos disponibles:
echo.
echo 📊 Análisis Rápido:
echo   npm run analyze-backend     - Analizar backend
echo   npm run analyze-frontend    - Analizar frontend
echo   npm run analyze archivo.js  - Analizar archivo específico
echo.
echo 🚀 Servicios:
echo   npm run start-analysis      - Iniciar servidor de análisis
echo   npm run index-project       - Indexar todo el proyecto
echo.
echo 📈 Estadísticas:
echo   npm run code-stats          - Ver estadísticas del sistema
echo.
echo 🌐 Interfaz Web:
echo   Abre frontend/code-analysis.html en tu navegador
echo.
echo 🔧 Próximos pasos:
echo   1. Ejecuta: setup_qdrant.bat
echo   2. Indexa el proyecto: npm run index-project
echo   3. Inicia análisis: npm run start-analysis
echo   4. Abre la interfaz web para explorar
echo.
echo Presiona cualquier tecla para continuar...
pause >nul