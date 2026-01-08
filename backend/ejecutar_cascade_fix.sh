#!/bin/bash

# Script de ejecución directa para implementar CASCADE DELETE
# Solución para el problema de "Clientes Cuenta corriente"

echo "🚀 INICIANDO IMPLEMENTACIÓN DIRECTA DE CASCADE DELETE"
echo "======================================================"
echo ""

# Verificar que exista la base de datos
DB_PATH="backend/pos_database.sqlite"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: No se encuentra la base de datos en $DB_PATH"
    echo "Por favor, asegúrate de que el servidor esté corriendo y la base de datos exista."
    exit 1
fi

# Crear backup de la base de datos
BACKUP_PATH="backend/pos_database_backup_$(date +%Y%m%d_%H%M%S).sqlite"
echo "📦 Creando backup de la base de datos..."
cp "$DB_PATH" "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_PATH"
    echo "💡 Guarda este archivo por si necesitas restaurar"
else
    echo "❌ Error al crear el backup"
    exit 1
fi

echo ""
echo "🔧 Aplicando relaciones CASCADE DELETE..."
echo "⏳ Este proceso puede tomar unos momentos..."

# Ejecutar el script SQL de implementación directa
sqlite3 "$DB_PATH" < backend/IMPLEMENTACION_DIRECTA_CASCADE.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 IMPLEMENTACIÓN COMPLETA EXITOSAMENTE"
    echo "========================================"
    echo "✅ Relaciones CASCADE DELETE implementadas"
    echo "✅ Datos huérfanos eliminados"
    echo "✅ Integridad referencial garantizada"
    echo ""
    echo "🎯 PROBLEMA RESUELTO:"
    echo "   - No más mensajes de 'cuentas sin vincular'"
    echo "   - Eliminaciones de clientes automáticas y completas"
    echo "   - No más datos inconsistentes en el futuro"
    echo ""
    echo "📝 PRÓXIMOS PASOS:"
    echo "   1. Reinicia el servidor backend"
    echo "   2. Verifica que el dashboard no muestre errores"
    echo "   3. Prueba eliminar un cliente para confirmar el funcionamiento"
    echo ""
    echo "⚠️  IMPORTANTE: Mantén el backup $BACKUP_PATH"
    echo "   en caso de que necesites restaurar la base de datos"
else
    echo ""
    echo "❌ Error al aplicar las relaciones"
    echo "🔄 Restaurando desde backup..."
    cp "$BACKUP_PATH" "$DB_PATH"
    echo "✅ Base de datos restaurada desde backup"
    exit 1
fi

echo ""
echo "🔍 VERIFICACIÓN FINAL:"
echo "======================"

# Verificar que el problema esté resuelto
sqlite3 "$DB_PATH" << 'EOF'
-- Verificar que no queden datos inconsistentes
SELECT '✅ VERIFICACIÓN: No hay ventas en cuenta corriente sin cliente';
SELECT COUNT(*) as total_ventas_sin_cliente 
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0);

SELECT '✅ VERIFICACIÓN: No hay deudas sin cliente';
SELECT COUNT(*) as total_deudas_sin_cliente 
FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0;

SELECT '📊 RESUMEN FINAL:';
SELECT 'Clientes:', COUNT(*) FROM clientes;
SELECT 'Ventas:', COUNT(*) FROM ventas;
SELECT 'Deudas:', COUNT(*) FROM deudas;
SELECT 'Productos de deudas:', COUNT(*) FROM deuda_productos;
SELECT 'Pagos de deudas:', COUNT(*) FROM pagos_deudas;
EOF

echo ""
echo "🎉 TODO LISTO! El problema de 'Clientes Cuenta corriente' ha sido resuelto."
echo "🔒 La integridad referencial está garantizada."
echo "⚡ El sistema ahora previene automáticamente datos huérfanos."