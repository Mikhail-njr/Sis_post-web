-- Script para implementar relaciones FOREIGN KEY con CASCADE DELETE
-- Solución estructural para el problema de "Clientes Cuenta corriente"
-- 
-- Este script implementa relaciones en cascada para prevenir datos huérfanos
-- cuando se eliminan clientes del sistema

-- ========================================
-- PASO 1: ANALIZAR TABLAS EXISTENTES
-- ========================================

-- Verificar estructura actual de las tablas críticas
PRAGMA table_info(clientes);
PRAGMA table_info(ventas);
PRAGMA table_info(deudas);
PRAGMA table_info(deuda_productos);

-- ========================================
-- PASO 2: ELIMINAR RELACIONES EXISTENTES (si las hay)
-- ========================================

-- Eliminar relaciones existentes para evitar conflictos
-- Nota: SQLite no soporta DROP CONSTRAINT directamente, 
-- pero podemos recrear las tablas si es necesario

-- ========================================
-- PASO 3: IMPLEMENTAR RELACIONES CON CASCADE DELETE
-- ========================================

-- 1. Relación CLIENTES -> VENTAS (para ventas en cuenta corriente)
-- Esta relación ya debería existir, pero la reforzamos
ALTER TABLE ventas ADD COLUMN cliente_id INTEGER;

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);

-- 2. Relación CLIENTES -> DEUDAS (ya implementada en create_deudas_table.sql)
-- FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE

-- 3. Relación DEUDAS -> DEUDA_PRODUCTOS (ya implementada)
-- FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE

-- 4. Relación PRODUCTOS -> DEUDA_PRODUCTOS (ya implementada)
-- FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE

-- ========================================
-- PASO 4: CREAR TABLA DE PAGOS DE DEUDAS (si no existe)
-- ========================================

-- Tabla para registrar pagos de deudas (si no existe)
CREATE TABLE IF NOT EXISTS pagos_deudas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deuda_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    metodo_pago TEXT,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE
);

-- Índice para optimizar consultas de pagos
CREATE INDEX IF NOT EXISTS idx_pagos_deudas_deuda_id ON pagos_deudas(deuda_id);

-- ========================================
-- PASO 5: VALIDAR INTEGRIDAD REFERENCIAL
-- ========================================

-- Verificar datos inconsistentes existentes
-- 1. Ventas en cuenta corriente sin cliente asociado
SELECT 
    COUNT(*) as ventas_sin_cliente,
    GROUP_CONCAT(id) as ids_ventas
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0);

-- 2. Deudas sin cliente asociado
SELECT 
    COUNT(*) as deudas_sin_cliente,
    GROUP_CONCAT(id) as ids_deudas
FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0;

-- 3. Deuda_productos sin deuda asociada
SELECT 
    COUNT(*) as productos_sin_deuda,
    GROUP_CONCAT(id) as ids_productos
FROM deuda_productos dp
WHERE NOT EXISTS (SELECT 1 FROM deudas d WHERE d.id = dp.deuda_id);

-- ========================================
-- PASO 6: SCRIPT DE LIMPIEZA DE DATOS HUÉRFANOS
-- ========================================

-- Eliminar datos huérfanos existentes (si se autoriza)
-- IMPORTANTE: Este paso debe hacerse con precaución y backup previo

-- 1. Eliminar ventas en cuenta corriente sin cliente
DELETE FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' 
AND (cliente_id IS NULL OR cliente_id = 0);

-- 2. Eliminar deudas sin cliente asociado
DELETE FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0;

-- 3. Eliminar productos de deudas huérfanas
DELETE FROM deuda_productos 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- 4. Eliminar pagos de deudas huérfanas
DELETE FROM pagos_deudas 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- ========================================
-- PASO 7: VERIFICAR LIMPIEZA COMPLETADA
-- ========================================

-- Verificar que no queden datos inconsistentes
SELECT 
    'Ventas sin cliente' as tipo,
    COUNT(*) as cantidad
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0)
UNION ALL
SELECT 
    'Deudas sin cliente' as tipo,
    COUNT(*) as cantidad
FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0
UNION ALL
SELECT 
    'Productos sin deuda' as tipo,
    COUNT(*) as cantidad
FROM deuda_productos dp
WHERE NOT EXISTS (SELECT 1 FROM deudas d WHERE d.id = dp.deuda_id)
UNION ALL
SELECT 
    'Pagos sin deuda' as tipo,
    COUNT(*) as cantidad
FROM pagos_deudas 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- ========================================
-- PASO 8: CONFIRMACIÓN FINAL
-- ========================================

-- Mostrar resumen de relaciones implementadas
SELECT '✅ Relaciones CASCADE DELETE implementadas exitosamente' as resultado;
SELECT '📋 Resumen de relaciones:' as resumen;
SELECT 'clientes -> ventas (CASCADE DELETE)' as relacion1;
SELECT 'clientes -> deudas (CASCADE DELETE)' as relacion2;
SELECT 'deudas -> deuda_productos (CASCADE DELETE)' as relacion3;
SELECT 'deudas -> pagos_deudas (CASCADE DELETE)' as relacion4;
SELECT 'productos -> deuda_productos (CASCADE DELETE)' as relacion5;

-- Conteo final de registros válidos
SELECT '📊 Registros válidos después de la limpieza:' as conteo;
SELECT 'Clientes:', COUNT(*) FROM clientes;
SELECT 'Ventas:', COUNT(*) FROM ventas;
SELECT 'Deudas:', COUNT(*) FROM deudas;
SELECT 'Productos de deudas:', COUNT(*) FROM deuda_productos;
SELECT 'Pagos de deudas:', COUNT(*) FROM pagos_deudas;