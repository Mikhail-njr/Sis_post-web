# 🧪 Tests del Sistema POS

## 📋 Tests Disponibles

### ⭐ Test de Compras de Alta Carga (300/hora)
**Archivo**: `test_compras_3min.js`
**Descripción**: Simula 300 ventas por hora (5 por minuto) durante 1 hora
**Duración**: 1 hora completa
**Total**: 300 ventas

#### 🚀 Cómo Ejecutar:

**Opción 1 - Desde el directorio backend:**
```bash
cd backend
node test_compras_3min.js
```

**Opción 2 - Usando el batch incluido:**
```bash
# Desde cualquier lugar:
run_test_from_anywhere.bat

# O desde backend:
backend\run_test_3min.bat
```

#### 📊 Características Visuales:
- **Tabla en tiempo real** con todas las compras realizadas
- **Barra de progreso** con porcentaje █████████───────│ 65%
- **Tiempo restante** estimado
- **Estadísticas live**: tiempo promedio, tasa de éxito, etc.

#### 📋 Formato de Tabla:
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          TABLA DE COMPRAS REALIZADAS                       ║
╠═══════╦════════════════╦══════════════╦════════════╦══════════════════════╣
║ Compra║     Estado     ║ Tiempo (ms)  ║   Total    ║       Factura        ║
╠═══════╬════════════════╬══════════════╬════════════╬══════════════════════╣
║   1   ║ ✅ EXITOSA     ║        245   ║    $125.50 ║      FAC-123456789    ║
║   2   ║ ✅ EXITOSA     ║        198   ║     $89.30 ║      FAC-123456790    ║
║   3   ║ ❌ FALLIDA     ║        512   ║            ║                      ║
╚═══════╩════════════════╩══════════════╩════════════╩══════════════════════╝
```

### 🔥 Test de Rendimiento de Alta Carga
```bash
cd backend && node performance_test.js
```
- **300 ventas por hora** (5 por minuto)
- **Duración**: 1 hora
- **Para pruebas de estrés máximo**

### 🧪 Test Simple
```bash
cd backend && node simple_test.js
```
- **10 ventas rápidas** + operaciones básicas
- **Duración**: 2-3 minutos

### 🔧 Test Comprensivo
```bash
cd backend && node test_comprehensive.js
```
- **Test completo** de todas las funcionalidades
- **Duración**: 5-10 minutos

### 🐛 Debug Individual
```bash
cd backend && node debug_sale.js
```
- **Una sola venta** para debugging

## ⚠️ Requisitos Previos

1. **Servidor corriendo**:
```bash
cd backend && npm start
```

2. **Productos con stock** en la base de datos

3. **Credenciales admin** configuradas (admin:pos123)

## 📁 Archivos Generados

Cada test genera archivos de resultados:

- **`test_compras_3min_log.txt`** - Log detallado del test
- **`test_compras_3min_results.json`** - Resultados completos en JSON
- **`performance_test_log.txt`** - Log del test de rendimiento
- **`performance_test_results.json`** - Resultados de rendimiento
- **`test_log.txt`** - Log del test simple
- **`comprehensive_test_report.json`** - Reporte completo

## 🎯 Comparación de Tests

| Test | Ventas/Hora | Duración | Mejor Para |
|------|-------------|----------|------------|
| **Compras Alta Carga** | 300 | 1 hora | Pruebas de carga máxima con tabla visual |
| **Performance** | 300 | 1 hora | Pruebas de carga máxima tradicionales |
| **Simple** | 10 | 2-3 min | Verificación básica |
| **Comprehensive** | Variable | 5-10 min | Test completo del sistema |
| **Debug** | 1 | Instantáneo | Debugging específico |

## 🚨 Notas Importantes

- **Ctrl+C** para interrumpir cualquier test
- Los tests usan **autenticación automática**
- Se generan logs automáticamente
- La **base de datos se modifica** con ventas reales
- **No ejecutar** tests en producción sin backup

## 🔧 Troubleshooting

**Error "Cannot find module"**: Ejecutar desde el directorio `backend/`
```bash
cd F:\WEB\sistemapos_final\backend
node test_compras_3min.js
```

**Servidor no responde**: Asegurarse de que esté corriendo en `http://localhost:3000`

**Sin productos**: Verificar que hay productos con stock > 0