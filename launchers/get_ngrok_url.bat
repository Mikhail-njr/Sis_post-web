@echo off
echo ========================================
echo    OBTENER URL DE NGROK
echo ========================================
echo.
echo Esperando a que ngrok se inicie...
timeout /t 5 /nobreak >nul

echo.
echo Buscando URL de ngrok...

:: Método simple y directo
for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels ^| findstr "public_url"') do (
    echo ✅ URL de ngrok encontrada:
    echo %%i
    echo.
    echo ========================================
    echo    INSTRUCCIONES PARA COMPARTIR
    echo ========================================
    echo.
    echo 1. Busca la parte que dice: "https://xxxx.ngrok-free.app"
    echo 2. Copia esa URL completa
    echo 3. Comparte el enlace
    echo.
    echo Credenciales de admin:
    echo Usuario: admin
    echo Contraseña: pos123
    echo.
    goto :end
)

echo ❌ No se pudo obtener la URL de ngrok
echo Asegúrate de que:
echo   1. Ngrok esté ejecutándose
echo   2. Espera 10 segundos después de iniciar ngrok
echo   3. Ejecuta este script nuevamente

:end
pause