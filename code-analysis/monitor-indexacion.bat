@echo off
echo ========================================
echo   MONITOR DE INDEXACION - SISTEMA POS
echo ========================================
echo.
echo Este script monitorea el progreso de la indexacion
echo en tiempo real.
echo.

:menu
echo Selecciona una opcion:
echo [1] Ver estado de Docker/Qdrant
echo [2] Ver logs de Node.js (indexacion)
echo [3] Ver uso de recursos del sistema
echo [4] Ver estado de la base de datos Qdrant
echo [5] Ejecutar diagnostico completo
echo [6] Salir
echo.
set /p choice="Opcion: "

if "%choice%"=="1" goto docker_status
if "%choice%"=="2" goto node_logs
if "%choice%"=="3" goto system_resources
if "%choice%"=="4" goto qdrant_status
if "%choice%"=="5" goto full_diagnostic
if "%choice%"=="6" goto exit

echo Opcion invalida. Presiona cualquier tecla para continuar...
pause >nul
goto menu

:docker_status
echo.
echo === ESTADO DE DOCKER ===
docker ps -a --filter name=qdrant
echo.
echo === LOGS RECIENTES DE QDRANT ===
docker logs --tail 10 qdrant-pos 2>nul || echo Qdrant no esta ejecutandose
echo.
pause
goto menu

:node_logs
echo.
echo === PROCESOS DE NODE.JS ===
tasklist /fi "imagename eq node.exe" /fo table
echo.
echo === VENTANAS DE CMD ABIERTAS ===
tasklist /fi "imagename eq cmd.exe" /fo table | findstr /c:"cmd.exe"
echo.
echo Si ves procesos de Node.js, la indexacion esta ejecutandose.
echo Busca la ventana titulada "MAX POWER Node.js" para ver el progreso.
echo.
pause
goto menu

:system_resources
echo.
echo === USO DE RECURSOS ===
echo CPU y Memoria:
powershell "Get-Process | Where-Object { $_.ProcessName -like '*node*' -or $_.ProcessName -like '*docker*' -or $_.ProcessName -like '*qdrant*' } | Select-Object ProcessName, CPU, WorkingSet | Format-Table -AutoSize"
echo.
echo === ESPACIO EN DISCO ===
powershell "Get-WmiObject Win32_LogicalDisk | Select-Object Size,FreeSpace | ForEach-Object { [PSCustomObject]@{ TotalGB = [math]::Round($_.Size/1GB, 2); FreeGB = [math]::Round($_.FreeSpace/1GB, 2); UsedPercent = [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 2) } }"
echo.
pause
goto menu

:qdrant_status
echo.
echo === ESTADO DE QDRANT ===
curl -s http://localhost:6333/health || echo ERROR: Qdrant no responde en localhost:6333
echo.
echo === COLECCIONES EN QDRANT ===
curl -s http://localhost:6333/collections | powershell "try { $data = ConvertFrom-Json; $data.result.collections | ForEach-Object { Write-Host 'Coleccion:' $_.name '- Puntos:' $_.points_count } } catch { Write-Host 'No se pudieron obtener colecciones' }"
echo.
pause
goto menu

:full_diagnostic
echo.
echo === DIAGNOSTICO COMPLETO ===
echo.

echo [1/5] Verificando Docker...
docker --version >nul 2>&1 && echo ✅ Docker instalado || echo ❌ Docker no encontrado
docker ps -q --filter name=qdrant >nul 2>&1 && echo ✅ Qdrant ejecutandose || echo ❌ Qdrant no ejecutandose

echo.
echo [2/5] Verificando Node.js...
node --version >nul 2>&1 && echo ✅ Node.js instalado || echo ❌ Node.js no encontrado
tasklist /fi "imagename eq node.exe" /nh >nul 2>&1 && echo ✅ Procesos Node.js activos || echo ❌ No hay procesos Node.js

echo.
echo [3/5] Verificando conectividad...
curl -s --max-time 5 http://localhost:6333/health >nul && echo ✅ Qdrant responde en puerto 6333 || echo ❌ Qdrant no responde
curl -s --max-time 5 http://localhost:3000/api/diagnostic >nul && echo ✅ API del backend responde || echo ❌ API del backend no responde

echo.
echo [4/5] Verificando archivos de indexacion...
if exist "simple-index.js" echo ✅ Script de indexacion encontrado || echo ❌ Script de indexacion no encontrado
if exist "simple-init.js" echo ✅ Script de inicializacion encontrado || echo ❌ Script de inicializacion no encontrado

echo.
echo [5/5] Verificando configuracion...
powershell "if (Test-Path '.vscode/settings.json') { Write-Host '✅ Archivo de configuracion VS Code encontrado' } else { Write-Host '⚠️  No hay configuracion personalizada de VS Code' }"

echo.
echo === RECOMENDACIONES ===
echo.
echo Si la indexacion no esta funcionando:
echo 1. Asegúrate de que Docker Desktop esté abierto
echo 2. Ejecuta maximum-power.bat como Administrador
echo 3. Espera al menos 30 segundos despues de iniciar
echo 4. Verifica que no haya firewalls bloqueando puertos 6333/6334
echo 5. Revisa los logs de error en las ventanas de comando
echo.
pause
goto menu

:exit
echo.
echo Monitor cerrado. ¡Hasta luego!
timeout /t 2 >nul
exit /b 0