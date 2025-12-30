# Escáner USB Symbol - Guía de Integración

## Descripción

El sistema POS ahora incluye soporte completo para escáneres USB Symbol Bar Code Scanner. El escáner actúa como un dispositivo HID (teclado) que envía códigos de barras como entrada de teclado, permitiendo una integración fluida con la interfaz web.

## Cómo Funciona

### Detección Automática
- Se crea un campo de entrada invisible que mantiene el foco constantemente
- Detecta entrada rápida de números seguida de Enter (característica típica de escáneres)
- Diferencia entre entrada manual del usuario y entrada automática del escáner

### Procesamiento
1. El escáner envía el código como secuencia rápida de teclas numéricas
2. Finaliza con un carácter Enter
3. El sistema detecta esta secuencia y la procesa automáticamente
4. Busca el producto en la base de datos
5. Lo agrega directamente al carrito de compras

## Configuración del Escáner

### Configuración Recomendada para Symbol
1. **Sufijo**: Enter (CR/LF)
2. **Prefijo**: Ninguno
3. **Velocidad de transmisión**: Automática (predeterminada)
4. **Modo**: Teclado HID

### Configuración Avanzada
- Accede al modo de configuración del escáner (generalmente con códigos especiales)
- Configura el sufijo como "Enter"
- Asegúrate de que no tenga prefijos que puedan interferir

## Uso en el Sistema

### Indicador Visual
En el header de la aplicación verás:
- 🔗 Escáner USB: Listo (estado normal)
- 🔗 Escáner USB: Producto agregado (temporal cuando funciona)
- ❌ Escáner USB: Error (cuando hay problemas)

### Funcionamiento
1. El escáner está siempre activo
2. Al escanear un código, se reproduce un beep distintivo (La agudo)
3. Se muestra una notificación: "🔌 USB: Código detectado: [código]"
4. El producto se busca automáticamente y se agrega al carrito
5. Se muestra confirmación: "✅ [Producto] agregado al carrito (USB)"

## Compatibilidad

### Métodos de Escaneo Disponibles
- **Escáner USB**: Detección automática, siempre activo
- **Escáner Móvil**: WebSocket desde dispositivos móviles
- **Entrada Manual**: Campo de texto para códigos manuales

### Diferenciación de Fuentes
Cada método tiene indicadores visuales y auditivos distintivos:
- USB: Beep agudo (880Hz), notificación con "🔌 USB"
- Móvil: Beep normal, notificación con "📱"
- Manual: Sin beep automático, confirmación estándar

## Solución de Problemas

### El escáner no responde
1. Verifica que esté conectado correctamente
2. Asegúrate de que el sufijo esté configurado como Enter
3. Prueba escaneando en un editor de texto para verificar funcionamiento básico

### Códigos no se detectan
1. Verifica que el código sea EAN-8 o EAN-13 válido
2. Asegúrate de que no haya interferencia con otros dispositivos USB
3. Revisa la configuración del escáner (sin prefijos)

### Problemas de foco
- El sistema mantiene automáticamente el foco en el campo de detección
- Si hay problemas, haz clic fuera de campos de entrada para restablecer

## Código Técnico

### Variables Globales
```javascript
let usbScannerBuffer = '';        // Buffer para acumular entrada
let lastKeyTime = 0;             // Timestamp del último caracter
let usbScannerTimeout = null;    // Timeout para procesar entrada
const USB_SCANNER_TIMEOUT = 100; // ms entre caracteres para detectar entrada automática
```

### Funciones Principales
- `initUSBScannerDetection()`: Inicializa la detección
- `processUSBScannerCode(code)`: Procesa códigos detectados
- `updateUSBScannerStatus(status, type)`: Actualiza indicador visual

### Eventos
- Campo invisible captura toda entrada del escáner
- Detección basada en velocidad de entrada (>500ms pausa = entrada manual)
- Timeout automático para procesar códigos incompletos

## Consideraciones de Seguridad

- Los códigos se validan antes de procesarse
- Solo se aceptan códigos EAN-8 y EAN-13 válidos
- El sistema maneja errores gracefully sin comprometer la funcionalidad

## Testing

Para probar la funcionalidad:
1. Conecta el escáner USB
2. Abre la aplicación POS
3. Verifica que el indicador muestre "Listo"
4. Escanea un código de barras conocido
5. Confirma que se agregue al carrito automáticamente

## Soporte

Si tienes problemas con la configuración del escáner USB Symbol, consulta:
- Manual del escáner Symbol
- Configuraciones específicas del modelo
- Logs de la consola del navegador para debugging