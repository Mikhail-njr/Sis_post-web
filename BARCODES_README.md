# 🛒 Generador de Códigos de Barras - Sistema POS

## 📋 Descripción

Este generador crea códigos de barras visuales de productos de la base de datos para facilitar las pruebas del sistema de escaneo con celular.

## 📁 Archivos Generados

### 1. `barcode-generator.html`
- **Ubicación**: Raíz del proyecto
- **Descripción**: Página web interactiva con códigos de barras generados con JavaScript
- **Uso**: Abrir en navegador web para ver códigos escaneables

### 2. `generate-barcodes.js`
- **Ubicación**: Raíz del proyecto
- **Descripción**: Script Node.js que genera imágenes PNG de códigos de barras
- **Uso**: `node generate-barcodes.js`

### 3. Directorio `barcodes/`
- **Contenido**: 10 imágenes PNG de códigos de barras
- **Archivos generados**:
  - `agua_villavicencio_1_5l.png`
  - `coca_cola_2_25l.png`
  - `leche_la_seren_sima_1l.png`
  - `arroz_gallo_oro_1kg.png`
  - `fideos_matarazzo_500g.png`
  - `aceite_natura_1_5l.png`
  - `yerba_playadito_500g.png`
  - `galletitas_oreo_117g.png`
  - `carne_picada_x_kg.png`
  - `papa_negra_x_kg.png`

## 🚀 Cómo Usar

### Opción 1: Página Web Interactiva
1. Abre `barcode-generator.html` en tu navegador
2. Los códigos se generan automáticamente
3. Usa la app de escaneo de tu celular para leerlos
4. Los productos se agregarán al carrito del sistema POS

### Opción 2: Imágenes PNG
1. Ve al directorio `barcodes/`
2. Imprime las imágenes PNG o muéstralas en pantalla
3. Escanea con tu celular
4. Los productos se agregarán automáticamente al carrito

### Opción 3: Generar Más Códigos
```bash
# Instalar dependencia (si no está instalada)
npm install canvas

# Ejecutar generador
node generate-barcodes.js
```

## 📱 Productos Disponibles

| Producto | Código de Barras | Precio |
|----------|------------------|--------|
| Agua Villavicencio 1.5L | 7792900092980 | $1.200 |
| Coca Cola 2.25L | 7790895000997 | $2.600 |
| Leche La Serenísima 1L | 7790011163602 | $1.600 |
| Arroz Gallo Oro 1kg | 7790070318616 | $2.800 |
| Fideos Matarazzo 500g | 7790070336316 | $1.800 |
| Aceite Natura 1.5L | 7790272001005 | $2.900 |
| Yerba Playadito 500g | 7793704000911 | $3.200 |
| Galletitas Oreo 117g | 7622300724248 | $1.900 |
| Carne Picada x kg | 2000010000010 | $6.500 |
| Papa Negra x kg | 2000020000010 | $1.200 |

## 🔧 Requisitos del Sistema

- **Servidor POS ejecutándose** en el puerto 3000
- **Celular con app de escaneo** (cámara nativa o app específica)
- **Ambos dispositivos en la misma red** (para acceso local)

## 📊 Códigos de Barras Soportados

- **EAN-13**: Para productos comerciales reales
- **CODE128**: Para códigos genéricos internos (pesables)

## 🐛 Solución de Problemas

### El celular no puede acceder al servidor
- Verifica que ambos dispositivos estén en la misma red WiFi
- Usa `ipconfig` (Windows) para obtener la IP correcta
- Asegúrate de que el firewall permita conexiones al puerto 3000

### Los códigos no se escanean
- Verifica que la app de escaneo soporte EAN-13
- Asegúrate de que la imagen sea nítida
- Prueba con diferentes ángulos de escaneo

### Error al generar códigos
```bash
# Reinstalar dependencias
npm install canvas

# Ejecutar nuevamente
node generate-barcodes.js
```

## 🎯 Próximos Pasos

1. **Probar el escaneo** con diferentes productos
2. **Verificar integración** con el carrito de compras
3. **Ajustar configuración de cámara** si es necesario
4. **Generar más códigos** según necesites

---

**💡 Tip**: Para códigos personalizados, modifica el array `productos` en `generate-barcodes.js` y ejecuta el script nuevamente.