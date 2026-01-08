-- ========================================
-- SCRIPT DE VERIFICACIÓN: Datos inconsistentes
--
-- 🎯 OBJETIVO: Identificar datos que impiden la creación de relaciones FOREIGN KEY
-- ========================================

-- ========================================
-- PASO 1: HABILITAR FOREIGN KEYS
-- ========================================
PRAGMA foreign_keys = ON;

-- ========================================
-- PASO 2: VERIFICAR DATOS INCONSISTENTES
-- ========================================
SELECT '🔍 VERIFICANDO DATOS INCONSISTENTES:' as paso;

-- Verificar ventas en cuenta corriente sin cliente válido
SELECT 'Ventas en cuenta corriente sin cliente válido:' as descripcion;
SELECT id, cliente_id, metodo_pago, total, fecha_hora
FROM ventas
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0);

-- Verificar deudas sin cliente válido
SELECT 'Deudas sin cliente válido:' as descripcion;
SELECT id, cliente_id, monto_total, fecha_creacion
FROM deudas
WHERE cliente_id IS NULL OR cliente_id = 0;

-- Verificar productos de deudas sin deuda válida
SELECT 'Productos de deudas sin deuda válida:' as descripcion;
SELECT dp.id, dp.deuda_id, dp.producto_id, dp.cantidad, dp.precio_unitario
FROM deuda_productos dp
WHERE dp.deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL);

-- Verificar productos de deudas sin producto válido
SELECT 'Productos de deudas sin producto válido:' as descripcion;
SELECT dp.id, dp.deuda_id, dp.producto_id, dp.cantidad, dp.precio_unitario
FROM deuda_productos dp
WHERE dp.producto_id NOT IN (SELECT id FROM productos WHERE id IS NOT NULL);

-- Verificar pagos de deudas sin deuda válida
SELECT 'Pagos de deudas sin deuda válida:' as descripcion;
SELECT pd.id, pd.deuda_id, pd.monto_pagado, pd.fecha_pago
FROM pagos_deudas pd
WHERE pd.deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL);

-- ========================================
-- PASO 3: CONTAR DATOS INCONSISTENTES
-- ========================================
SELECT '📊 RESUMEN DE DATOS INCONSISTENTES:' as resumen;

SELECT 'Ventas en cuenta corriente sin cliente:', COUNT(*)
FROM ventas
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0);

SELECT 'Deudas sin cliente:', COUNT(*)
FROM deudas
WHERE cliente_id IS NULL OR cliente_id = 0;

SELECT 'Productos de deudas sin deuda:', COUNT(*)
FROM deuda_productos
WHERE deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL);

SELECT 'Productos de deudas sin producto:', COUNT(*)
FROM deuda_productos
WHERE producto_id NOT IN (SELECT id FROM productos WHERE id IS NOT NULL);

SELECT 'Pagos de deudas sin deuda:', COUNT(*)
FROM pagos_deudas
WHERE deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL);

-- ========================================
-- PASO 4: SUGERENCIAS DE CORRECCIÓN
-- ========================================
SELECT '💡 SUGERENCIAS DE CORRECCIÓN:' as sugerencias;
SELECT '1. Eliminar ventas en cuenta corriente sin cliente' as sugerencia1;
SELECT '2. Eliminar deudas sin cliente' as sugerencia2;
SELECT '3. Eliminar productos de deudas huérfanos' as sugerencia3;
SELECT '4. Eliminar pagos de deudas huérfanos' as sugerencia4;