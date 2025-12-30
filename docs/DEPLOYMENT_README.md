# 🚀 Sistema POS - Despliegue Online

## ✅ Solución Implementada: Ngrok (Servicio de Tunneling)

El sistema usa **ngrok** como servicio de tunneling para exponer el servidor local a internet. Requiere configuración inicial pero proporciona URLs fijas.

### Ventajas de ngrok:
- ✅ **URLs fijas** - La misma URL cada vez que se inicia
- ✅ **Dashboard web** - Para monitorear el tráfico
- ✅ **Autenticación** - Mayor seguridad
- ✅ **Soporte técnico** - Servicio profesional

### Cómo funciona:
1. El sistema ejecuta automáticamente: `ngrok http 3000 --config=ngrok.yml`
2. La URL aparece en la terminal del tunnel (ventana "Ngrok Tunnel")
3. Busca una línea como: `https://xxxxx.ngrok.io`
4. Comparte esa URL para acceso remoto

## 🔧 Configuración del Servidor para Producción

Para entornos de producción, modifica `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://tu-dominio.com'
  : 'http://localhost:3000';
```

## 📝 Instrucciones de Uso

### 🚀 Opciones de Ejecución:

1. **Desarrollo Local Simple** (Sin tunnel):
   ```bash
   run_simple.bat
   ```
   - ✅ Solo funciona en localhost
   - ✅ Ideal para desarrollo

2. **Con ngrok (Acceso remoto)**:
   ```bash
   run.bat
   ```
   - ✅ Acceso desde cualquier lugar
   - ✅ Requiere configuración inicial de ngrok

3. **Sistema completo** (Recomendado):
   ```bash
   run_all.bat
   ```
   - ✅ Backend + Code Analysis + Ngrok
   - ✅ Todo en una sola ejecución

### 🔧 Solución de Problemas:

#### Error de autenticación ngrok
- Asegúrate de tener configurado el authtoken en ngrok.yml
- Ejecuta `ngrok config add-authtoken TU_TOKEN` si es necesario

#### No aparece la URL
- Espera 5-10 segundos después de iniciar el tunnel
- Busca en la terminal del tunnel líneas que empiecen con `https://`
- La URL es fija basada en tu configuración

#### Error "ngrok no encontrado"
- Asegúrate de que ngrok esté instalado y en el PATH
- Ejecuta el instalador desde `instaladores/instalar_ngrok.bat`

## Credenciales de Acceso

- **Usuario**: admin
- **Contraseña**: pos123

## 🌐 URLs del Sistema

- **Página principal**: `TU_DOMINIO/`
- **Panel de control**: `TU_DOMINIO/dashboard`
- **API**: `TU_DOMINIO/api/`

## 🔄 Alternativas si ngrok no funciona

Si ngrok no está disponible o tienes problemas, considera:

### Localhost.run (gratuito, sin configuración)
1. Cambia el comando en run.bat a: `ssh -R 80:localhost:3000 localhost.run`
2. La URL aparecerá en la terminal del tunnel
3. URLs aleatorias pero sin configuración

### Railway (URLs permanentes)
1. Ve a https://railway.app
2. Conecta tu repositorio de GitHub
3. Obtendrás una URL permanente

### Render
1. Ve a https://render.com
2. Crea un nuevo Web Service
3. URL permanente incluida

¡El sistema funciona tanto local como online con ngrok!