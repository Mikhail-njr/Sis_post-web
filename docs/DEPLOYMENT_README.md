# 🚀 Sistema POS - Despliegue Online

## Problema: URLs de ngrok cambian constantemente

El problema principal es que ngrok gratuito cambia la URL cada vez que reinicias el servidor. Aquí tienes varias soluciones:

## ✅ Solución 1: ngrok con Dominio Estático (Recomendado)

### Paso 1: Configuración automática (Recomendado)
```bash
ngrok_setup.bat
```
Este script hará todo automáticamente:
- ✅ Verifica si ngrok está instalado
- ✅ Te guía para obtener un Auth Token
- ✅ Configura ngrok automáticamente
- ✅ Crea el archivo `ngrok.yml`
- ✅ Prueba que todo funcione

### Paso 2: Configuración manual (si es necesario)
1. Ve a https://ngrok.com y crea una cuenta
2. Ve a tu dashboard y obtén tu Auth Token
3. Edita el archivo `ngrok.yml`:
```yaml
version: "2"
authtoken: TU_AUTH_TOKEN_AQUI
tunnels:
  pos-server:
    addr: 3000
    proto: http
    hostname: tu-dominio-personal.ngrok.io  # Opcional: dominio personalizado
    # subdomain: pos-sistema  # Opcional: subdominio fijo
```

### Paso 2: Ejecutar con configuración
```bash
run.bat
```
El sistema detectará automáticamente la configuración y usará URLs estables.

## ✅ Solución 2: ngrok con Subdominio Reservado

Si tienes una cuenta paga de ngrok, puedes reservar un subdominio:

```yaml
version: "2"
authtoken: TU_AUTH_TOKEN_AQUI
tunnels:
  pos-server:
    addr: 3000
    proto: http
    subdomain: mi-pos-sistema
```

Esto te dará una URL como: `https://mi-pos-sistema.ngrok.io`

## ✅ Solución 3: Alternativas Gratuitas a ngrok

### Opción A: LocalTunnel
```bash
npm install -g localtunnel
lt --port 3000
```

### Opción B: Serveo
```bash
ssh -R 80:localhost:3000 serveo.net
```

### Opción C: Cloudflare Tunnel
1. Instala cloudflared
2. Ejecuta: `cloudflared tunnel --url http://localhost:3000`

## ✅ Solución 4: Despliegue en la Nube (Más Estable)

### Railway (Recomendado para principiantes)
1. Ve a https://railway.app
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente tu app Node.js
4. Obtendrás una URL permanente como: `https://tu-proyecto.up.railway.app`

### Render
1. Ve a https://render.com
2. Crea un nuevo Web Service
3. Conecta tu repositorio
4. Obtendrás una URL permanente

### Heroku
1. Ve a https://heroku.com
2. Crea una nueva app
3. Despliega desde GitHub
4. URL permanente incluida

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

1. **Desarrollo Local Simple** (Sin ngrok):
   ```bash
   run_simple.bat
   ```
   - ✅ No hay problemas con ngrok
   - ✅ Solo funciona en localhost
   - ✅ Ideal para desarrollo

2. **Con ngrok (URLs públicas)**:
   ```bash
   run.bat
   ```
   - ✅ Acceso desde cualquier lugar
   - ⚠️  Puede tener problemas de configuración

3. **Para URLs estables**: Configura ngrok con dominio o usa servicios en la nube

### 🔧 Solución de Problemas:

#### Error "no se esperaba ... en este momento"
- Usa `run_simple.bat` en lugar de `run.bat`
- O configura ngrok correctamente siguiendo los pasos arriba

#### ngrok no funciona
- Verifica que ngrok esté instalado
- Configura tu auth token en `ngrok.yml`
- Usa `run_simple.bat` como alternativa

#### URLs siguen cambiando
- Configura un dominio personalizado en ngrok
- O usa servicios en la nube (Railway, Render, etc.)

##  Credenciales de Acceso

- **Usuario**: admin
- **Contraseña**: pos123

## 🌐 URLs del Sistema

- **Página principal**: `TU_DOMINIO/`
- **Panel de control**: `TU_DOMINIO/dashboard`
- **API**: `TU_DOMINIO/api/`

¡El sistema ahora funciona tanto local como online con URLs estables!