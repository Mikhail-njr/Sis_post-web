-- ========================================
-- Migración: Agregar columna cliente_id a la tabla ventas
-- ========================================
-- Este script agrega la columna cliente_id a la tabla ventas existente
-- para permitir el seguimiento de qué cliente realizó cada venta

-- Agregar columna cliente_id si no existe
ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);

-- Verificar que la columna se agregó correctamente
PRAGMA table_info(ventas);

-- Mostrar las ventas en cuenta corriente que actualmente no tienen cliente
SELECT 
    'Ventas en cuenta corriente sin cliente (antes de la migración):' as info,
    COUNT(*) as cantidad,
    SUM(total) as total
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' AND cliente_id IS NULL;

-- NOTA: Las 32 ventas existentes sin cliente no se pueden asignar automáticamente
-- ya que no tenemos información sobre qué cliente las realizó
-- Opciones disponibles:
-- 1. Dejarlas con cliente_id NULL (recomendado si no se puede identificar al cliente)
-- 2. Eliminar las ventas si son inválidas
-- 3. Asignarlas a un cliente específico manualmente si se conoce
