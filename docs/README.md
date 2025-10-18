# Sistema POS - Proyecto Portable

Este es un sistema de punto de venta (POS) desarrollado con Node.js en el backend y HTML/CSS/JavaScript en el frontend, utilizando SQLite como base de datos.

## Características
- Gestión de productos
- Registro de ventas
- Dashboard con estadísticas
- Base de datos SQLite (portable)
- Interfaz web responsive
- **Sistema de activación por licencia** (requiere clave de licencia válida)

## Requisitos Previos
- Node.js (versión 14 o superior) - Descárgalo desde [nodejs.org](https://nodejs.org/)

## Instalación y Configuración

### Opción 1: Usando Scripts Automáticos (Recomendado)
1. Copia toda la carpeta del proyecto a la PC destino
2. Ejecuta `setup.bat` (doble clic) - instalará Node.js automáticamente si no está presente, luego las dependencias
3. Ejecuta `run.bat` para iniciar el servidor
4. Abre tu navegador en `http://localhost:3000`

**Nota**: El script `setup.bat` puede instalar Node.js automáticamente usando winget (Windows 10/11) o Chocolatey si están disponibles. Si no, te guiará para la instalación manual.

### Opción 2: Instalación Manual

#### Paso 1: Instalar Node.js
1. Ve a [nodejs.org](https://nodejs.org/)
2. Descarga la versión LTS (recomendada)
3. Instala el ejecutable siguiendo las instrucciones

#### Paso 2: Copiar el Proyecto
1. Copia toda la carpeta del proyecto a la PC destino
2. Asegúrate de mantener la estructura de carpetas (backend/ y frontend/)

#### Paso 3: Instalar Dependencias
1. Abre el símbolo del sistema (cmd) o PowerShell
2. Navega a la carpeta `backend` del proyecto:
   ```
   cd ruta\a\tu\proyecto\sistema-pos\backend
   ```
3. Instala las dependencias:
   ```
   npm install
   ```

#### Paso 4: Ejecutar el Servidor
1. En la misma carpeta `backend`, ejecuta:
   ```
   npm start
   ```
2. Deberías ver un mensaje como:
   ```
   🚀 Servidor ejecutándose en http://localhost:3000
   ```

#### Paso 5: Acceder al Sistema
1. Abre tu navegador web
2. Ve a: `http://localhost:3000`
3. El sistema estará listo para usar

## Activación del Sistema
El sistema requiere una clave de licencia válida para funcionar. Al iniciar por primera vez, se mostrará una pantalla de activación donde debe ingresar su clave de licencia.

**Nota**: Sin una licencia válida, el sistema no permitirá el acceso a las funciones principales.

## Uso del Sistema
- **Página principal**: Gestión de productos y ventas
- **Dashboard**: Estadísticas y reportes (accede con `/dashboard`)

## Base de Datos
- El sistema utiliza SQLite, por lo que la base de datos es un archivo (`backend/pos_database.sqlite`)
- Los datos se mantienen al copiar el proyecto a otra PC
- Si no hay datos, se insertan automáticamente productos de ejemplo

## Solución de Problemas
- Si el puerto 3000 está ocupado, puedes cambiarlo en `backend/server.js`
- Asegúrate de que Node.js esté instalado correctamente ejecutando `node --version`
- Si hay errores de permisos, ejecuta el cmd como administrador

## Archivos Importantes
- `backend/server.js` - Servidor principal
- `backend/package.json` - Dependencias del proyecto
- `backend/pos_database.sqlite` - Base de datos
- `frontend/index.html` - Interfaz principal
- `frontend/dashboard.html` - Dashboard de estadísticas

## Desarrollo
Para desarrollo con recarga automática:
```
npm run dev
```
Requiere instalar `nodemon` globalmente o como devDependency.

## Portabilidad
Este proyecto es completamente portable:
- No requiere instalación de base de datos externa
- Todas las dependencias se instalan localmente con npm
- La base de datos viaja con el proyecto
- Solo requiere Node.js en la PC destino