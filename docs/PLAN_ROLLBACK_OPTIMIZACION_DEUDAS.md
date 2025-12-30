# 🔄 Plan de Rollback - Optimización Endpoint Deudas

## 📋 Información General
- **Fecha de implementación**: 2025-12-17
- **Versión implementada**: v1.0
- **Desarrollador**: Kilo Code
- **Endpoint afectado**: `POST /api/debts/update-prices`

## 🚨 Escenario de Emergencia
Si hay problemas críticos con la nueva implementación que afecten la funcionalidad del sistema o el rendimiento en producción.

### Criterios para Rollback
- Tiempo de respuesta > 500ms consistentemente
- Errores en actualización de deudas
- Pérdida de datos o inconsistencias
- Quejas de usuarios sobre lentitud
- Errores 500 en el endpoint

## 📝 Pasos de Rollback

### 🛑 Paso 1: Detener Servicios
```bash
# Detener el servidor backend
# En Windows: Ctrl+C en la terminal del servidor
# O usar el script: stop-servers.bat
```

### 🔄 Paso 2: Restaurar Código Original
```bash
# Copiar el backup al archivo original
copy "backend\server.js.backup-optimizacion-cuenta-corriente" "backend\server.js"
```

**Verificación**:
- Confirmar que el archivo `backend/server.js` tiene el código original
- Buscar la línea del endpoint antiguo (líneas ~2063-2216)

### 🚀 Paso 3: Reiniciar Servicios
```bash
# Reiniciar el servidor backend
cd backend
node server.js
# O usar: npm start (si configurado)
```

**Verificación**:
- Servidor inicia sin errores
- Logs muestran "Server running on port 3000"
- Endpoint responde a requests básicos

### 🧪 Paso 4: Verificar Funcionalidad
```bash
# Ejecutar script de verificación
node test_debt_performance.js
```

**Criterios de éxito**:
- Endpoint responde correctamente
- No hay errores 500
- Funcionalidad de deudas intacta
- Tiempo de respuesta aceptable (< 500ms)

### 📊 Paso 5: Monitoreo Post-Rollback
- Monitorear logs durante 24 horas
- Verificar que no hay errores relacionados con deudas
- Confirmar que los usuarios pueden actualizar precios normalmente

## ⏱️ Tiempo Estimado
- **Rollback completo**: 10-15 minutos
- **Verificación**: 15-30 minutos
- **Monitoreo**: 24 horas

## 📁 Archivos de Backup
- `backend/server.js.backup-optimizacion-cuenta-corriente` - Código original completo
- `debt_performance_test_results.json` - Resultados de pruebas antes de optimización
- `optimizacion_cuenta_corriente.md` - Documentación completa del cambio

## 📞 Contactos de Emergencia
- **Desarrollador principal**: Kilo Code
- **Fecha de rollback**: [Fecha actual]
- **Motivo del rollback**: [Describir el problema]

## ✅ Checklist de Rollback
- [ ] Servicios detenidos
- [ ] Código original restaurado
- [ ] Servicios reiniciados
- [ ] Funcionalidad verificada
- [ ] Monitoreo iniciado
- [ ] Equipo notificado

## 🔍 Verificación Final
Después del rollback, ejecutar:
```bash
# Verificar endpoint básico
curl -X POST http://localhost:3000/api/debts/update-prices \
  -H "Authorization: Basic YWRtaW46YWRtaW4=" \
  -H "Content-Type: application/json"
```

**Respuesta esperada**: JSON con success: true y datos de deudas actualizadas.

---

*Este plan garantiza una recuperación rápida y segura en caso de problemas con la optimización.*