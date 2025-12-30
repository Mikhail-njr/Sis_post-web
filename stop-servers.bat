@echo off
echo Deteniendo servidores SQL...

echo.
echo Deteniendo proceso Node.js...
taskkill /IM node.exe /F

echo.
echo Intentando detener MySQL...
net stop "MySQL80" 2>nul || (
    echo No se pudo detener MySQL80, intentando con otro nombre...
    net stop "MySQL" 2>nul || (
        echo No se pudo detener MySQL, intentando con taskkill...
        taskkill /IM mysqld.exe /F 2>nul || (
            echo MySQL necesita permisos de administrador para detenerse
        )
    )
)

echo.
echo Intentando detener PostgreSQL...
net stop "postgresql-x64-15" 2>nul || (
    echo No se pudo detener PostgreSQL, intentando con otro nombre...
    net stop "postgresql-x64-14" 2>nul || (
        echo No se pudo detener PostgreSQL, intentando con taskkill...
        taskkill /IM postgres.exe /F 2>nul || (
            echo PostgreSQL necesita permisos de administrador para detenerse
        )
    )
)

echo.
echo Verificando procesos restantes...
tasklist | findstr /i "mysql postgres node"

echo.
echo Operacion completada.
pause