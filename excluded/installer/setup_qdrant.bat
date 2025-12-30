@echo off
echo ========================================
echo   INSTALADOR DE DOCKER Y QDRANT
echo   Sistema de Analisis de Codigo POS
echo ========================================
echo.

echo Verificando si Docker esta instalado...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker no esta instalado. Instalando Docker...
    echo.

    echo Descargando Docker Desktop...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' -OutFile 'DockerDesktopInstaller.exe'}"

    echo Instalando Docker Desktop...
    start /wait DockerDesktopInstaller.exe install --quiet

    echo Esperando a que Docker se instale completamente...
    timeout /t 10 /nobreak >nul

    echo Eliminando instalador...
    del DockerDesktopInstaller.exe

    echo.
    echo Docker instalado. Reinicia tu computadora y ejecuta este script nuevamente.
    echo Presiona cualquier tecla para salir...
    pause >nul
    exit /b 1
) else (
    echo Docker ya esta instalado.
)

echo.
echo Iniciando servicios de Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Esperando a que Docker inicie...
    timeout /t 30 /nobreak >nul
)

echo.
echo Descargando imagen de Qdrant...
docker pull qdrant/qdrant

echo.
echo Deteniendo contenedores Qdrant existentes...
docker stop qdrant-pos >nul 2>&1
docker rm qdrant-pos >nul 2>&1

echo.
echo Iniciando Qdrant para analisis de codigo...
docker run -d ^
    --name qdrant-pos ^
    -p 6333:6333 ^
    -p 6334:6334 ^
    -v qdrant_storage:/qdrant/storage ^
    qdrant/qdrant

echo.
echo Esperando a que Qdrant inicie...
timeout /t 10 /nobreak >nul

echo.
echo Verificando que Qdrant este funcionando...
curl -s http://localhost:6333/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Qdrant no responde. Verifica que Docker este ejecutandose.
    echo Presiona cualquier tecla para salir...
    pause >nul
    exit /b 1
) else (
    echo SUCCESS: Qdrant esta funcionando correctamente!
)

echo.
echo Creando directorio para scripts de analisis...
if not exist "code-analysis" mkdir code-analysis

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo Qdrant esta ejecutandose en:
echo - API REST: http://localhost:6333
echo - Dashboard: http://localhost:6333/dashboard
echo.
echo Para detener Qdrant: docker stop qdrant-pos
echo Para iniciar Qdrant: docker start qdrant-pos
echo.
echo Presiona cualquier tecla para continuar...
pause >nul