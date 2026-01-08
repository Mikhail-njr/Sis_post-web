-- Script de validación antes de implementar CASCADE DELETE
-- Este script analiza el estado actual de las relaciones y datos huérfanos

-- ========================================
-- PASO 1: ANALIZAR ESTADO ACTUAL
-- ========================================

-- Contar registros en cada tabla
SELECT '📊 ESTADO ACTUAL DE LAS TABLAS' as seccion;
SELECT 'Clientes:', COUNT(*) FROM clientes;
SELECT 'Ventas:', COUNT(*) FROM ventas;
SELECT 'Deudas:', COUNT(*) FROM deudas;
SELECT 'Productos de deudas:', COUNT(*) FROM deuda_productos;

-- ========================================
-- PASO 2: DETECTAR DATOS HUÉRFANOS ACTUALES
-- ========================================

SELECT '🔍 DETECCIÓN DE DATOS HUÉRFANOS ACTUALES' as seccion;

-- 1. Ventas en cuenta corriente sin cliente asociado (PROBLEMA PRINCIPAL)
SELECT 
    'VENTAS EN CUENTA CORRIENTE SIN CLIENTE' as tipo_error,
    COUNT(*) as cantidad,
    GROUP_CONCAT(id || ':' || numero_factura) as detalles
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' 
AND (cliente_id IS NULL OR cliente_id = 0 OR cliente_id NOT IN (SELECT id FROM clientes));

-- 2. Deudas sin cliente asociado
SELECT 
    'DEUDAS SIN CLIENTE ASOCIADO' as tipo_error,
    COUNT(*) as cantidad,
    GROUP_CONCAT(id || ':' || monto_total) as detalles
FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0 OR cliente_id NOT IN (SELECT id FROM clientes);

-- 3. Deuda_productos sin deuda asociada
SELECT 
    'PRODUCTOS DE DEUDA SIN DEUDA ASOCIADA' as tipo_error,
    COUNT(*) as cantidad,
    GROUP_CONCAT(id || ':' || deuda_id) as detalles
FROM deuda_productos dp
WHERE deuda_id NOT IN (SELECT id FROM deudas WHERE id IS NOT NULL);

-- 4. Deuda_productos sin producto asociado
SELECT 
    'PRODUCTOS DE DEUDA SIN PRODUCTO ASOCIADO' as tipo_error,
    COUNT(*) as cantidad,
    GROUP_CONCAT(id || ':' || producto_id) as detalles
FROM deuda_productos dp
WHERE producto_id NOT IN (SELECT id FROM productos WHERE id IS NOT NULL);

-- ========================================
-- PASO 3: ANALIZAR RELACIONES EXISTENTES
-- ========================================

SELECT '🔗 ESTADO DE RELACIONES EXISTENTES' as seccion;

-- Verificar si existen claves foráneas
PRAGMA foreign_key_list(ventas);
PRAGMA foreign_key_list(deudas);
PRAGMA foreign_key_list(deuda_productos);

-- ========================================
-- PASO 4: SIMULAR EL IMPACTO DE LA ELIMINACIÓN EN CASCADA
-- ========================================

SELECT '⚡ SIMULACIÓN DE IMPACTO DE CASCADE DELETE' as seccion;

-- Si se eliminara un cliente, ¿qué se eliminaría?
-- (Esto es solo para análisis, no elimina datos)

-- Contar potenciales eliminaciones en cascada
SELECT 
    'CLIENTES QUE TIENEN RELACIONES' as metrica,
    COUNT(DISTINCT c.id) as cantidad
FROM clientes c
WHERE EXISTS (SELECT 1 FROM ventas v WHERE v.cliente_id = c.id)
   OR EXISTS (SELECT 1 FROM deudas d WHERE d.cliente_id = c.id);

SELECT 
    'VENTAS QUE SERÍAN AFECTADAS POR CASCADE DELETE' as metrica,
    COUNT(*) as cantidad
FROM ventas 
WHERE cliente_id IS NOT NULL AND cliente_id IN (SELECT id FROM clientes);

SELECT 
    'DEUDAS QUE SERÍAN AFECTADAS POR CASCADE DELETE' as metrica,
    COUNT(*) as cantidad
FROM deudas 
WHERE cliente_id IS NOT NULL AND cliente_id IN (SELECT id FROM clientes);

-- ========================================
-- PASO 5: RECOMENDACIONES
-- ========================================

SELECT '💡 RECOMENDACIONES' as seccion;

-- 1. Clientes problemáticos (con datos huérfanos)
SELECT 
    'CLIENTES CON PROBLEMAS POTENCIALES' as tipo,
    c.id,
    c.nombre,
    (SELECT COUNT(*) FROM ventas v WHERE v.cliente_id = c.id AND (v.cliente_id IS NULL OR v.cliente_id = 0)) as ventas_sin_cliente,
    (SELECT COUNT(*) FROM deudas d WHERE d.cliente_id = c.id AND (d.cliente_id IS NULL OR d.cliente_id = 0)) as deudas_sin_cliente
FROM clientes c
WHERE EXISTS (SELECT 1 FROM ventas v WHERE v.cliente_id = c.id AND (v.cliente_id IS NULL OR v.cliente_id = 0))
   OR EXISTS (SELECT 1 FROM deudas d WHERE d.cliente_id = c.id AND (d.cliente_id IS NULL OR d.cliente_id = 0));

-- ========================================
-- PASO 6: RESUMEN FINAL
-- ========================================

SELECT '📋 RESUMEN DE VALIDACIÓN' as seccion;

-- Total de datos inconsistentes detectados
SELECT 
    'DATOS INCONSISTENTES DETECTADOS' as tipo,
    (
        (SELECT COUNT(*) FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0))
        + (SELECT COUNT(*) FROM deudas WHERE cliente_id IS NULL OR cliente_id = 0)
        + (SELECT COUNT(*) FROM deuda_productos dp WHERE deuda_id NOT IN (SELECT id FROM deudas))
        + (SELECT COUNT(*) FROM deuda_productos dp WHERE producto_id NOT IN (SELECT id FROM productos))
    ) as total_inconsistencias;

SELECT 
    'TABLAS LISTAS PARA CASCADE DELETE' as tipo,
    CASE 
        WHEN (SELECT COUNT(*) FROM ventas WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0)) = 0 
        AND (SELECT COUNT(*) FROM deudas WHERE cliente_id IS NULL OR cliente_id = 0) = 0 
        AND (SELECT COUNT(*) FROM deuda_productos dp WHERE deuda_id NOT IN (SELECT id FROM deudas)) = 0 
        THEN '✅ LISTO PARA IMPLEMENTAR'
        ELSE '⚠️  NECESITA LIMPIEZA PREVIA'
    END as estado;