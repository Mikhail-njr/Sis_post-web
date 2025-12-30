@echo off
echo ========================================
echo   ESTADO ACTUAL DEL SISTEMA
echo ========================================
echo.

echo [1/5] Verificando Docker y Qdrant...
docker ps --filter name=qdrant-pos --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo [2/5] Verificando procesos Node.js...
tasklist /fi "imagename eq node.exe" /fo table /nh
echo.

echo [3/5] Verificando conectividad...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:6333/health' -TimeoutSec 5; Write-Host '✅ Qdrant responde en puerto 6333' } catch { Write-Host '❌ Qdrant no responde' }"
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/diagnostic' -TimeoutSec 5; Write-Host '✅ API backend responde' } catch { Write-Host '❌ API backend no responde' }"
echo.

echo [4/5] Verificando archivos de indexacion...
if exist "simple-index.js" (echo ✅ Script de indexacion encontrado) else (echo ❌ Script de indexacion no encontrado)
if exist "simple-init.js" (echo ✅ Script de inicializacion encontrado) else (echo ❌ Script de inicializacion no encontrado)
echo.

echo [5/5] Estado de recursos del sistema...
echo CPU y Memoria actuales:
powershell -Command "Get-Process | Where-Object { $_.ProcessName -like '*node*' -or $_.ProcessName -like '*docker*' } | Select-Object ProcessName, CPU, @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet/1MB,1)}} | Format-Table -AutoSize"
echo.

echo ========================================
echo   RESUMEN
echo ========================================
echo.
echo Si ves procesos de Node.js ejecutandose, la indexacion esta activa.
echo Busca la ventana titulada "MAX POWER Node.js" para ver el progreso detallado.
echo.
echo Para ver progreso completo: monitor-indexacion.bat
echo.
pause