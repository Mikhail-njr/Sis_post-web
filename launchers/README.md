# Launchers - Sistema POS

Esta carpeta contiene los scripts de lanzamiento para el Sistema POS.

## Archivos Disponibles

### `setup.bat`
- Instala Node.js v22.19.0 si no está presente
- Instala dependencias npm del backend
- **Uso**: Ejecutar primero para configurar el entorno

### `run_simple.bat`
- Inicia solo el backend en localhost:3000
- Sin ngrok (solo local)
- **Uso**: Para desarrollo local sin exposición externa

### `run.bat`
- Inicia backend + ngrok tunnel
- Expone el sistema vía ngrok para acceso remoto
- **Uso**: Para demostraciones o acceso remoto

### `run_all.bat` ⭐ **RECOMENDADO**
- Inicia TODOS los servicios:
  - Backend (puerto 3000)
  - Code Analysis (puerto 3001)
  - Ngrok tunnel para exposición externa
- **Uso**: Para el funcionamiento completo del sistema

### `ngrok_setup.bat`
- Configura ngrok con authtoken
- **Uso**: Para configurar ngrok inicialmente

### `get_ngrok_url.bat` (obsoleto)
- **Nota**: Ya no se usa
- La URL de ngrok aparece directamente en la terminal del tunnel

## Orden de Ejecución Recomendado

1. `setup.bat` (solo la primera vez)
2. `ngrok_setup.bat` (para configurar ngrok)
3. `run_all.bat` (para iniciar todo - incluye ngrok automáticamente)

## Servicios Iniciados

- **Backend**: http://localhost:3000
- **Code Analysis**: http://localhost:3001
- **Ngrok**: URL fija (aparece en la terminal del tunnel)

## Credenciales de Admin

- Usuario: `admin`
- Contraseña: `pos123`

## Notas

- Los scripts abren ventanas separadas para cada servicio
- Para detener: Cerrar las ventanas correspondientes
- Asegúrate de que Node.js esté instalado antes de ejecutar