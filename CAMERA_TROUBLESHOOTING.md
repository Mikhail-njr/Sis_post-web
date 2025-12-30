# 🔍 Guía de Solución de Problemas - Cámara del Escáner

## Problema: "La cámara no da imagen"

Esta guía te ayudará a diagnosticar y solucionar problemas con la cámara del escáner de códigos de barras.

**Nota:** El sistema utiliza ZXing para el escaneo de códigos de barras, una biblioteca moderna y más confiable que reemplaza al anterior sistema QuaggaJS.

## 🚀 Diagnóstico Rápido

### 1. Verificar Compatibilidad Básica
Abre la página del escáner y ejecuta en la consola del navegador:
```javascript
diagnoseCamera()
```

### 2. Usar la Herramienta de Diagnóstico
Abre el archivo `camera_diagnostic.html` en tu navegador para una verificación completa.

## 🔧 Soluciones por Problema

### ❌ "NotAllowedError" - Permisos denegados
**Síntomas:** Mensaje "Permiso de cámara denegado"
**Soluciones:**
1. **Haz clic en "Permitir"** cuando aparezca el mensaje del navegador
2. **Configuración del navegador:**
   - Chrome: Clic en el candado → Cámara → Permitir
   - Firefox: Clic en el ícono de cámara en la barra de direcciones
   - Safari: Ajustes → Safari → Cámara → Permitir
3. **Recarga la página** e intenta nuevamente

### ❌ "NotFoundError" - Cámara no encontrada
**Síntomas:** "No se encontró cámara en el dispositivo"
**Soluciones:**
1. Verifica que tu dispositivo tenga cámara
2. Conecta una webcam externa si usas PC
3. Cierra otras aplicaciones que puedan estar usando la cámara
4. Reinicia el navegador

### ❌ "NotReadableError" - Cámara en uso
**Síntomas:** "La cámara está siendo usada por otra aplicación"
**Soluciones:**
1. **Cierra aplicaciones que usen cámara:**
   - Zoom, Meet, Teams
   - Skype, Discord
   - Aplicaciones de video
2. Espera unos segundos y reintenta
3. Reinicia el navegador si el problema persiste

### ❌ "OverconstrainedError" - Configuración incompatible
**Síntomas:** "Configuración de cámara no soportada"
**Soluciones:**
1. **Cambia la configuración de cámara:**
   - Ve al botón "⚙️ Configuración" en el escáner
   - Prueba diferentes presets (Estándar, Alta Resolución, etc.)
2. **Configuración por defecto:** "Close Focus" para códigos pequeños
3. **Móvil:** "Móvil Optimizado" para mejor rendimiento

### ❌ Video sin imagen (cámara activada pero negra)
**Síntomas:** La cámara se activa pero no muestra imagen
**Soluciones:**
1. **Espera más tiempo** - algunos dispositivos tardan en inicializar
2. **Toca la pantalla** (móviles) - algunos navegadores requieren interacción
3. **Verifica el lente** - asegúrate de que no esté sucio o tapado
4. **Cambia de navegador** - Chrome generalmente funciona mejor
5. **Configuración de video:**
   - Reduce la resolución (640x480)
   - Desactiva restricciones avanzadas (zoom, foco manual)

## 📱 Problemas Específicos de Dispositivos Móviles

### iOS (iPhone/iPad)
- **Safari requiere HTTPS** o localhost
- **Toca la pantalla** para activar la reproducción de video
- **Configuración recomendada:** "Móvil Optimizado"
- **Problema común:** Video se pausa automáticamente

### Android
- **Chrome funciona mejor** que el navegador nativo
- **Verifica permisos** en Configuración → Apps → [Navegador] → Permisos
- **Configuración recomendada:** "Small Barcodes" para códigos pequeños

## 🌐 Problemas de Navegador

### Chrome
- **Mejor compatibilidad** con WebRTC
- **Actualiza** a la versión más reciente
- **Modo incógnito** puede ayudar con problemas de caché

### Firefox
- **Puede ser más estricto** con permisos
- **Configuración:** about:config → media.navigator.permission.disabled → false
- **Alternativa:** Usa Chrome para mejor experiencia

### Safari (macOS/iOS)
- **Requiere interacción del usuario** para reproducción
- **HTTPS obligatorio** para localhost/ngrok
- **Problemas comunes:** Políticas de autoplay muy estrictas

## 🔄 Solución de Último Recurso

Si ninguna solución funciona:

1. **Usa el ingreso manual:**
   - En la página del escáner, busca la sección "🔢 Ingreso Manual"
   - Ingresa el código EAN-13 directamente
   - El sistema buscará el producto igual

2. **Diagnóstico avanzado:**
   ```javascript
   // En la consola del navegador
   navigator.mediaDevices.getUserMedia({video: true})
     .then(stream => console.log('✅ getUserMedia funciona'))
     .catch(error => console.log('❌ Error:', error.name, error.message));
   ```

## 🐛 Debug Avanzado

### Habilitar Debug Panel
1. En la página del escáner, haz clic en "🐛 Debug"
2. Observa los mensajes de debug para identificar el problema exacto

### Información Útil para Reportar
Cuando reportes un problema, incluye:
- **Navegador y versión**
- **Sistema operativo**
- **Tipo de dispositivo** (móvil/desktop)
- **Mensajes de error** exactos
- **Resultado del diagnóstico** (`diagnoseCamera()`)
- **Biblioteca utilizada**: ZXing (sistema actualizado)

## 📞 Soporte

Si el problema persiste:
1. Usa la **opción de ingreso manual** como alternativa
2. Reporta el problema con la información del diagnóstico
3. Prueba en diferentes dispositivos/navegadores

---

**Nota:** La mayoría de los problemas se resuelven siguiendo los pasos de diagnóstico en orden. El ingreso manual siempre está disponible como alternativa funcional.