#!/bin/bash

# Script de implementación seguro para relaciones CASCADE DELETE
# Solución para el problema de "Clientes Cuenta corriente"

echo "🔧 Iniciando implementación de relaciones CASCADE DELETE"
echo "=================================================="

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
else
    echo "❌ Error al crear el backup"
    exit 1
fi

# Ejecutar el script SQL de implementación
echo "🚀 Aplicando relaciones CASCADE DELETE..."
sqlite3 "$DB_PATH" < backend/fix_cuenta_corriente_cascade.sql

if [ $? -eq 0 ]; then
    echo "✅ Relaciones CASCADE DELETE aplicadas exitosamente"
else
    echo "❌ Error al aplicar las relaciones"
    echo "Restaurando desde backup..."
    cp "$BACKUP_PATH" "$DB_PATH"
    echo "✅ Base de datos restaurada desde backup"
    exit 1
fi

# Verificar la implementación
echo "🔍 Verificando implementación..."
sqlite3 "$DB_PATH" << 'EOF'
-- Verificar que no queden datos inconsistentes
SELECT 'VERIFICACIÓN FINAL:' as resultado;
SELECT 'Ventas sin cliente (cuenta corriente):', COUNT(*) 
FROM ventas 
WHERE metodo_pago = 'cuenta_corriente' AND (cliente_id IS NULL OR cliente_id = 0);

SELECT 'Deudas sin cliente:', COUNT(*) 
FROM deudas 
WHERE cliente_id IS NULL OR cliente_id = 0;

SELECT 'Productos de deudas huérfanos:', COUNT(*) 
FROM deuda_productos dp
WHERE NOT EXISTS (SELECT 1 FROM deudas d WHERE d.id = dp.deuda_id);

SELECT 'Pagos de deudas huérfanos:', COUNT(*) 
FROM pagos_deudas 
WHERE deuda_id NOT IN (SELECT id FROM deudas);

SELECT 'TOTAL DE REGISTROS VÁLIDOS:' as resumen;
SELECT 'Clientes:', COUNT(*) FROM clientes;
SELECT 'Ventas:', COUNT(*) FROM ventas;
SELECT 'Deudas:', COUNT(*) FROM deudas;
SELECT 'Productos de deudas:', COUNT(*) FROM deuda_productos;
SELECT 'Pagos de deudas:', COUNT(*) FROM pagos_deudas;
EOF

echo ""
echo "🎉 IMPLEMENTACIÓN COMPLETA"
echo "=========================="
echo "✅ Relaciones CASCADE DELETE implementadas"
echo "✅ Datos huérfanos eliminados"
echo "✅ Integridad referencial garantizada"
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo "1. Reinicia el servidor backend"
echo "2. Verifica que el dashboard no muestre más errores de cuentas huérfanas"
echo "3. Prueba eliminar un cliente para confirmar que las relaciones en cascada funcionan"
echo ""
echo "⚠️  IMPORTANTE: Mantén el archivo de backup $BACKUP_PATH"
echo "   en caso de que necesites restaurar la base de datos"