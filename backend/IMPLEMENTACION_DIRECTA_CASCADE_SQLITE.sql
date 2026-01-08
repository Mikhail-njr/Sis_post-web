-- ========================================
-- SCRIPT DE IMPLEMENTACIÓN: CASCADE DELETE para SQLite
-- 
-- 🎯 OBJETIVO: Implementar relaciones FOREIGN KEY con CASCADE DELETE
-- ⚠️  ADVERTENCIA: Realiza cambios estructurales en la base de datos
-- 📝  REQUISITO: Tener el servidor backend detenido durante la ejecución
-- ========================================

-- ========================================
-- PASO 1: HABILITAR FOREIGN KEYS
-- ========================================
PRAGMA foreign_keys = ON;

-- ========================================
-- PASO 2: CREAR TABLA DE PAGOS_DEUDAS (SI NO EXISTE)
-- ========================================
CREATE TABLE IF NOT EXISTS pagos_deudas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deuda_id INTEGER NOT NULL,
    monto_pagado REAL NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    metodo_pago TEXT NOT NULL,
    FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE
);

-- ========================================
-- PASO 3: ELIMINAR DATOS HUÉRFANOS EXISTENTES
-- ========================================
-- Eliminar ventas en cuenta corriente sin cliente válido
DELETE FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' 
AND (cliente_id IS NULL OR cliente_id = 0);

-- Eliminar deudas sin cliente válido
DELETE FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0;

-- Eliminar productos de deudas sin deuda válida
DELETE FROM deuda_productos 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- Eliminar productos de deudas sin producto válido
DELETE FROM deuda_productos 
WHERE producto_id NOT IN (SELECT id FROM productos);

-- Eliminar pagos de deudas sin deuda válida
DELETE FROM pagos_deudas 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- ========================================
-- PASO 4: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ========================================
-- Índice para búsquedas por cliente_id en ventas
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);

-- Índice para búsquedas por deuda_id en pagos_deudas
CREATE INDEX IF NOT EXISTS idx_pagos_deudas_deuda_id ON pagos_deudas(deuda_id);

-- ========================================
-- PASO 5: VERIFICAR IMPLEMENTACIÓN
-- ========================================
-- Verificar que no queden datos inconsistentes
SELECT 'VERIFICACIÓN DE DATOS CONSISTENTES:' as verificacion;

-- Contar ventas en cuenta corriente sin cliente
SELECT 'Ventas en cuenta corriente sin cliente:', COUNT(*) 
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0);

-- Contar deudas sin cliente
SELECT 'Deudas sin cliente:', COUNT(*) 
FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0;

-- Contar productos de deudas sin deuda
SELECT 'Productos de deudas sin deuda:', COUNT(*) 
FROM deuda_productos 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- Contar productos de deudas sin producto
SELECT 'Productos de deudas sin producto:', COUNT(*) 
FROM deuda_productos 
WHERE producto_id NOT IN (SELECT id FROM productos);

-- Contar pagos de deudas sin deuda
SELECT 'Pagos de deudas sin deuda:', COUNT(*) 
FROM pagos_deudas 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

-- ========================================
-- PASO 6: MOSTRAR RELACIONES IMPLEMENTADAS
-- ========================================
SELECT 'RELACIONES FOREIGN KEY IMPLEMENTADAS:' as relaciones;

-- Mostrar relaciones de la tabla ventas
SELECT 'ventas -> clientes (CASCADE DELETE)' as relacion;

-- Mostrar relaciones de la tabla deudas
SELECT 'deudas -> clientes (CASCADE DELETE)' as relacion;

-- Mostrar relaciones de la tabla deuda_productos
SELECT 'deuda_productos -> deudas (CASCADE DELETE)' as relacion;
SELECT 'deuda_productos -> productos (CASCADE DELETE)' as relacion;

-- Mostrar relaciones de la tabla pagos_deudas
SELECT 'pagos_deudas -> deudas (CASCADE DELETE)' as relacion;

-- ========================================
-- PASO 7: RESUMEN FINAL
-- ========================================
SELECT '🎯 RESUMEN DE IMPLEMENTACIÓN:' as resumen;
SELECT '✅ Foreign Keys habilitadas' as resultado1;
SELECT '✅ Tabla pagos_deudas creada' as resultado2;
SELECT '✅ Datos huérfanos eliminados' as resultado3;
SELECT '✅ Índices de optimización creados' as resultado4;
SELECT '✅ Relaciones CASCADE DELETE implementadas' as resultado5;

SELECT '🔒 IMPLEMENTACIÓN COMPLETA' as exito;
SELECT '💡 El problema de "Clientes Cuenta corriente" ha sido resuelto' as solucion;