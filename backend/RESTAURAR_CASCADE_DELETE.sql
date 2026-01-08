-- ========================================
-- SCRIPT DE RESTAURACIÓN: Eliminar CASCADE DELETE
-- 
-- 🎯 OBJETIVO: Revertir los cambios de CASCADE DELETE si es necesario
-- ⚠️  ADVERTENCIA: Esto eliminará las relaciones FOREIGN KEY
-- 📝  REQUISITO: Tener un backup de la base de datos antes de ejecutar
-- ========================================

-- ========================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ========================================
SELECT '🔍 VERIFICANDO ESTADO ACTUAL ANTES DE RESTAURAR' as paso;

-- Mostrar relaciones FOREIGN KEY actuales
SELECT 'Relaciones FOREIGN KEY actuales:' as relaciones;
PRAGMA foreign_key_list(ventas);
PRAGMA foreign_key_list(deudas);
PRAGMA foreign_key_list(deuda_productos);
PRAGMA foreign_key_list(pagos_deudas);

-- Contar registros actuales
SELECT 'Conteo actual de registros:' as conteo;
SELECT 'Clientes:', COUNT(*) FROM clientes;
SELECT 'Ventas:', COUNT(*) FROM ventas;
SELECT 'Deudas:', COUNT(*) FROM deudas;
SELECT 'Productos de deudas:', COUNT(*) FROM deuda_productos;
SELECT 'Pagos de deudas:', COUNT(*) FROM pagos_deudas;

-- ========================================
-- PASO 2: ELIMINAR RELACIONES FOREIGN KEY
-- ========================================
SELECT '🔧 ELIMINANDO RELACIONES FOREIGN KEY' as paso;

-- 1. Eliminar relación: ventas -> clientes
-- ⚠️ CUIDADO: Esto permitirá datos huérfanos nuevamente
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS fk_venta_cliente;

-- 2. Eliminar relación: deudas -> clientes  
ALTER TABLE deudas DROP CONSTRAINT IF EXISTS fk_deuda_cliente;

-- 3. Eliminar relación: deuda_productos -> deudas
ALTER TABLE deuda_productos DROP CONSTRAINT IF EXISTS fk_deuda_productos_deuda;

-- 4. Eliminar relación: deuda_productos -> productos
ALTER TABLE deuda_productos DROP CONSTRAINT IF EXISTS fk_deuda_productos_producto;

-- 5. Eliminar relación: pagos_deudas -> deudas
ALTER TABLE pagos_deudas DROP CONSTRAINT IF EXISTS fk_pago_deuda;

-- ========================================
-- PASO 3: ELIMINAR ÍNDICES (OPCIONAL)
-- ========================================
SELECT '🗑️ ELIMINANDO ÍNDICES (OPCIONAL)' as paso;

-- Eliminar índices creados para las relaciones
DROP INDEX IF EXISTS idx_ventas_cliente_id;
DROP INDEX IF EXISTS idx_pagos_deudas_deuda_id;

-- ========================================
-- PASO 4: ELIMINAR TABLA DE PAGOS_DEUDAS (OPCIONAL)
-- ========================================
SELECT '🗑️ ELIMINANDO TABLA PAGOS_DEUDAS (OPCIONAL)' as paso;

-- ⚠️ CUIDADO: Esto eliminará todos los pagos de deudas registrados
-- Solo ejecuta esto si estás seguro de que no necesitas estos datos
-- DROP TABLE IF EXISTS pagos_deudas;

-- ========================================
-- PASO 5: VERIFICAR RESTAURACIÓN COMPLETADA
-- ========================================
SELECT '✅ VERIFICANDO RESTAURACIÓN COMPLETADA' as paso;

-- Verificar que las relaciones fueron eliminadas
SELECT 'Relaciones FOREIGN KEY después de la restauración:' as verificacion;
PRAGMA foreign_key_list(ventas);
PRAGMA foreign_key_list(deudas);
PRAGMA foreign_key_list(deuda_productos);
PRAGMA foreign_key_list(pagos_deudas);

-- Conteo final de registros
SELECT 'Conteo final de registros:' as conteo_final;
SELECT 'Clientes:', COUNT(*) FROM clientes;
SELECT 'Ventas:', COUNT(*) FROM ventas;
SELECT 'Deudas:', COUNT(*) FROM deudas;
SELECT 'Productos de deudas:', COUNT(*) FROM deuda_productos;
SELECT 'Pagos de deudas:', COUNT(*) FROM pagos_deudas;

-- ========================================
-- PASO 6: ADVERTENCIAS Y RECOMENDACIONES
-- ========================================
SELECT '⚠️ ADVERTENCIAS IMPORTANTES:' as advertencias;

SELECT '🚨 ADVERTENCIA: Después de esta restauración:' as alerta1;
SELECT '   - Las relaciones CASCADE DELETE han sido eliminadas' as consecuencia1;
SELECT '   - Las eliminaciones de clientes NO eliminarán datos relacionados' as consecuencia2;
SELECT '   - Podrían generarse datos huérfanos nuevamente' as consecuencia3;
SELECT '   - El problema original de "cuentas sin vincular" podría volver' as consecuencia4;

SELECT '💡 RECOMENDACIONES:' as recomendaciones;
SELECT '   - Considera si realmente necesitas eliminar las relaciones' as rec1;
SELECT '   - Si el problema persiste, investiga la causa raíz' as rec2;
SELECT '   - Mantén un buen sistema de validación en el frontend' as rec3;
SELECT '   - Considera implementar scripts de limpieza periódica' as rec4;

-- ========================================
-- PASO 7: INSTRUCCIONES PARA RE-IMPLEMENTAR (SI ES NECESARIO)
-- ========================================
SELECT '📝 INSTRUCCIONES PARA RE-IMPLEMENTAR CASCADE DELETE:' as reimplantacion;

SELECT 'Si necesitas volver a implementar CASCADE DELETE:' as paso_reimplantacion;
SELECT '   1. Ejecuta el script: IMPLEMENTACION_DIRECTA_CASCADE.sql' as instruccion1;
SELECT '   2. O usa el script de implementación: ejecutar_cascade_fix.sh' as instruccion2;
SELECT '   3. Asegúrate de tener un backup antes de ejecutar' as instruccion3;

-- ========================================
-- RESUMEN FINAL
-- ========================================
SELECT '🎯 RESUMEN DE RESTAURACIÓN:' as resumen;
SELECT '✅ Relaciones FOREIGN KEY eliminadas exitosamente' as resultado1;
SELECT '✅ Índices eliminados (si se deseó)' as resultado2;
SELECT '✅ Sistema restaurado a estado original' as resultado3;
SELECT '⚠️ Advertencia: El problema de datos huérfanos podría volver' as advertencia_final;

SELECT '🔒 RESTAURACIÓN COMPLETA' as exito;
SELECT '💡 Si tienes dudas, consulta el script de implementación original' as ayuda;